/**
 * MTC Maintenance Management System
 * ระบบจัดการงานซ่อมบำรุง MTC
 * 
 * Main Application JavaScript
 * v2.0 — Google Sheets Integration
 */

// ========================================
// Global State
// ========================================
const AppState = {
    data: {
        planned: [],
        requests: [],
        warehouse: [],
        monthly: [],
        leaks: [],
        curtains: [],
        summary: {}
    },
    currentPage: 'dashboard',
    sidebarCollapsed: false,
    pagination: {
        planned: { page: 1, perPage: 15 },
        requests: { page: 1, perPage: 15 },
        warehouse: { page: 1, perPage: 15 }
    },
    charts: {},
    searchQuery: '',
    editingItem: null,
    editingSource: null,
    isOnline: false,
    useGoogleSheets: false
};

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initLoginScreen();
});

function initLoginScreen() {
    const savedConfig = JSON.parse(localStorage.getItem('mtc_gsheet_config') || '{}');

    // Pre-fill saved config
    const clientIdInput = document.getElementById('login-client-id');
    const sheetIdInput = document.getElementById('login-sheet-id');
    if (savedConfig.clientId) clientIdInput.value = savedConfig.clientId;
    if (savedConfig.spreadsheetId) sheetIdInput.value = savedConfig.spreadsheetId;

    // Google Sign-In button
    document.getElementById('login-google-btn').addEventListener('click', async () => {
        const clientId = clientIdInput.value.trim();
        const sheetId = sheetIdInput.value.trim();

        if (!clientId) {
            showToast('กรุณากรอก Google Client ID', 'warning');
            clientIdInput.focus();
            return;
        }
        if (!sheetId) {
            showToast('กรุณากรอก Spreadsheet ID', 'warning');
            sheetIdInput.focus();
            return;
        }

        // Check if Google API scripts are available
        if (typeof gapi === 'undefined' || typeof google === 'undefined' || !google.accounts) {
            showToast('กำลังโหลด Google API... กรุณาลองอีกครั้ง', 'warning');
            // Wait a bit and retry
            await new Promise(r => setTimeout(r, 2000));
            if (typeof gapi === 'undefined' || typeof google === 'undefined' || !google.accounts) {
                showToast('ไม่สามารถโหลด Google API ได้ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', 'error');
                return;
            }
        }

        // Save config
        if (document.getElementById('login-remember').checked) {
            localStorage.setItem('mtc_gsheet_config', JSON.stringify({
                clientId: clientId,
                spreadsheetId: sheetId
            }));
        }

        AppState.useGoogleSheets = true;
        showLoadingScreen('กำลังเชื่อมต่อ Google...');

        try {
            const success = await GoogleSheetsDB.init({
                clientId: clientId,
                spreadsheetId: sheetId,
                onAuthChange: handleAuthChange,
                onDataRefresh: handleDataRefresh,
                onConnectionChange: handleConnectionChange,
                onError: (msg) => showToast(msg, 'error')
            });

            if (success) {
                GoogleSheetsDB.signIn();
            } else {
                showToast('ไม่สามารถเริ่มต้น Google API ได้', 'error');
                showLoginScreen();
            }
        } catch (err) {
            console.error('Login error:', err);
            showToast('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'error');
            showLoginScreen();
        }
    });

    // Offline mode button
    document.getElementById('login-offline-btn').addEventListener('click', async () => {
        AppState.useGoogleSheets = false;
        showLoadingScreen('กำลังโหลดข้อมูลออฟไลน์...');
        await loadDataOffline();
        initApp();
    });
}

async function handleAuthChange(isSignedIn, user) {
    if (isSignedIn) {
        updateUserDisplay(user);
        updateLoadingStatus('กำลังโหลดข้อมูลจาก Google Sheets...');

        try {
            const result = await GoogleSheetsDB.loadAllData();
            AppState.data = result.data;
            recalculateSummary();
            initApp();
            GoogleSheetsDB.startAutoRefresh(30000);
            showToast('เชื่อมต่อ Google Sheets สำเร็จ', 'success');
        } catch (err) {
            console.error('Failed to load from Google Sheets:', err);
            showToast('ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้ ใช้ข้อมูลออฟไลน์แทน', 'warning');
            await loadDataOffline();
            initApp();
        }
    } else {
        showLoginScreen();
    }
}

function handleDataRefresh(data) {
    AppState.data = data;
    recalculateSummary();
    renderPage(AppState.currentPage);
    updateSyncStatus('synced');
}

function handleConnectionChange(isConnected) {
    AppState.isOnline = isConnected;
    updateConnectionUI(isConnected);
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
}

function showLoadingScreen(status) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('loading-screen').classList.remove('hidden');
    document.getElementById('loading-screen').classList.remove('fade-out');
    document.getElementById('app').classList.add('hidden');
    updateLoadingStatus(status || 'กำลังโหลดข้อมูล...');
    // Restart loading bar animation
    const bar = document.querySelector('.loading-bar');
    if (bar) {
        bar.style.animation = 'none';
        bar.offsetHeight; // trigger reflow
        bar.style.animation = '';
    }
}

function updateLoadingStatus(text) {
    const el = document.getElementById('loading-status');
    if (el) el.textContent = text;
}

function initApp() {
    initNavigation();
    initSidebar();
    initSearch();
    initModals();
    initSettingsPanel();
    initDate();
    renderDashboard();

    // Transition from loading to app
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');
        document.getElementById('app').classList.remove('hidden');
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 500);
    }, 800);
}

// ========================================
// Data Loading
// ========================================
async function loadDataOffline() {
    // Try localStorage first
    const saved = localStorage.getItem('mtc_data');
    if (saved) {
        try {
            AppState.data = JSON.parse(saved);
            return;
        } catch (e) {
            console.warn('Failed to parse saved data');
        }
    }

    // Fallback to data.json
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        AppState.data = { ...AppState.data, ...data };
    } catch (error) {
        console.error('Failed to load data:', error);
        showToast('ไม่สามารถโหลดข้อมูลได้', 'error');
    }
}

async function saveData() {
    // Always save to localStorage as cache
    localStorage.setItem('mtc_data', JSON.stringify(AppState.data));

    // If online, sync summary to Google Sheets
    if (AppState.useGoogleSheets && AppState.isOnline) {
        try {
            await GoogleSheetsDB.updateSummary(AppState.data.summary);
        } catch (err) {
            console.warn('Failed to sync summary:', err);
        }
        updateSyncStatus('synced');
    }

    showToast('บันทึกข้อมูลสำเร็จ', 'success');
}

function recalculateSummary() {
    const planned = AppState.data.planned || [];
    let total = planned.length;
    let done = 0;
    let pending = 0;
    let inProgress = 0;

    planned.forEach(p => {
        const s = p['สำเร็จ'] || '';
        if (s.includes('เสร็จ')) done++;
        else if (s.includes('กำลัง')) inProgress++;
        else if (s.includes('รอ')) pending++;
    });

    AppState.data.summary = {
        'งานทั้งหมด': String(total),
        'สำเร็จ': String(done),
        'รอดำเนินการ': String(pending),
        'กำลังดำเนินการ': String(inProgress)
    };
}

// ========================================
// Settings Panel
// ========================================
function initSettingsPanel() {
    // Change database button
    document.getElementById('btn-change-db')?.addEventListener('click', () => {
        const overlay = document.getElementById('changedb-overlay');
        const input = document.getElementById('changedb-sheet-id');
        input.value = GoogleSheetsDB.getSpreadsheetId() || '';
        overlay.classList.remove('hidden');
    });

    // Change DB modal close/cancel
    document.getElementById('changedb-close')?.addEventListener('click', () => {
        document.getElementById('changedb-overlay').classList.add('hidden');
    });
    document.getElementById('changedb-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('changedb-overlay').classList.add('hidden');
    });
    document.getElementById('changedb-overlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            document.getElementById('changedb-overlay').classList.add('hidden');
        }
    });

    // Change DB confirm
    document.getElementById('changedb-ok-btn')?.addEventListener('click', async () => {
        const newId = document.getElementById('changedb-sheet-id').value.trim();
        if (!newId) {
            showToast('กรุณากรอก Spreadsheet ID', 'warning');
            return;
        }
        GoogleSheetsDB.setSpreadsheetId(newId);
        document.getElementById('changedb-overlay').classList.add('hidden');
        showToast('กำลังโหลดข้อมูลจากฐานข้อมูลใหม่...', 'info');

        try {
            const result = await GoogleSheetsDB.loadAllData();
            AppState.data = result.data;
            recalculateSummary();
            renderPage(AppState.currentPage);
            showToast('เปลี่ยนฐานข้อมูลสำเร็จ', 'success');
        } catch (err) {
            showToast('ไม่สามารถโหลดข้อมูลจากฐานข้อมูลใหม่ได้', 'error');
        }
    });

    // Switch account
    document.getElementById('btn-switch-account')?.addEventListener('click', () => {
        if (AppState.useGoogleSheets) {
            GoogleSheetsDB.signOut();
            GoogleSheetsDB.signIn();
        }
    });

    // Sign out
    document.getElementById('btn-sign-out')?.addEventListener('click', () => {
        if (AppState.useGoogleSheets) {
            GoogleSheetsDB.signOut();
            GoogleSheetsDB.stopAutoRefresh();
        }
        AppState.useGoogleSheets = false;
        AppState.isOnline = false;
        showLoginScreen();
    });
}

function updateUserDisplay(user) {
    if (!user) return;
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl && user.picture) {
        avatarEl.src = user.picture;
        avatarEl.style.display = 'block';
    }
}

function updateConnectionUI(isConnected) {
    // Sidebar connection
    const dot = document.getElementById('connection-dot');
    const text = document.getElementById('connection-text');
    if (dot) {
        dot.className = `connection-dot ${isConnected ? 'online' : 'offline'}`;
    }
    if (text) {
        text.textContent = isConnected ? 'เชื่อมต่อแล้ว' : 'ออฟไลน์';
    }

    // Topbar sync
    updateSyncStatus(isConnected ? 'synced' : 'offline');
}

function updateSyncStatus(status) {
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-text');

    if (!dot || !text) return;

    switch (status) {
        case 'synced':
            dot.className = 'sync-dot online';
            text.textContent = 'ซิงค์แล้ว';
            break;
        case 'syncing':
            dot.className = 'sync-dot syncing';
            text.textContent = 'กำลังซิงค์...';
            break;
        case 'offline':
        default:
            dot.className = 'sync-dot';
            text.textContent = 'ออฟไลน์';
            break;
    }
}

// ========================================
// Date Display
// ========================================
function initDate() {
    const dateEl = document.getElementById('current-date');
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    dateEl.textContent = `วัน${thaiDays[now.getDay()]}ที่ ${now.getDate()} ${thaiMonths[now.getMonth()]} ${thaiYear}`;
}

// ========================================
// Navigation
// ========================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const activePage = document.getElementById(`page-${page}`);
    if (activePage) activePage.classList.add('active');

    // Update title
    const titles = {
        dashboard: 'แดชบอร์ด',
        planned: 'งานซ่อมตามแผน',
        requests: 'แจ้งซ่อมเพิ่มเติม',
        warehouse: 'คลังงานซ่อม',
        leaks: 'ตำแหน่งน้ำรั่ว',
        curtains: 'เช็คม่าน',
        monthly: 'สรุปรายเดือน'
    };
    document.getElementById('page-title').textContent = titles[page] || page;

    AppState.currentPage = page;

    // Render page content
    renderPage(page);

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

function renderPage(page) {
    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'planned': renderPlanned(); break;
        case 'requests': renderRequests(); break;
        case 'warehouse': renderWarehouse(); break;
        case 'leaks': renderLeaks(); break;
        case 'curtains': renderCurtains(); break;
        case 'monthly': renderMonthly(); break;
    }
}

// ========================================
// Sidebar
// ========================================
function initSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const mobileBtn = document.getElementById('mobile-menu-btn');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            AppState.sidebarCollapsed = sidebar.classList.contains('collapsed');
        });
    }

    if (mobileBtn) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            sidebar && sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            (!mobileBtn || !mobileBtn.contains(e.target))) {
            sidebar.classList.remove('open');
        }
    });
}

// ========================================
// Search
// ========================================
function initSearch() {
    const searchInput = document.getElementById('global-search');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            AppState.searchQuery = e.target.value.trim().toLowerCase();
            renderPage(AppState.currentPage);
        }, 300);
    });

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        if (e.key === 'Escape') {
            searchInput.blur();
            searchInput.value = '';
            AppState.searchQuery = '';
            renderPage(AppState.currentPage);
        }
    });
}

// ========================================
// Dashboard Rendering
// ========================================
function renderDashboard() {
    renderStats();
    renderRecentActivity();
    renderMonthlyChart();
    renderStatusChart();
    renderTypeChart();
}

function renderStats() {
    const s = AppState.data.summary;
    const grid = document.getElementById('stats-grid');
    grid.innerHTML = `
        <div class="stat-card red">
            <div class="stat-icon"><span class="material-icons-round">assignment</span></div>
            <div class="stat-info">
                <div class="stat-label">งานทั้งหมด</div>
                <div class="stat-value">${animateCounter(s['งานทั้งหมด'] || '0')}</div>
            </div>
        </div>
        <div class="stat-card green">
            <div class="stat-icon"><span class="material-icons-round">check_circle</span></div>
            <div class="stat-info">
                <div class="stat-label">สำเร็จ</div>
                <div class="stat-value">${animateCounter(s['สำเร็จ'] || '0')}</div>
            </div>
        </div>
        <div class="stat-card yellow">
            <div class="stat-icon"><span class="material-icons-round">pending</span></div>
            <div class="stat-info">
                <div class="stat-label">รอดำเนินการ</div>
                <div class="stat-value">${animateCounter(s['รอดำเนินการ'] || '0')}</div>
            </div>
        </div>
        <div class="stat-card blue">
            <div class="stat-icon"><span class="material-icons-round">engineering</span></div>
            <div class="stat-info">
                <div class="stat-label">กำลังดำเนินการ</div>
                <div class="stat-value">${animateCounter(s['กำลังดำเนินการ'] || '0')}</div>
            </div>
        </div>
    `;

    // Animate counters
    grid.querySelectorAll('.stat-value').forEach(el => {
        const target = parseInt(el.textContent) || 0;
        animateNumber(el, target);
    });
}

function animateCounter(val) {
    return parseInt(val) || 0;
}

function animateNumber(el, target) {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = current;
    }, 30);
}

function renderRecentActivity() {
    const container = document.getElementById('recent-activity');
    const requests = AppState.data.requests.slice(0, 10);

    if (!requests.length) {
        container.innerHTML = '<div class="empty-state"><span class="material-icons-round">inbox</span><p>ไม่มีข้อมูล</p></div>';
        return;
    }

    container.innerHTML = requests.map(r => {
        const status = getStatusClass(r['สถานะ']);
        return `
            <div class="activity-item">
                <span class="activity-dot ${status}"></span>
                <div class="activity-text">
                    <div class="activity-title">${escapeHtml(r['เรื่อง'] || r['หัวข้อ'] || '-')}</div>
                    <div class="activity-meta">${escapeHtml(r['ชื่อผู้แจ้งซ่อม'] || '')} • ชั้น ${escapeHtml(r['ชั้น'] || '-')} • ${formatStatus(r['สถานะ'])}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderMonthlyChart() {
    const ctx = document.getElementById('monthly-chart');
    if (!ctx) return;

    if (AppState.charts.monthly) AppState.charts.monthly.destroy();

    const monthly = AppState.data.monthly.filter(m => m['งานทั้งหมด'] && m['งานทั้งหมด'] !== '');
    const labels = monthly.map(m => m['เดือน']);
    const total = monthly.map(m => parseInt(m['งานทั้งหมด']) || 0);
    const done = monthly.map(m => parseInt(m['เสร็จ']) || 0);

    AppState.charts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'งานทั้งหมด',
                    data: total,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#dc2626',
                    pointBorderColor: '#0a0a0a',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                },
                {
                    label: 'เสร็จสิ้น',
                    data: done,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#22c55e',
                    pointBorderColor: '#0a0a0a',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#a3a3a3',
                        font: { family: "'Noto Sans Thai', sans-serif", size: 12 },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: '#262626',
                    titleColor: '#fafafa',
                    bodyColor: '#a3a3a3',
                    borderColor: '#333',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { family: "'Noto Sans Thai', sans-serif" },
                    bodyFont: { family: "'Noto Sans Thai', sans-serif" },
                    cornerRadius: 8,
                    displayColors: true,
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#737373',
                        font: { family: "'Noto Sans Thai', sans-serif", size: 11 }
                    }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#737373',
                        font: { family: "'Noto Sans Thai', sans-serif", size: 11 }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function renderStatusChart() {
    const ctx = document.getElementById('status-chart');
    if (!ctx) return;

    if (AppState.charts.status) AppState.charts.status.destroy();

    const planned = AppState.data.planned;
    const counts = {
        'เสร็จสิ้น': 0,
        'กำลังดำเนินการ': 0,
        'รอดำเนินการ': 0
    };
    planned.forEach(p => {
        const s = p['สำเร็จ'] || '';
        if (s.includes('เสร็จ')) counts['เสร็จสิ้น']++;
        else if (s.includes('กำลัง')) counts['กำลังดำเนินการ']++;
        else if (s.includes('รอ')) counts['รอดำเนินการ']++;
    });

    AppState.charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b'],
                borderColor: '#1a1a1a',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a3a3a3',
                        font: { family: "'Noto Sans Thai', sans-serif", size: 12 },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: '#262626',
                    titleColor: '#fafafa',
                    bodyColor: '#a3a3a3',
                    borderColor: '#333',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { family: "'Noto Sans Thai', sans-serif" },
                    bodyFont: { family: "'Noto Sans Thai', sans-serif" },
                }
            }
        }
    });
}

function renderTypeChart() {
    const ctx = document.getElementById('type-chart');
    if (!ctx) return;

    if (AppState.charts.type) AppState.charts.type.destroy();

    const typeCounts = {};
    AppState.data.planned.forEach(p => {
        const t = p['ประเภท'] || 'อื่นๆ';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = sorted.map(s => s[0]);
    const values = sorted.map(s => s[1]);

    const colors = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#f59e0b', '#3b82f6', '#22c55e', '#a855f7'];

    AppState.charts.type = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'จำนวนงาน',
                data: values,
                backgroundColor: colors.slice(0, values.length).map(c => c + '80'),
                borderColor: colors.slice(0, values.length),
                borderWidth: 1.5,
                borderRadius: 6,
                barThickness: 28,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#262626',
                    titleColor: '#fafafa',
                    bodyColor: '#a3a3a3',
                    borderColor: '#333',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { family: "'Noto Sans Thai', sans-serif" },
                    bodyFont: { family: "'Noto Sans Thai', sans-serif" },
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#737373',
                        font: { family: "'Noto Sans Thai', sans-serif", size: 11 }
                    },
                    beginAtZero: true
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: '#a3a3a3',
                        font: { family: "'Noto Sans Thai', sans-serif", size: 11 }
                    }
                }
            }
        }
    });
}

// ========================================
// Planned Repairs Page
// ========================================
function renderPlanned() {
    const filterStatus = document.getElementById('planned-filter-status')?.value || '';
    const filterType = document.getElementById('planned-filter-type')?.value || '';
    const filterMonth = document.getElementById('planned-filter-month')?.value || '';

    // Populate dynamic filter options
    populateFilters();

    let data = [...AppState.data.planned];

    // Apply filters
    if (filterStatus) data = data.filter(d => (d['สำเร็จ'] || '').includes(filterStatus));
    if (filterType) data = data.filter(d => d['ประเภท'] === filterType);
    if (filterMonth) data = data.filter(d => d['เดือน'] === filterMonth);
    if (AppState.searchQuery) {
        data = data.filter(d =>
            Object.values(d).some(v => v.toLowerCase().includes(AppState.searchQuery))
        );
    }

    // Pagination
    const pag = AppState.pagination.planned;
    const totalPages = Math.ceil(data.length / pag.perPage);
    const startIdx = (pag.page - 1) * pag.perPage;
    const pageData = data.slice(startIdx, startIdx + pag.perPage);

    const tbody = document.getElementById('planned-tbody');
    if (!pageData.length) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="material-icons-round">search_off</span><p>ไม่พบข้อมูล</p></div></td></tr>`;
    } else {
        tbody.innerHTML = pageData.map((item, idx) => {
            const globalIdx = AppState.data.planned.indexOf(item);
            return `
            <tr draggable="true" data-source="planned" data-index="${globalIdx}">
                <td><strong>${escapeHtml(item['รหัสงานซ่อม'])}</strong></td>
                <td title="${escapeHtml(item['หัวข้อ'])}">${escapeHtml(item['หัวข้อ'])}</td>
                <td>${escapeHtml(item['ชั้น'])}</td>
                <td>${escapeHtml(item['ประเภท'])}</td>
                <td>${escapeHtml(item['ตำแหน่ง'])}</td>
                <td>${renderPriority(item['ความสำคัญ'])}</td>
                <td>${renderStatusBadge(item['สำเร็จ'])}</td>
                <td>${escapeHtml(item['เดือน'])}</td>
                <td class="actions-col">
                    <div class="action-btns">
                        <button class="btn-icon edit" title="แก้ไข" onclick="editItem('planned', ${globalIdx})">
                            <span class="material-icons-round">edit</span>
                        </button>
                        <button class="btn-icon move" title="โอนย้าย" onclick="moveItem('planned', ${globalIdx})">
                            <span class="material-icons-round">drive_file_move</span>
                        </button>
                        <button class="btn-icon delete" title="ลบ" onclick="deleteItem('planned', ${globalIdx})">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    renderPagination('planned', pag.page, totalPages, data.length);
    initDragDrop();

    // Attach filter listeners (once)
    attachFilterListeners('planned');
}

function populateFilters() {
    // Type filter
    const typeFilter = document.getElementById('planned-filter-type');
    if (typeFilter && typeFilter.options.length <= 1) {
        const types = [...new Set(AppState.data.planned.map(p => p['ประเภท']).filter(Boolean))];
        types.sort();
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            typeFilter.appendChild(opt);
        });
    }

    // Month filter
    const monthFilter = document.getElementById('planned-filter-month');
    if (monthFilter && monthFilter.options.length <= 1) {
        const months = [...new Set(AppState.data.planned.map(p => p['เดือน']).filter(Boolean))];
        months.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            monthFilter.appendChild(opt);
        });
    }
}

function attachFilterListeners(source) {
    const container = document.getElementById(`page-${source}`);
    if (!container) return;
    const selects = container.querySelectorAll('.filter-select');
    selects.forEach(sel => {
        if (!sel.dataset.listening) {
            sel.dataset.listening = 'true';
            sel.addEventListener('change', () => {
                AppState.pagination[source] && (AppState.pagination[source].page = 1);
                renderPage(AppState.currentPage);
            });
        }
    });
}

// ========================================
// Requests Page
// ========================================
function renderRequests() {
    const filterStatus = document.getElementById('requests-filter-status')?.value || '';

    let data = [...AppState.data.requests];
    if (filterStatus) data = data.filter(d => (d['สถานะ'] || '').includes(filterStatus));
    if (AppState.searchQuery) {
        data = data.filter(d =>
            Object.values(d).some(v => v.toLowerCase().includes(AppState.searchQuery))
        );
    }

    const pag = AppState.pagination.requests;
    const totalPages = Math.ceil(data.length / pag.perPage);
    const startIdx = (pag.page - 1) * pag.perPage;
    const pageData = data.slice(startIdx, startIdx + pag.perPage);

    const tbody = document.getElementById('requests-tbody');
    if (!pageData.length) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><span class="material-icons-round">search_off</span><p>ไม่พบข้อมูล</p></div></td></tr>`;
    } else {
        tbody.innerHTML = pageData.map((item, idx) => {
            const globalIdx = AppState.data.requests.indexOf(item);
            return `
            <tr draggable="true" data-source="requests" data-index="${globalIdx}">
                <td>${escapeHtml(item['ลำดับ'])}</td>
                <td>${escapeHtml(item['ชื่อผู้แจ้งซ่อม'])}</td>
                <td>${escapeHtml(item['แจ้งผ่าน'])}</td>
                <td title="${escapeHtml(item['เรื่อง'])}">${escapeHtml(item['เรื่อง'])}</td>
                <td>${escapeHtml(item['ชั้น'])}</td>
                <td>${escapeHtml(item['ประเภท'])}</td>
                <td>${escapeHtml(item['ตำแหน่ง'])}</td>
                <td>${renderStatusBadge(item['สถานะ'])}</td>
                <td>${formatDate(item['วันที่แจ้งซ่อม'])}</td>
                <td class="actions-col">
                    <div class="action-btns">
                        <button class="btn-icon edit" title="แก้ไข" onclick="editItem('requests', ${globalIdx})">
                            <span class="material-icons-round">edit</span>
                        </button>
                        <button class="btn-icon move" title="โอนย้าย" onclick="moveItem('requests', ${globalIdx})">
                            <span class="material-icons-round">drive_file_move</span>
                        </button>
                        <button class="btn-icon delete" title="ลบ" onclick="deleteItem('requests', ${globalIdx})">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    renderPagination('requests', pag.page, totalPages, data.length);
    initDragDrop();
    attachFilterListeners('requests');
}

// ========================================
// Warehouse Page
// ========================================
function renderWarehouse() {
    const filterStatus = document.getElementById('warehouse-filter-status')?.value || '';
    const filterUrgency = document.getElementById('warehouse-filter-urgency')?.value || '';

    let data = [...AppState.data.warehouse];
    if (filterStatus) data = data.filter(d => (d['สถานะงาน'] || '').includes(filterStatus));
    if (filterUrgency) data = data.filter(d => (d['ความเร่งด่วน'] || '').includes(filterUrgency));
    if (AppState.searchQuery) {
        data = data.filter(d =>
            Object.values(d).some(v => v.toLowerCase().includes(AppState.searchQuery))
        );
    }

    const pag = AppState.pagination.warehouse;
    const totalPages = Math.ceil(data.length / pag.perPage) || 1;
    const startIdx = (pag.page - 1) * pag.perPage;
    const pageData = data.slice(startIdx, startIdx + pag.perPage);

    const tbody = document.getElementById('warehouse-tbody');
    if (!pageData.length) {
        tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><span class="material-icons-round">search_off</span><p>ไม่พบข้อมูล</p></div></td></tr>`;
    } else {
        tbody.innerHTML = pageData.map((item) => {
            const globalIdx = AppState.data.warehouse.indexOf(item);
            return `
            <tr draggable="true" data-source="warehouse" data-index="${globalIdx}">
                <td>${escapeHtml(item['ลำดับ'])}</td>
                <td>${formatDate(item['วันที่แจ้ง'])}</td>
                <td>${escapeHtml(item['งานของเดือน'])}</td>
                <td>${escapeHtml(item['ผู้แจ้ง'])}</td>
                <td>${escapeHtml(item['ฝ่าย'])}</td>
                <td>${escapeHtml(item['ชั้น'])}</td>
                <td title="${escapeHtml(item['รายละเอียด'])}">${escapeHtml(item['รายละเอียด'])}</td>
                <td>${escapeHtml(item['ประเภท'])}</td>
                <td>${renderStatusBadge(item['สถานะงาน'])}</td>
                <td>${renderUrgencyBadge(item['ความเร่งด่วน'])}</td>
                <td class="actions-col">
                    <div class="action-btns">
                        <button class="btn-icon edit" title="แก้ไข" onclick="editItem('warehouse', ${globalIdx})">
                            <span class="material-icons-round">edit</span>
                        </button>
                        <button class="btn-icon move" title="โอนย้าย" onclick="moveItem('warehouse', ${globalIdx})">
                            <span class="material-icons-round">drive_file_move</span>
                        </button>
                        <button class="btn-icon delete" title="ลบ" onclick="deleteItem('warehouse', ${globalIdx})">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    renderPagination('warehouse', pag.page, totalPages, data.length);
    initDragDrop();
    attachFilterListeners('warehouse');
}

// ========================================
// Leaks Page
// ========================================
function renderLeaks() {
    const grid = document.getElementById('leaks-grid');
    let data = [...AppState.data.leaks];

    if (AppState.searchQuery) {
        data = data.filter(d =>
            Object.values(d).some(v => v.toLowerCase().includes(AppState.searchQuery))
        );
    }

    if (!data.length) {
        grid.innerHTML = '<div class="empty-state"><span class="material-icons-round">water_drop</span><p>ไม่มีข้อมูลตำแหน่งน้ำรั่ว</p></div>';
        return;
    }

    grid.innerHTML = data.map((item, idx) => `
        <div class="info-card" data-index="${idx}">
            <div class="info-card-header">
                <div class="info-card-floor">
                    <span class="material-icons-round">layers</span>
                    ชั้น ${escapeHtml(item['ชั้น'])}
                </div>
                <div class="info-card-actions">
                    <button class="btn-icon edit" title="แก้ไข" onclick="editItem('leaks', ${idx})">
                        <span class="material-icons-round">edit</span>
                    </button>
                    <button class="btn-icon delete" title="ลบ" onclick="deleteItem('leaks', ${idx})">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>
            </div>
            <div class="info-card-detail">
                <div class="info-card-label">ตำแหน่ง</div>
                <div class="info-card-value">${escapeHtml(item['ตำแหน่ง'])}</div>
            </div>
            <div class="info-card-detail" style="margin-top:10px">
                <div class="info-card-label">รายละเอียด</div>
                <div class="info-card-value">${escapeHtml(item['รายละเอียด'])}</div>
            </div>
        </div>
    `).join('');
}

// ========================================
// Curtains Page
// ========================================
function renderCurtains() {
    const filterStatus = document.getElementById('curtains-filter-status')?.value || '';

    let data = [...AppState.data.curtains];
    if (filterStatus === 'ปกติ') data = data.filter(d => d['ปกติ'] && d['ปกติ'] !== '');
    else if (filterStatus === 'เสีย') data = data.filter(d => d['เสีย'] && d['เสีย'] !== '');
    if (AppState.searchQuery) {
        data = data.filter(d =>
            Object.values(d).some(v => v.toLowerCase().includes(AppState.searchQuery))
        );
    }

    const tbody = document.getElementById('curtains-tbody');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="material-icons-round">search_off</span><p>ไม่พบข้อมูล</p></div></td></tr>`;
    } else {
        tbody.innerHTML = data.map((item, idx) => {
            const globalIdx = AppState.data.curtains.indexOf(item);
            const statusClass = item['เสีย'] ? 'broken' : (item['ปกติ'] ? 'normal' : '');
            const statusText = item['เสีย'] ? `เสีย (${item['เสีย']})` : (item['ปกติ'] ? 'ปกติ' : '-');
            return `
            <tr>
                <td>${escapeHtml(item['ลำดับ'])}</td>
                <td>${escapeHtml(item['อุปกรณ์'])}</td>
                <td>${escapeHtml(item['ตำแหน่ง'])}</td>
                <td>${escapeHtml(item['ชั้น'])}</td>
                <td>${statusClass ? `<span class="status-badge ${statusClass}">${statusText}</span>` : '-'}</td>
                <td title="${escapeHtml(item['รายละเอียด'])}">${escapeHtml(item['รายละเอียด'])}</td>
                <td>${escapeHtml(item['ตำแหน่งห้อง'])}</td>
                <td class="actions-col">
                    <div class="action-btns">
                        <button class="btn-icon edit" title="แก้ไข" onclick="editItem('curtains', ${globalIdx})">
                            <span class="material-icons-round">edit</span>
                        </button>
                        <button class="btn-icon delete" title="ลบ" onclick="deleteItem('curtains', ${globalIdx})">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    attachFilterListeners('curtains');
}

// ========================================
// Monthly Page
// ========================================
function renderMonthly() {
    // Table
    const tbody = document.getElementById('monthly-tbody');
    const data = AppState.data.monthly;

    tbody.innerHTML = data.map(m => `
        <tr>
            <td><strong>${escapeHtml(m['เดือน'])}</strong></td>
            <td>${escapeHtml(m['งานทั้งหมด'])}</td>
            <td>${escapeHtml(m['เสร็จ'])}</td>
            <td>${escapeHtml(m['รอดำเนินการ'])}</td>
            <td>${escapeHtml(m['งานสะสม'])}</td>
        </tr>
    `).join('');

    // Chart
    renderMonthlyDetailChart();
}

function renderMonthlyDetailChart() {
    const ctx = document.getElementById('monthly-detail-chart');
    if (!ctx) return;

    if (AppState.charts.monthlyDetail) AppState.charts.monthlyDetail.destroy();

    const monthly = AppState.data.monthly.filter(m => m['งานทั้งหมด'] && m['งานทั้งหมด'] !== '');
    const labels = monthly.map(m => m['เดือน']);
    const total = monthly.map(m => parseInt(m['งานทั้งหมด']) || 0);
    const done = monthly.map(m => parseInt(m['เสร็จ']) || 0);
    const pending = monthly.map(m => parseInt(m['รอดำเนินการ']) || 0);

    AppState.charts.monthlyDetail = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'งานทั้งหมด',
                    data: total,
                    backgroundColor: 'rgba(220, 38, 38, 0.7)',
                    borderColor: '#dc2626',
                    borderWidth: 1,
                    borderRadius: 6,
                },
                {
                    label: 'เสร็จ',
                    data: done,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: '#22c55e',
                    borderWidth: 1,
                    borderRadius: 6,
                },
                {
                    label: 'รอดำเนินการ',
                    data: pending,
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    borderRadius: 6,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#a3a3a3',
                        font: { family: "'Noto Sans Thai', sans-serif", size: 12 },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: '#262626',
                    titleColor: '#fafafa',
                    bodyColor: '#a3a3a3',
                    borderColor: '#333',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { family: "'Noto Sans Thai', sans-serif" },
                    bodyFont: { family: "'Noto Sans Thai', sans-serif" },
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#737373',
                        font: { family: "'Noto Sans Thai', sans-serif", size: 11 }
                    }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#737373',
                        font: { family: "'Noto Sans Thai', sans-serif", size: 11 }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// ========================================
// Pagination
// ========================================
function renderPagination(source, currentPage, totalPages, totalItems) {
    const container = document.getElementById(`${source}-pagination`);
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = `<span class="pagination-info">แสดง ${totalItems} รายการ</span>`;
        return;
    }

    let html = '';
    html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage('${source}', ${currentPage - 1})">
        <span class="material-icons-round" style="font-size:16px">chevron_left</span>
    </button>`;

    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);

    if (start > 1) {
        html += `<button class="pagination-btn" onclick="goToPage('${source}', 1)">1</button>`;
        if (start > 2) html += `<span class="pagination-info">...</span>`;
    }

    for (let i = start; i <= end; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage('${source}', ${i})">${i}</button>`;
    }

    if (end < totalPages) {
        if (end < totalPages - 1) html += `<span class="pagination-info">...</span>`;
        html += `<button class="pagination-btn" onclick="goToPage('${source}', ${totalPages})">${totalPages}</button>`;
    }

    html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage('${source}', ${currentPage + 1})">
        <span class="material-icons-round" style="font-size:16px">chevron_right</span>
    </button>`;

    html += `<span class="pagination-info">หน้า ${currentPage}/${totalPages} (${totalItems} รายการ)</span>`;

    container.innerHTML = html;
}

function goToPage(source, page) {
    if (AppState.pagination[source]) {
        AppState.pagination[source].page = page;
        renderPage(AppState.currentPage);
    }
}

// ========================================
// CRUD Operations
// ========================================

// --- ADD ---
function initModals() {
    // Add buttons
    document.getElementById('add-planned-btn')?.addEventListener('click', () => openAddModal('planned'));
    document.getElementById('add-request-btn')?.addEventListener('click', () => openAddModal('requests'));
    document.getElementById('add-warehouse-btn')?.addEventListener('click', () => openAddModal('warehouse'));
    document.getElementById('add-leak-btn')?.addEventListener('click', () => openAddModal('leaks'));
    document.getElementById('add-curtain-btn')?.addEventListener('click', () => openAddModal('curtains'));

    // Modal close
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Confirm close
    document.getElementById('confirm-close')?.addEventListener('click', closeConfirm);
    document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeConfirm);
    document.getElementById('confirm-overlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeConfirm();
    });

    // Move close
    document.getElementById('move-close')?.addEventListener('click', closeMoveModal);
    document.getElementById('move-cancel-btn')?.addEventListener('click', closeMoveModal);
    document.getElementById('move-overlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeMoveModal();
    });

    // Save button
    document.getElementById('modal-save-btn')?.addEventListener('click', handleSave);
}

function openAddModal(source) {
    AppState.editingItem = null;
    AppState.editingSource = source;
    document.getElementById('modal-title').textContent = getAddTitle(source);
    document.getElementById('modal-body').innerHTML = getFormHTML(source, null);
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function openEditModal(source, item) {
    AppState.editingSource = source;
    document.getElementById('modal-title').textContent = getEditTitle(source);
    document.getElementById('modal-body').innerHTML = getFormHTML(source, item);
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    AppState.editingItem = null;
    AppState.editingSource = null;
}

function getAddTitle(source) {
    const titles = {
        planned: 'เพิ่มงานซ่อมตามแผน',
        requests: 'เพิ่มการแจ้งซ่อม',
        warehouse: 'เพิ่มงานในคลัง',
        leaks: 'เพิ่มตำแหน่งน้ำรั่ว',
        curtains: 'เพิ่มรายการม่าน'
    };
    return titles[source] || 'เพิ่มข้อมูล';
}

function getEditTitle(source) {
    const titles = {
        planned: 'แก้ไขงานซ่อมตามแผน',
        requests: 'แก้ไขการแจ้งซ่อม',
        warehouse: 'แก้ไขงานในคลัง',
        leaks: 'แก้ไขตำแหน่งน้ำรั่ว',
        curtains: 'แก้ไขรายการม่าน'
    };
    return titles[source] || 'แก้ไขข้อมูล';
}

function getFormHTML(source, item) {
    const v = (key) => item ? escapeHtml(item[key] || '') : '';

    switch (source) {
        case 'planned':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label>รหัสงานซ่อม</label>
                        <input class="form-input" id="f-code" value="${v('รหัสงานซ่อม')}" placeholder="MTC-MT-2026XXXX">
                    </div>
                    <div class="form-group">
                        <label>เดือน</label>
                        <select class="form-input" id="f-month">
                            ${['เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม'].map(m =>
                `<option value="${m}" ${v('เดือน') === m ? 'selected' : ''}>${m}</option>`
            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>หัวข้อ</label>
                    <input class="form-input" id="f-title" value="${v('หัวข้อ')}" placeholder="รายละเอียดงานซ่อม">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>ชั้น</label>
                        <input class="form-input" id="f-floor" value="${v('ชั้น')}" placeholder="ชั้น G, 1, 2...">
                    </div>
                    <div class="form-group">
                        <label>ประเภท</label>
                        <select class="form-input" id="f-type">
                            ${['ไฟฟ้า', 'ประปา', 'สุขภัณฑ์', 'ม่าน', 'ฝ้า', 'ประตู', 'ขอบคิ้ว', 'อุปกรณ์', 'ระบบแอร์', 'เก้าอี้', 'อื่นๆ'].map(t =>
                `<option value="${t}" ${v('ประเภท') === t ? 'selected' : ''}>${t}</option>`
            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>ตำแหน่ง</label>
                        <input class="form-input" id="f-location" value="${v('ตำแหน่ง')}" placeholder="ตำแหน่งงาน">
                    </div>
                    <div class="form-group">
                        <label>ผู้รับผิดชอบ</label>
                        <input class="form-input" id="f-responsible" value="${v('ผู้รับผิดชอบ')}" placeholder="ชื่อผู้รับผิดชอบ">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>ความสำคัญ</label>
                        <select class="form-input" id="f-importance">
                            <option value="" ${!v('ความสำคัญ') ? 'selected' : ''}>-</option>
                            <option value="สำคัญ" ${v('ความสำคัญ') === 'สำคัญ' ? 'selected' : ''}>สำคัญ</option>
                            <option value="ไม่สำคัญ" ${v('ความสำคัญ') === 'ไม่สำคัญ' ? 'selected' : ''}>ไม่สำคัญ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>สถานะ</label>
                        <select class="form-input" id="f-status">
                            <option value="รอดำเนินการ" ${v('สำเร็จ') === 'รอดำเนินการ' ? 'selected' : ''}>รอดำเนินการ</option>
                            <option value="กำลังดำเนินการ" ${v('สำเร็จ') === 'กำลังดำเนินการ' ? 'selected' : ''}>กำลังดำเนินการ</option>
                            <option value="เสร็จสิ้น" ${v('สำเร็จ') === 'เสร็จสิ้น' ? 'selected' : ''}>เสร็จสิ้น</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>หมายเหตุ</label>
                    <input class="form-input" id="f-note" value="${v('หมายเหตุ')}" placeholder="หมายเหตุเพิ่มเติม">
                </div>
            `;

        case 'requests':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label>ชื่อผู้แจ้งซ่อม</label>
                        <input class="form-input" id="f-reporter" value="${v('ชื่อผู้แจ้งซ่อม')}" placeholder="ชื่อ">
                    </div>
                    <div class="form-group">
                        <label>แจ้งผ่าน</label>
                        <select class="form-input" id="f-channel">
                            <option value="Line" ${v('แจ้งผ่าน') === 'Line' ? 'selected' : ''}>Line</option>
                            <option value="ส่วนตัว" ${v('แจ้งผ่าน') === 'ส่วนตัว' ? 'selected' : ''}>ส่วนตัว</option>
                            <option value="โทรศัพท์" ${v('แจ้งผ่าน') === 'โทรศัพท์' ? 'selected' : ''}>โทรศัพท์</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>ฝ่าย</label>
                        <input class="form-input" id="f-dept" value="${v('ฝ่าย')}" placeholder="ฝ่าย/แผนก">
                    </div>
                    <div class="form-group">
                        <label>ประเภท</label>
                        <select class="form-input" id="f-type">
                            ${['ไฟฟ้า', 'ประปา', 'สุขภัณฑ์', 'ม่าน', 'ฝ้า', 'ประตู', 'ขอบคิ้ว', 'อุปกรณ์', 'ระบบแอร์', 'เก้าอี้', 'อื่นๆ'].map(t =>
                `<option value="${t}" ${v('ประเภท') === t ? 'selected' : ''}>${t}</option>`
            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>เรื่อง</label>
                    <input class="form-input" id="f-subject" value="${v('เรื่อง')}" placeholder="รายละเอียดการแจ้งซ่อม">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>ชั้น</label>
                        <input class="form-input" id="f-floor" value="${v('ชั้น')}" placeholder="ชั้น">
                    </div>
                    <div class="form-group">
                        <label>ตำแหน่ง</label>
                        <input class="form-input" id="f-location" value="${v('ตำแหน่ง')}" placeholder="ตำแหน่ง">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>สถานะ</label>
                        <select class="form-input" id="f-status">
                            <option value="รอดำเนินการ" ${v('สถานะ') === 'รอดำเนินการ' ? 'selected' : ''}>รอดำเนินการ</option>
                            <option value="กำลังดำเนินการ" ${v('สถานะ') === 'กำลังดำเนินการ' ? 'selected' : ''}>กำลังดำเนินการ</option>
                            <option value="เรียบร้อย" ${v('สถานะ') === 'เรียบร้อย' ? 'selected' : ''}>เรียบร้อย</option>
                            <option value="โอนย้าย" ${v('สถานะ') === 'โอนย้าย' ? 'selected' : ''}>โอนย้าย</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>วันที่แจ้งซ่อม</label>
                        <input type="date" class="form-input" id="f-date" value="${formatDateForInput(v('วันที่แจ้งซ่อม'))}">
                    </div>
                </div>
            `;

        case 'warehouse':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label>ผู้แจ้ง</label>
                        <input class="form-input" id="f-reporter" value="${v('ผู้แจ้ง')}" placeholder="ชื่อผู้แจ้ง">
                    </div>
                    <div class="form-group">
                        <label>ฝ่าย</label>
                        <input class="form-input" id="f-dept" value="${v('ฝ่าย')}" placeholder="ฝ่าย">
                    </div>
                </div>
                <div class="form-group">
                    <label>รายละเอียด</label>
                    <input class="form-input" id="f-detail" value="${v('รายละเอียด')}" placeholder="รายละเอียดงาน">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>ชั้น</label>
                        <input class="form-input" id="f-floor" value="${v('ชั้น')}" placeholder="ชั้น">
                    </div>
                    <div class="form-group">
                        <label>ประเภท</label>
                        <select class="form-input" id="f-type">
                            ${['ไฟฟ้า', 'ประปา', 'สุขภัณฑ์', 'ม่าน', 'ฝ้า', 'ประตู', 'ขอบคิ้ว', 'อุปกรณ์', 'ระบบแอร์', 'เก้าอี้', 'อื่นๆ'].map(t =>
                `<option value="${t}" ${v('ประเภท') === t ? 'selected' : ''}>${t}</option>`
            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>สถานะงาน</label>
                        <select class="form-input" id="f-status">
                            <option value="รอดำเนินการ" ${v('สถานะงาน') === 'รอดำเนินการ' ? 'selected' : ''}>รอดำเนินการ</option>
                            <option value="กำลังดำเนินการ" ${v('สถานะงาน') === 'กำลังดำเนินการ' ? 'selected' : ''}>กำลังดำเนินการ</option>
                            <option value="สำเร็จ" ${v('สถานะงาน') === 'สำเร็จ' ? 'selected' : ''}>สำเร็จ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>ความเร่งด่วน</label>
                        <select class="form-input" id="f-urgency">
                            <option value="เร่งด่วน" ${v('ความเร่งด่วน') === 'เร่งด่วน' ? 'selected' : ''}>เร่งด่วน</option>
                            <option value="ไม่เร่งด่วน" ${v('ความเร่งด่วน') === 'ไม่เร่งด่วน' ? 'selected' : ''}>ไม่เร่งด่วน</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>วันที่แจ้ง</label>
                    <input type="date" class="form-input" id="f-date" value="${formatDateForInput(v('วันที่แจ้ง'))}">
                </div>
            `;

        case 'leaks':
            return `
                <div class="form-group">
                    <label>ชั้น</label>
                    <input class="form-input" id="f-floor" value="${v('ชั้น')}" placeholder="หมายเลขชั้น">
                </div>
                <div class="form-group">
                    <label>ตำแหน่ง</label>
                    <input class="form-input" id="f-location" value="${v('ตำแหน่ง')}" placeholder="ตำแหน่งที่พบน้ำรั่ว">
                </div>
                <div class="form-group">
                    <label>รายละเอียด</label>
                    <input class="form-input" id="f-detail" value="${v('รายละเอียด')}" placeholder="รายละเอียดเพิ่มเติม">
                </div>
            `;

        case 'curtains':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label>อุปกรณ์</label>
                        <input class="form-input" id="f-equipment" value="${v('อุปกรณ์')}" placeholder="ม่าน">
                    </div>
                    <div class="form-group">
                        <label>ชั้น</label>
                        <input class="form-input" id="f-floor" value="${v('ชั้น')}" placeholder="ชั้น">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>ตำแหน่ง</label>
                        <input class="form-input" id="f-location" value="${v('ตำแหน่ง')}" placeholder="ตำแหน่ง">
                    </div>
                    <div class="form-group">
                        <label>ตำแหน่งห้อง</label>
                        <input class="form-input" id="f-room" value="${v('ตำแหน่งห้อง')}" placeholder="ห้อง">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>สถานะ</label>
                        <select class="form-input" id="f-condition">
                            <option value="normal" ${v('ปกติ') ? 'selected' : ''}>ปกติ (N)</option>
                            <option value="broken" ${v('เสีย') ? 'selected' : ''}>เสีย (AB)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>รายละเอียด</label>
                        <input class="form-input" id="f-detail" value="${v('รายละเอียด')}" placeholder="รายละเอียด">
                    </div>
                </div>
            `;

        default:
            return '<p>ไม่พบฟอร์ม</p>';
    }
}

async function handleSave() {
    const source = AppState.editingSource;
    if (!source) return;

    let newItem;
    switch (source) {
        case 'planned':
            newItem = {
                'รหัสงานซ่อม': document.getElementById('f-code')?.value || '',
                'หัวข้อ': document.getElementById('f-title')?.value || '',
                'ชั้น': document.getElementById('f-floor')?.value || '',
                'งานเพิ่มเติม': '',
                'ประเภท': document.getElementById('f-type')?.value || '',
                'ตำแหน่ง': document.getElementById('f-location')?.value || '',
                'ผู้รับผิดชอบ': document.getElementById('f-responsible')?.value || '',
                'หมายเหตุ': document.getElementById('f-note')?.value || '',
                'ระดับ': '',
                'ความสำคัญ': document.getElementById('f-importance')?.value || '',
                'ความเร่งด่วน': '',
                'สำเร็จ': document.getElementById('f-status')?.value || 'รอดำเนินการ',
                'วันที่เข้าแก้ไข': '',
                'จำนวนคนที่ใช้': '',
                'เวลาที่ใช้ (นาที)': '',
                'ค่าใช้จ่าย (บาท)': '',
                'วิธีแก้ไข': '',
                'เดือน': document.getElementById('f-month')?.value || '',
                'สัปดาห์': ''
            };
            if (!newItem['หัวข้อ']) { showToast('กรุณาระบุหัวข้อ', 'warning'); return; }
            break;

        case 'requests':
            newItem = {
                'ลำดับ': '',
                'ชื่อผู้แจ้งซ่อม': document.getElementById('f-reporter')?.value || '',
                'ฝ่าย': document.getElementById('f-dept')?.value || '',
                'แจ้งผ่าน': document.getElementById('f-channel')?.value || '',
                'เรื่อง': document.getElementById('f-subject')?.value || '',
                'ชั้น': document.getElementById('f-floor')?.value || '',
                'ประเภท': document.getElementById('f-type')?.value || '',
                'วันที่แจ้งซ่อม': document.getElementById('f-date')?.value || '',
                'ตำแหน่ง': document.getElementById('f-location')?.value || '',
                'สถานะ': document.getElementById('f-status')?.value || 'รอดำเนินการ',
                'วันที่เข้าแก้ไข': ''
            };
            if (!newItem['เรื่อง']) { showToast('กรุณาระบุเรื่อง', 'warning'); return; }
            break;

        case 'warehouse':
            newItem = {
                'ลำดับ': '',
                'วันที่แจ้ง': document.getElementById('f-date')?.value || '',
                'งานของเดือน': '',
                'ผู้แจ้ง': document.getElementById('f-reporter')?.value || '',
                'ฝ่าย': document.getElementById('f-dept')?.value || '',
                'ชั้น': document.getElementById('f-floor')?.value || '',
                'รายละเอียด': document.getElementById('f-detail')?.value || '',
                'ประเภท': document.getElementById('f-type')?.value || '',
                'โอนย้ายซ่อมในเดือน': '',
                'สถานะงาน': document.getElementById('f-status')?.value || 'รอดำเนินการ',
                'ความเร่งด่วน': document.getElementById('f-urgency')?.value || ''
            };
            if (!newItem['รายละเอียด']) { showToast('กรุณาระบุรายละเอียด', 'warning'); return; }
            break;

        case 'leaks':
            newItem = {
                'ลำดับ': String(AppState.data.leaks.length + 1),
                'ชั้น': document.getElementById('f-floor')?.value || '',
                'ตำแหน่ง': document.getElementById('f-location')?.value || '',
                'รายละเอียด': document.getElementById('f-detail')?.value || ''
            };
            if (!newItem['ชั้น']) { showToast('กรุณาระบุชั้น', 'warning'); return; }
            break;

        case 'curtains':
            const condition = document.getElementById('f-condition')?.value;
            newItem = {
                'ลำดับ': String(AppState.data.curtains.length + 1),
                'อุปกรณ์': document.getElementById('f-equipment')?.value || 'ม่าน',
                'ตำแหน่ง': document.getElementById('f-location')?.value || '',
                'ชั้น': document.getElementById('f-floor')?.value || '',
                'ปกติ': condition === 'normal' ? 'N' : '',
                'เสีย': condition === 'broken' ? 'AB' : '',
                'รายละเอียด': document.getElementById('f-detail')?.value || '',
                'ตำแหน่งห้อง': document.getElementById('f-room')?.value || ''
            };
            break;
    }

    if (AppState.editingItem !== null) {
        // Edit existing
        AppState.data[source][AppState.editingItem] = newItem;

        // Sync to Google Sheets
        if (AppState.useGoogleSheets && AppState.isOnline) {
            try {
                updateSyncStatus('syncing');
                await GoogleSheetsDB.updateRow(source, AppState.editingItem, newItem);
            } catch (err) {
                console.warn('Failed to sync edit to Google Sheets:', err);
                showToast('แก้ไขในเครื่องสำเร็จ แต่ไม่สามารถซิงค์ได้', 'warning');
            }
        }
        showToast('แก้ไขข้อมูลสำเร็จ', 'success');
    } else {
        // Add new - reindex
        if (source === 'requests') {
            newItem['ลำดับ'] = String(AppState.data.requests.length + 1);
        } else if (source === 'warehouse') {
            newItem['ลำดับ'] = String(AppState.data.warehouse.length + 1);
        }
        AppState.data[source].push(newItem);

        // Sync to Google Sheets
        if (AppState.useGoogleSheets && AppState.isOnline) {
            try {
                updateSyncStatus('syncing');
                await GoogleSheetsDB.appendRow(source, newItem);
            } catch (err) {
                console.warn('Failed to sync add to Google Sheets:', err);
                showToast('เพิ่มในเครื่องสำเร็จ แต่ไม่สามารถซิงค์ได้', 'warning');
            }
        }
        showToast('เพิ่มข้อมูลสำเร็จ', 'success');
    }

    recalculateSummary();
    saveData();
    closeModal();
    renderPage(AppState.currentPage);
}

// --- EDIT ---
function editItem(source, index) {
    AppState.editingItem = index;
    const item = AppState.data[source][index];
    if (!item) return;
    openEditModal(source, item);
}

// --- DELETE ---
function deleteItem(source, index) {
    const overlay = document.getElementById('confirm-overlay');
    const item = AppState.data[source][index];
    if (!item) return;

    const label = item['หัวข้อ'] || item['เรื่อง'] || item['รายละเอียด'] || item['ตำแหน่ง'] || `รายการที่ ${index + 1}`;
    document.getElementById('confirm-message').textContent = `คุณต้องการลบ "${label}" หรือไม่?`;
    overlay.classList.remove('hidden');

    const okBtn = document.getElementById('confirm-ok-btn');
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    newOkBtn.addEventListener('click', async () => {
        AppState.data[source].splice(index, 1);

        // Sync to Google Sheets
        if (AppState.useGoogleSheets && AppState.isOnline) {
            try {
                updateSyncStatus('syncing');
                await GoogleSheetsDB.deleteRow(source, index);
            } catch (err) {
                console.warn('Failed to sync delete to Google Sheets:', err);
                showToast('ลบในเครื่องสำเร็จ แต่ไม่สามารถซิงค์ได้', 'warning');
            }
        }

        recalculateSummary();
        saveData();
        closeConfirm();
        renderPage(AppState.currentPage);
        showToast('ลบข้อมูลสำเร็จ', 'success');
    });
}

function closeConfirm() {
    document.getElementById('confirm-overlay').classList.add('hidden');
}

// --- MOVE ---
function moveItem(source, index) {
    const overlay = document.getElementById('move-overlay');
    const item = AppState.data[source][index];
    if (!item) return;

    const label = item['หัวข้อ'] || item['เรื่อง'] || item['รายละเอียด'] || `รายการที่ ${index + 1}`;
    document.getElementById('move-info').textContent = `โอนย้าย "${label}" จาก ${getPageName(source)}`;

    // Set current options
    const dest = document.getElementById('move-destination');
    dest.innerHTML = '';
    const pages = { planned: 'งานซ่อมตามแผน', requests: 'แจ้งซ่อมเพิ่มเติม', warehouse: 'คลังงานซ่อม' };
    Object.entries(pages).forEach(([key, name]) => {
        if (key !== source) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = name;
            dest.appendChild(opt);
        }
    });

    overlay.classList.remove('hidden');

    const okBtn = document.getElementById('move-ok-btn');
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    newOkBtn.addEventListener('click', async () => {
        const destination = document.getElementById('move-destination').value;
        const movedItem = AppState.data[source].splice(index, 1)[0];

        // Convert item fields to match destination
        const converted = convertItemForDestination(movedItem, source, destination);
        AppState.data[destination].push(converted);

        // Sync to Google Sheets
        if (AppState.useGoogleSheets && AppState.isOnline) {
            try {
                updateSyncStatus('syncing');
                await GoogleSheetsDB.deleteRow(source, index);
                await GoogleSheetsDB.appendRow(destination, converted);
            } catch (err) {
                console.warn('Failed to sync move to Google Sheets:', err);
                showToast('ย้ายในเครื่องสำเร็จ แต่ไม่สามารถซิงค์ได้', 'warning');
            }
        }

        recalculateSummary();
        saveData();
        closeMoveModal();
        renderPage(AppState.currentPage);
        showToast(`ย้ายไปยัง ${pages[destination]} สำเร็จ`, 'success');
    });
}

function closeMoveModal() {
    document.getElementById('move-overlay').classList.add('hidden');
}

function convertItemForDestination(item, from, to) {
    // Basic field mapping between different data sources
    const result = {};

    if (to === 'warehouse') {
        result['ลำดับ'] = String(AppState.data.warehouse.length + 1);
        result['วันที่แจ้ง'] = item['วันที่แจ้งซ่อม'] || item['วันที่เข้าแก้ไข'] || '';
        result['งานของเดือน'] = item['เดือน'] || '';
        result['ผู้แจ้ง'] = item['ชื่อผู้แจ้งซ่อม'] || item['ผู้รับผิดชอบ'] || '';
        result['ฝ่าย'] = item['ฝ่าย'] || '';
        result['ชั้น'] = item['ชั้น'] || '';
        result['รายละเอียด'] = item['หัวข้อ'] || item['เรื่อง'] || '';
        result['ประเภท'] = item['ประเภท'] || '';
        result['โอนย้ายซ่อมในเดือน'] = '';
        result['สถานะงาน'] = item['สถานะ'] || item['สำเร็จ'] || 'รอดำเนินการ';
        result['ความเร่งด่วน'] = item['ความเร่งด่วน'] || '';
    } else if (to === 'requests') {
        result['ลำดับ'] = String(AppState.data.requests.length + 1);
        result['ชื่อผู้แจ้งซ่อม'] = item['ผู้แจ้ง'] || item['ผู้รับผิดชอบ'] || '';
        result['ฝ่าย'] = item['ฝ่าย'] || '';
        result['แจ้งผ่าน'] = '';
        result['เรื่อง'] = item['รายละเอียด'] || item['หัวข้อ'] || '';
        result['ชั้น'] = item['ชั้น'] || '';
        result['ประเภท'] = item['ประเภท'] || '';
        result['วันที่แจ้งซ่อม'] = item['วันที่แจ้ง'] || '';
        result['ตำแหน่ง'] = item['ตำแหน่ง'] || '';
        result['สถานะ'] = item['สถานะงาน'] || item['สำเร็จ'] || 'รอดำเนินการ';
        result['วันที่เข้าแก้ไข'] = '';
    } else if (to === 'planned') {
        result['รหัสงานซ่อม'] = 'MTC-MT-NEW';
        result['หัวข้อ'] = item['เรื่อง'] || item['รายละเอียด'] || '';
        result['ชั้น'] = item['ชั้น'] || '';
        result['งานเพิ่มเติม'] = '';
        result['ประเภท'] = item['ประเภท'] || '';
        result['ตำแหน่ง'] = item['ตำแหน่ง'] || '';
        result['ผู้รับผิดชอบ'] = '';
        result['หมายเหตุ'] = '';
        result['ระดับ'] = '';
        result['ความสำคัญ'] = '';
        result['ความเร่งด่วน'] = item['ความเร่งด่วน'] || '';
        result['สำเร็จ'] = item['สถานะ'] || item['สถานะงาน'] || 'รอดำเนินการ';
        result['วันที่เข้าแก้ไข'] = '';
        result['จำนวนคนที่ใช้'] = '';
        result['เวลาที่ใช้ (นาที)'] = '';
        result['ค่าใช้จ่าย (บาท)'] = '';
        result['วิธีแก้ไข'] = '';
        result['เดือน'] = item['งานของเดือน'] || '';
        result['สัปดาห์'] = '';
    }

    return result;
}

// ========================================
// Drag and Drop
// ========================================
function initDragDrop() {
    const rows = document.querySelectorAll('.data-table tbody tr[draggable="true"]');
    rows.forEach(row => {
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragend', handleDragEnd);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragenter', handleDragEnter);
        row.addEventListener('dragleave', handleDragLeave);
    });
}

let dragSource = null;

function handleDragStart(e) {
    dragSource = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
        source: this.dataset.source,
        index: parseInt(this.dataset.index)
    }));
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (dragSource === this) return;

    try {
        const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const dropIndex = parseInt(this.dataset.index);
        const source = dragData.source;
        const fromIndex = dragData.index;

        if (source && fromIndex !== undefined && dropIndex !== undefined) {
            const arr = AppState.data[source];
            const [moved] = arr.splice(fromIndex, 1);
            arr.splice(dropIndex, 0, moved);
            saveData();
            renderPage(AppState.currentPage);
            showToast('เรียงลำดับใหม่สำเร็จ', 'info');
        }
    } catch (err) {
        console.error('Drop error:', err);
    }
}

// ========================================
// Helper Functions
// ========================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getStatusClass(status) {
    if (!status) return '';
    if (status.includes('เสร็จ') || status.includes('เรียบร้อย') || status.includes('สำเร็จ')) return 'done';
    if (status.includes('กำลัง')) return 'inprogress';
    if (status.includes('รอ') || status.includes('pending')) return 'pending';
    if (status.includes('โอนย้าย')) return 'transfer';
    return '';
}

function formatStatus(status) {
    if (!status) return '-';
    return status;
}

function renderStatusBadge(status) {
    if (!status) return '<span class="status-badge">-</span>';
    const cls = getStatusClass(status);
    return `<span class="status-badge ${cls}">${escapeHtml(status)}</span>`;
}

function renderPriority(priority) {
    if (!priority) return '-';
    const cls = priority.includes('สำคัญ') ? 'high' : 'medium';
    return `<span class="priority-badge ${cls}">${escapeHtml(priority)}</span>`;
}

function renderUrgencyBadge(urgency) {
    if (!urgency) return '-';
    const cls = urgency.includes('เร่งด่วน') && !urgency.includes('ไม่') ? 'high' : 'low';
    return `<span class="priority-badge ${cls}">${escapeHtml(urgency)}</span>`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    // Handle "2569-04-17 00:00:00" format
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return dateStr;
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        // Convert Thai year to CE for input
        let year = parseInt(match[1]);
        if (year > 2500) year -= 543;
        return `${year}-${match[2]}-${match[3]}`;
    }
    return '';
}

function getPageName(source) {
    const names = {
        planned: 'งานซ่อมตามแผน',
        requests: 'แจ้งซ่อมเพิ่มเติม',
        warehouse: 'คลังงานซ่อม',
        leaks: 'ตำแหน่งน้ำรั่ว',
        curtains: 'เช็คม่าน'
    };
    return names[source] || source;
}

// ========================================
// Toast Notifications
// ========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons-round">${icons[type] || 'info'}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
