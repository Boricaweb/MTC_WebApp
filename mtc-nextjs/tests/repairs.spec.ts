import { test, expect } from '@playwright/test';

test.describe('Repairs Flows (Mocked)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock the summary endpoint
    await page.route('**/api/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 15,
          completed: 10,
          pending: 3,
          inProgress: 1,
          transferred: 1,
          statusCounts: { 'เรียบร้อย': 10, 'รอดำเนินการ': 3, 'กำลังดำเนินการ': 1, 'โอนย้าย': 1 },
          typeCounts: { 'ไฟฟ้า': 5, 'ประปา': 5, 'ระบบแอร์': 5 }
        })
      });
    });

    // Mock the weekly endpoint
    await page.route('**/api/weekly', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock the recent repairs and full repairs endpoints
    await page.route(/\/api\/repairs.*/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              order: 'MTC-2023-001',
              reporter: 'สมชาย',
              department: 'ไอทีซัพพอร์ต',
              channel: 'Line',
              subject: 'แอร์ไม่เย็น',
              floor: '3',
              type: 'ระบบแอร์',
              dateReported: '2566-10-01',
              location: 'ห้อง Server',
              status: 'รอดำเนินการ',
              dateFixed: '',
              photos: []
            }
          ])
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else if (route.request().method() === 'PUT' || route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
  });

  test('Dashboard displays correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check Topbar
    await expect(page.locator('h1.page-title')).toHaveText('แดชบอร์ด');
    
    // Check Stat Cards based on our mocked /api/summary data
    await expect(page.locator('text=งานซ่อมทั้งหมด')).toBeVisible();
    // The total from our mock is 15
    await expect(page.locator('.stat-card:has-text("งานซ่อมทั้งหมด") .stat-value')).toHaveText('15');
    await expect(page.locator('.stat-card:has-text("ดำเนินการเสร็จสิ้น") .stat-value')).toHaveText('10');
  });

  test('Repairs Page - View and Filter', async ({ page }) => {
    await page.goto('/repairs');
    
    await expect(page.locator('h1.page-title')).toHaveText('รายการงานซ่อมทั้งหมด');
    
    // Check if the mocked repair appears in the table
    await expect(page.locator('td.td-subject')).toHaveText('แอร์ไม่เย็น');
    
    // Test filtering
    const searchInput = page.locator('input[placeholder*="ค้นหางานซ่อม"]');
    await searchInput.fill('ไม่เจอแน่ๆ');
    // Table should be empty
    await expect(page.locator('text=ไม่มีข้อมูลงานซ่อม')).toBeVisible();

    await searchInput.fill('สมชาย');
    // Row should reappear
    await expect(page.locator('td.td-reporter')).toHaveText('สมชาย');
  });

  test('Repairs Page - Add Repair Modal', async ({ page }) => {
    await page.goto('/repairs');
    
    // Click Add Button
    await page.click('button:has-text("เพิ่มงานซ่อม")');
    
    // Check if modal is visible
    const modal = page.locator('.modal-content');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('เพิ่มงานซ่อมใหม่');
    
    // Fill out the form
    await page.fill('input[name="reporter"]', 'Jane Doe');
    await page.fill('input[name="subject"]', 'หลอดไฟขาด');
    
    // Submit
    await page.click('button:has-text("บันทึกข้อมูล")');
    
    // Should show success toast
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('Repairs Page - Edit Repair Modal', async ({ page }) => {
    await page.goto('/repairs');
    
    // Click Edit on the first row
    await page.click('button[title="แก้ไข"]');
    
    const modal = page.locator('.modal-content');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('แก้ไขงานซ่อม');
    
    // Subject should be pre-filled with our mocked data
    await expect(page.locator('input[name="subject"]')).toHaveValue('แอร์ไม่เย็น');
    
    // Change value
    await page.fill('input[name="subject"]', 'แอร์เย็นแล้ว');
    
    // Submit
    await page.click('button:has-text("บันทึกข้อมูล")');
    
    // Should show success toast
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
