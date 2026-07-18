const { test, expect } = require('@playwright/test');

test.describe('MTC Web App v3.0 E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Go to local server
        await page.goto('http://localhost:8080/');
        // Wait for loading screen to disappear
        await page.waitForSelector('#loading-screen.hidden', { timeout: 5000 });
        // The app should show login screen, but in our flow it might skip offline
        // Let's ensure we are in the app
        const appVisible = await page.isVisible('#app');
        if (!appVisible) {
            // Click offline mode if login is visible
            const offlineBtn = await page.$('#login-offline-btn');
            if (offlineBtn) {
                await offlineBtn.click();
            }
        }
        await expect(page.locator('#app')).toBeVisible();
    });

    test('1. Dashboard renders stat cards and charts', async ({ page }) => {
        await expect(page.locator('#page-title')).toHaveText('แดชบอร์ด');
        
        // Check stat cards
        await expect(page.locator('.stat-card.total')).toBeVisible();
        await expect(page.locator('.stat-card.completed')).toBeVisible();
        await expect(page.locator('.stat-card.pending')).toBeVisible();
        await expect(page.locator('.stat-card.in-progress')).toBeVisible();

        // Check charts
        await expect(page.locator('#monthly-trend-chart')).toBeVisible();
        await expect(page.locator('#status-donut-chart')).toBeVisible();
        await expect(page.locator('#type-bar-chart')).toBeVisible();

        // Check recent list
        await expect(page.locator('#recent-list .recent-item').first()).toBeVisible();
    });

    test('2. Sidebar navigation works', async ({ page }) => {
        // Navigate to Repairs
        await page.click('#nav-repairs');
        await expect(page.locator('#page-title')).toHaveText('รายการงานซ่อมทั้งหมด');
        await expect(page.locator('#page-repairs')).toHaveClass(/active/);

        // Navigate to Weekly
        await page.click('#nav-weekly');
        await expect(page.locator('#page-title')).toHaveText('สรุปรายสัปดาห์');
        await expect(page.locator('#page-weekly')).toHaveClass(/active/);

        // Navigate to Analysis
        await page.click('#nav-analysis');
        await expect(page.locator('#page-title')).toHaveText('วิเคราะห์รายเดือน');
        await expect(page.locator('#page-analysis')).toHaveClass(/active/);
    });

    test('3. External link for spare parts is correct', async ({ page }) => {
        const link = page.locator('#nav-parts');
        await expect(link).toHaveAttribute('href', 'https://script.google.com/macros/s/AKfycby2dTKsM-pbyvQqqd3w0fU4hcSqPtoWrEK-WikE3fhYZ7Og9Jq5rxnqAntlCIUYw-ce/exec');
        await expect(link).toHaveAttribute('target', '_blank');
    });

    test('4. Repairs table shows data', async ({ page }) => {
        await page.click('#nav-repairs');
        
        await page.waitForSelector('#repairs-tbody .td-subject', { timeout: 15000 });
        
        const rows = page.locator('#repairs-tbody tr');
        const initialCount = await rows.count();
        expect(initialCount).toBeGreaterThan(0);
        
        const subjectText = await rows.first().locator('.td-subject').textContent();
        expect(subjectText.length).toBeGreaterThan(0);
    });

    test('5. CRUD operations - Add, Edit, Delete repair', async ({ page }) => {
        await page.click('#nav-repairs');
        await page.waitForSelector('#repairs-tbody .td-subject', { timeout: 15000 });
        
        // Add
        await page.click('button:has-text("เพิ่มงานซ่อม")');
        await expect(page.locator('#repair-modal')).toHaveClass(/active/);
        
        await page.fill('#field-subject', 'ทดสอบงานซ่อม E2E');
        await page.fill('#field-reporter', 'Playwright');
        await page.selectOption('#field-department', 'ไอทีซัพพอร์ต');
        await page.selectOption('#field-type', 'อุปกรณ์');
        
        await page.click('#modal-save-btn');
        await expect(page.locator('#toast-container')).toContainText('เพิ่มงานซ่อมเรียบร้อย');
        
        // Wait for the modal to close and table to re-render
        await page.waitForSelector('#repair-modal', { state: 'hidden' });
        
        // Search for the newly added item
        await page.fill('#global-search', 'ทดสอบงานซ่อม E2E');
        await page.locator('#global-search').dispatchEvent('keyup');
        await page.waitForTimeout(500); // wait for debounce
        
        // Find the newly added row
        const newRow = page.locator('#repairs-tbody tr:has-text("ทดสอบงานซ่อม E2E")').first();
        await expect(newRow).toBeVisible();
        
        // Edit
        await newRow.locator('.action-btn[title="แก้ไข"]').click();
        await expect(page.locator('#repair-modal')).toHaveClass(/active/);
        await page.fill('#field-subject', 'ทดสอบงานซ่อม E2E (แก้ไขแล้ว)');
        await page.click('#modal-save-btn');
        
        await page.waitForSelector('#repair-modal', { state: 'hidden' });
        
        // Search for the edited item
        await page.fill('#global-search', '');
        await page.locator('#global-search').dispatchEvent('keyup');
        await page.waitForTimeout(100);
        await page.fill('#global-search', 'ทดสอบงานซ่อม E2E (แก้ไขแล้ว)');
        await page.locator('#global-search').dispatchEvent('keyup');
        await page.waitForTimeout(500); // wait for debounce
        
        // Find the edited row
        const editedRow = page.locator('#repairs-tbody tr:has-text("ทดสอบงานซ่อม E2E (แก้ไขแล้ว)")').first();
        await expect(editedRow).toBeVisible();
        
        // Delete
        await editedRow.locator('.action-btn[title="ลบ"]').click();
        
        // Wait for custom confirm dialog
        await page.waitForSelector('#confirm-dialog.active');
        
        // Click delete confirm button
        await page.click('#confirm-ok-btn');
        
        // Wait for it to disappear
        await page.waitForSelector('#confirm-dialog', { state: 'hidden' });
        
        // Verify it was deleted
        await expect(page.locator('#repairs-tbody tr:has-text("ทดสอบงานซ่อม E2E (แก้ไขแล้ว)")')).toHaveCount(0);
    });
});
