/**
 * MTC Maintenance Management System v3.0
 * ระบบจัดการงานซ่อมบำรุง MTC
 * 
 * Blue-White-Yellow Liquid Glass Theme
 * Data from visible sheets only
 */

// ========================================
// Global State
// ========================================
const AppState = {
    data: { repairs: [], weekly: [], analysis: [], summary: {} },
    currentPage: 'dashboard',
    pagination: { page: 1, perPage: 15 },
    filters: { status: '', type: '', department: '' },
    sort: { field: 'order', direction: 'asc' },
    editPhotos: [],
    charts: {},
    selectedWeeklyMonth: null,
    selectedAnalysisMonth: null,
    confirmCallback: null,
    lightboxPhotos: [],
    lightboxIndex: 0,
    sheetUrl: '',
    syncChannel: null,
};

const STORAGE_KEY = 'mtc_app_data_v3.1';
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const PAGE_TITLES = {
    dashboard: 'แดชบอร์ด',
    repairs: 'รายการงานซ่อมทั้งหมด',
    weekly: 'สรุปรายสัปดาห์',
    analysis: 'วิเคราะห์รายเดือน',
};

const STATUS_MAP = {
    'เรียบร้อย': { class: 'completed', icon: 'check_circle' },
    'รอดำเนินการ': { class: 'pending', icon: 'pending' },
    'กำลังดำเนินการ': { class: 'in-progress', icon: 'autorenew' },
    'โอนย้าย': { class: 'transferred', icon: 'swap_horiz' },
};

const CHART_COLORS = {
    blue: '#3B82F6', blueBg: 'rgba(59,130,246,0.15)',
    green: '#22C55E', greenBg: 'rgba(34,197,94,0.15)',
    amber: '#F59E0B', amberBg: 'rgba(245,158,11,0.15)',
    red: '#EF4444', redBg: 'rgba(239,68,68,0.15)',
    purple: '#A855F7', purpleBg: 'rgba(168,85,247,0.15)',
    slate: '#64748B',
};

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    updateDate();
    // Try loading from localStorage first
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            AppState.data = JSON.parse(saved);
        } catch (e) { /* fallback to fetch */ }
    }

    // Always try to load fresh data.json
    try {
        const res = await fetch('data.json');
        if (res.ok) {
            const fresh = await res.json();
            // Only overwrite if localStorage had no data
            if (!saved) {
                AppState.data = fresh;
                persistData();
            } else {
                // Always update read-only sections from fresh data.json to get latest extraction
                AppState.data.weekly = fresh.weekly;
                AppState.data.analysis = fresh.analysis;
                
                // Merge summary if missing
                if (!AppState.data.summary || !AppState.data.summary.total) {
                    AppState.data.summary = fresh.summary;
                }
                
                // Persist the updated weekly/analysis to localStorage
                persistData();
            }
        }
    } catch (e) {
        console.warn('Could not load data.json:', e);
    }

    // Recompute summary from repairs
    recomputeSummary();

    // Setup BroadcastChannel for real-time cross-tab sync
    setupBroadcastChannel();

    // Setup keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);

    // Populate filter dropdowns
    populateFilterDropdowns();

    // Hide loading and show appropriate screen
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        
        const savedUrl = localStorage.getItem('mtc_sheet_url');
        if (savedUrl) {
            AppState.sheetUrl = savedUrl;
            document.getElementById('app').style.display = 'flex';
            updateSyncStatus('live');
            renderCurrentPage();
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
        }
    }, 1200);
}

function recomputeSummary() {
    const repairs = AppState.data.repairs || [];
    const counts = { 'เรียบร้อย': 0, 'รอดำเนินการ': 0, 'กำลังดำเนินการ': 0, 'โอนย้าย': 0 };
    repairs.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    AppState.data.summary = {
        total: repairs.length,
        completed: counts['เรียบร้อย'],
        pending: counts['รอดำเนินการ'],
        inProgress: counts['กำลังดำเนินการ'],
        transferred: counts['โอนย้าย'],
        statusCounts: counts,
    };
}

function persistData() {
    try {
        // Save repairs (without large photo data to save space)
        const toSave = JSON.parse(JSON.stringify(AppState.data));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        broadcastSync();
    } catch (e) {
        console.warn('localStorage save failed:', e);
    }
}

// ========================================
// BroadcastChannel (Cross-tab Sync)
// ========================================
function setupBroadcastChannel() {
    try {
        AppState.syncChannel = new BroadcastChannel('mtc-sync');
        AppState.syncChannel.onmessage = (e) => {
            if (e.data.type === 'data-update') {
                AppState.data = e.data.data;
                recomputeSummary();
                renderCurrentPage();
                showToast('ข้อมูลอัปเดตจากแท็บอื่น', 'info');
            }
        };
    } catch (e) { /* BroadcastChannel not supported */ }
}

function broadcastSync() {
    if (AppState.syncChannel) {
        try {
            AppState.syncChannel.postMessage({ type: 'data-update', data: AppState.data });
        } catch (e) { /* ignore */ }
    }
}

// ========================================
// Date Display
// ========================================
function updateDate() {
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const el = document.getElementById('topbar-date');
    if (el) {
        el.innerHTML = `<span class="material-icons-round">calendar_today</span>
            วัน${days[now.getDay()]}ที่ ${now.getDate()} ${months[now.getMonth()]} ${thaiYear}`;
    }
}

// ========================================
// Navigation
// ========================================
function navigateTo(page) {
    AppState.currentPage = page;
    AppState.pagination.page = 1;

    // Update sidebar active state
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update page title
    document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;

    // Toggle page sections
    document.querySelectorAll('.page-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `page-${page}`);
    });

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('mobile-open');

    renderCurrentPage();
}

// Setup nav clicks
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item[data-page]');
    if (navItem) {
        e.preventDefault();
        navigateTo(navItem.dataset.page);
    }
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('mobile-open');
}

// ========================================
// Keyboard Shortcuts
// ========================================
function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search').focus();
    }
    if (e.key === 'Escape') {
        closeModal();
        closeConfirm();
        closeLightbox();
    }
}

// ========================================
// Search
// ========================================
function handleSearch(e) {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
        renderRepairsTable();
        return;
    }
    // Navigate to repairs page if not there
    if (AppState.currentPage !== 'repairs') navigateTo('repairs');
    renderRepairsTable(q);
}

// ========================================
// Rendering — Route to current page
// ========================================
function renderCurrentPage() {
    switch (AppState.currentPage) {
        case 'dashboard': renderDashboard(); break;
        case 'repairs': renderRepairsPage(); break;
        case 'weekly': renderWeeklyPage(); break;
        case 'analysis': renderAnalysisPage(); break;
    }
}

// ========================================
// Dashboard
// ========================================
function renderDashboard() {
    const s = AppState.data.summary;
    
    // Stat cards
    document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card total">
            <div class="stat-icon"><span class="material-icons-round">assignment</span></div>
            <div class="stat-info">
                <div class="stat-label">งานทั้งหมด</div>
                <div class="stat-value">${s.total || 0}</div>
            </div>
        </div>
        <div class="stat-card completed">
            <div class="stat-icon"><span class="material-icons-round">check_circle</span></div>
            <div class="stat-info">
                <div class="stat-label">สำเร็จ</div>
                <div class="stat-value">${s.completed || 0}</div>
            </div>
        </div>
        <div class="stat-card pending">
            <div class="stat-icon"><span class="material-icons-round">pending</span></div>
            <div class="stat-info">
                <div class="stat-label">รอดำเนินการ</div>
                <div class="stat-value">${s.pending || 0}</div>
            </div>
        </div>
        <div class="stat-card in-progress">
            <div class="stat-icon"><span class="material-icons-round">autorenew</span></div>
            <div class="stat-info">
                <div class="stat-label">กำลังดำเนินการ</div>
                <div class="stat-value">${s.inProgress || 0}</div>
            </div>
        </div>
    `;

    // Charts
    renderMonthlyTrendChart();
    renderStatusDonutChart();
    renderTypeBarChart();
    renderRecentList();
}

function renderMonthlyTrendChart() {
    const analysis = AppState.data.analysis || [];
    if (!analysis.length) return;

    const labels = analysis.map(a => a.month);
    const totals = analysis.map(a => a.totals?.total || 0);
    const completed = analysis.map(a => a.totals?.completed || 0);
    const pending = analysis.map(a => (a.totals?.pending || 0) + (a.totals?.inProgress || 0));

    const ctx = document.getElementById('monthly-trend-chart');
    if (!ctx) return;

    if (AppState.charts.monthlyTrend) AppState.charts.monthlyTrend.destroy();

    const chartType = document.getElementById('monthly-chart-type')?.value || 'line';

    AppState.charts.monthlyTrend = new Chart(ctx, {
        type: chartType,
        data: {
            labels,
            datasets: [
                {
                    label: 'งานทั้งหมด',
                    data: totals,
                    borderColor: CHART_COLORS.blue,
                    backgroundColor: chartType === 'bar' ? CHART_COLORS.blueBg : 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: chartType === 'line',
                    pointRadius: 4,
                    pointBackgroundColor: CHART_COLORS.blue,
                },
                {
                    label: 'สำเร็จ',
                    data: completed,
                    borderColor: CHART_COLORS.green,
                    backgroundColor: chartType === 'bar' ? CHART_COLORS.greenBg : 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: CHART_COLORS.green,
                },
                {
                    label: 'รอดำเนินการ',
                    data: pending,
                    borderColor: CHART_COLORS.amber,
                    backgroundColor: chartType === 'bar' ? CHART_COLORS.amberBg : 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: CHART_COLORS.amber,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, padding: 16, font: { family: "'Noto Sans Thai', sans-serif", size: 12 } } },
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: "'Noto Sans Thai'" } } },
                x: { grid: { display: false }, ticks: { font: { family: "'Noto Sans Thai'" } } },
            }
        }
    });
}

function updateMonthlyChart() {
    renderMonthlyTrendChart();
}

function renderStatusDonutChart() {
    const s = AppState.data.summary;
    if (!s.total) return;

    const ctx = document.getElementById('status-donut-chart');
    if (!ctx) return;
    if (AppState.charts.statusDonut) AppState.charts.statusDonut.destroy();

    AppState.charts.statusDonut = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['สำเร็จ', 'รอดำเนินการ', 'กำลังดำเนินการ', 'โอนย้าย'],
            datasets: [{
                data: [s.completed, s.pending, s.inProgress, s.transferred],
                backgroundColor: [CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.blue, CHART_COLORS.purple],
                borderWidth: 0,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { family: "'Noto Sans Thai'", size: 11 } } }
            }
        }
    });
}

function renderTypeBarChart() {
    // Aggregate repair types from all repairs
    const typeCounts = {};
    (AppState.data.repairs || []).forEach(r => {
        if (r.type) typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });

    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return;

    const ctx = document.getElementById('type-bar-chart');
    if (!ctx) return;
    if (AppState.charts.typeBar) AppState.charts.typeBar.destroy();

    const colors = [CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.red,
                    CHART_COLORS.purple, '#06B6D4', '#EC4899', '#8B5CF6', '#14B8A6'];

    AppState.charts.typeBar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                label: 'จำนวน',
                data: sorted.map(s => s[1]),
                backgroundColor: sorted.map((_, i) => colors[i % colors.length] + '30'),
                borderColor: sorted.map((_, i) => colors[i % colors.length]),
                borderWidth: 1.5,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: "'Noto Sans Thai'" } } },
                y: { grid: { display: false }, ticks: { font: { family: "'Noto Sans Thai'", size: 11 } } },
            }
        }
    });
}

function renderRecentList() {
    const repairs = (AppState.data.repairs || []).slice(-10).reverse();
    const el = document.getElementById('recent-list');
    if (!el) return;

    if (!repairs.length) {
        el.innerHTML = '<li class="recent-item" style="color:var(--text-tertiary)">ไม่มีข้อมูล</li>';
        return;
    }

    el.innerHTML = repairs.map(r => {
        const statusInfo = STATUS_MAP[r.status] || { class: 'pending', icon: 'help' };
        return `<li class="recent-item">
            <span class="recent-dot ${statusInfo.class === 'completed' ? 'success' : statusInfo.class === 'pending' ? 'warning' : 'info'}"></span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.subject)}</span>
            <span class="status-badge ${statusInfo.class}" style="flex-shrink:0">${r.status}</span>
        </li>`;
    }).join('');
}

// ========================================
// Repairs Page
// ========================================
function renderRepairsPage() {
    renderRepairsTable();
}

function getFilteredRepairs(searchQuery) {
    let repairs = [...(AppState.data.repairs || [])];
    const f = AppState.filters;

    if (f.status) repairs = repairs.filter(r => r.status === f.status);
    if (f.type) repairs = repairs.filter(r => r.type === f.type);
    if (f.department) repairs = repairs.filter(r => r.department === f.department);

    if (searchQuery) {
        repairs = repairs.filter(r =>
            (r.subject || '').toLowerCase().includes(searchQuery) ||
            (r.reporter || '').toLowerCase().includes(searchQuery) ||
            (r.location || '').toLowerCase().includes(searchQuery) ||
            (r.type || '').toLowerCase().includes(searchQuery) ||
            (r.order || '').includes(searchQuery)
        );
    }

    // Sort
    const { field, direction } = AppState.sort;
    repairs.sort((a, b) => {
        let va = a[field] || '', vb = b[field] || '';
        if (field === 'order') { va = parseInt(va) || 0; vb = parseInt(vb) || 0; }
        if (va < vb) return direction === 'asc' ? -1 : 1;
        if (va > vb) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return repairs;
}

function renderRepairsTable(searchQuery) {
    const filtered = getFilteredRepairs(searchQuery);
    const { page, perPage } = AppState.pagination;
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);

    const tbody = document.getElementById('repairs-tbody');
    if (!tbody) return;

    if (!pageItems.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state">
            <span class="material-icons-round">search_off</span>
            <h3>ไม่พบข้อมูล</h3><p>ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
        </td></tr>`;
    } else {
        tbody.innerHTML = pageItems.map((r, i) => {
            const realIndex = AppState.data.repairs.indexOf(r);
            const statusInfo = STATUS_MAP[r.status] || { class: 'pending', icon: 'help' };
            const photoCount = (r.photos || []).length;
            const photoHtml = photoCount > 0
                ? `<div class="photo-thumbs">
                    ${r.photos.slice(0, 2).map((p, pi) => `<img class="photo-thumb" src="${p}" alt="photo" onclick="openLightbox(${realIndex}, ${pi})">`).join('')}
                    ${photoCount > 2 ? `<span class="photo-more" onclick="openLightbox(${realIndex}, 2)">+${photoCount - 2}</span>` : ''}
                   </div>`
                : '<span style="color:var(--text-tertiary);font-size:11px">—</span>';

            return `<tr>
                <td><strong>${escHtml(r.order)}</strong></td>
                <td class="td-subject" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(r.subject)}">${escHtml(r.subject)}</td>
                <td>${escHtml(r.department)}</td>
                <td>${escHtml(r.floor)}</td>
                <td>${escHtml(r.type)}</td>
                <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.location)}</td>
                <td><span class="status-badge ${statusInfo.class}"><span class="material-icons-round" style="font-size:13px">${statusInfo.icon}</span>${r.status}</span></td>
                <td>${photoHtml}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" onclick="openEditModal(${realIndex})" title="แก้ไข"><span class="material-icons-round">edit</span></button>
                        <button class="action-btn delete" onclick="confirmDelete(${realIndex})" title="ลบ"><span class="material-icons-round">delete</span></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // Pagination
    renderPagination(filtered.length, currentPage, totalPages);
}

function renderPagination(total, current, totalPages) {
    const el = document.getElementById('repairs-pagination');
    if (!el) return;

    el.innerHTML = `
        <div class="pagination-info">แสดง ${((current-1)*AppState.pagination.perPage)+1}–${Math.min(current*AppState.pagination.perPage, total)} จาก ${total} รายการ</div>
        <div class="pagination-btns">
            <button class="page-btn" ${current <= 1 ? 'disabled' : ''} onclick="goToPage(${current-1})"><span class="material-icons-round" style="font-size:16px">chevron_left</span></button>
            ${Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
                let p = i + 1;
                if (totalPages > 7) {
                    if (current <= 4) p = i + 1;
                    else if (current >= totalPages - 3) p = totalPages - 6 + i;
                    else p = current - 3 + i;
                }
                return `<button class="page-btn ${p === current ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`;
            }).join('')}
            <button class="page-btn" ${current >= totalPages ? 'disabled' : ''} onclick="goToPage(${current+1})"><span class="material-icons-round" style="font-size:16px">chevron_right</span></button>
        </div>
    `;
}

function goToPage(p) {
    AppState.pagination.page = p;
    renderRepairsTable();
}

function populateFilterDropdowns() {
    const types = new Set(), depts = new Set();
    (AppState.data.repairs || []).forEach(r => {
        if (r.type) types.add(r.type);
        if (r.department) depts.add(r.department);
    });

    const typeSelect = document.getElementById('filter-type');
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="">ประเภททั้งหมด</option>' +
            [...types].sort().map(t => `<option value="${t}">${t}</option>`).join('');
    }

    const deptSelect = document.getElementById('filter-dept');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">ฝ่ายทั้งหมด</option>' +
            [...depts].sort().map(d => `<option value="${d}">${d}</option>`).join('');
    }
}

function filterRepairs() {
    AppState.filters.status = document.getElementById('filter-status')?.value || '';
    AppState.filters.type = document.getElementById('filter-type')?.value || '';
    AppState.filters.department = document.getElementById('filter-dept')?.value || '';
    AppState.pagination.page = 1;
    renderRepairsTable();
}

function sortRepairs(field) {
    if (AppState.sort.field === field) {
        AppState.sort.direction = AppState.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        AppState.sort.field = field;
        AppState.sort.direction = 'asc';
    }
    renderRepairsTable();
}

// ========================================
// CRUD — Add / Edit / Delete
// ========================================
function openAddModal() {
    document.getElementById('edit-index').value = '-1';
    document.getElementById('modal-title').textContent = 'เพิ่มงานซ่อม';
    clearModalForm();
    AppState.editPhotos = [];
    renderPhotoGallery();
    document.getElementById('repair-modal').classList.add('active');
}

function openEditModal(index) {
    const r = AppState.data.repairs[index];
    if (!r) return;

    document.getElementById('edit-index').value = index;
    document.getElementById('modal-title').textContent = 'แก้ไขงานซ่อม';
    document.getElementById('field-reporter').value = r.reporter || '';
    document.getElementById('field-department').value = r.department || '';
    document.getElementById('field-channel').value = r.channel || 'Line';
    document.getElementById('field-floor').value = r.floor || '';
    document.getElementById('field-subject').value = r.subject || '';
    document.getElementById('field-type').value = r.type || 'ไฟฟ้า';
    document.getElementById('field-location').value = r.location || '';
    document.getElementById('field-status').value = r.status || 'รอดำเนินการ';
    document.getElementById('field-date-reported').value = r.dateReported || '';

    AppState.editPhotos = [...(r.photos || [])];
    renderPhotoGallery();
    document.getElementById('repair-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('repair-modal').classList.remove('active');
    AppState.editPhotos = [];
}

function clearModalForm() {
    ['field-reporter','field-floor','field-subject','field-location','field-date-reported'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('field-department').value = '';
    document.getElementById('field-channel').value = 'Line';
    document.getElementById('field-type').value = 'ไฟฟ้า';
    document.getElementById('field-status').value = 'รอดำเนินการ';
}

function saveRepair() {
    const reporter = document.getElementById('field-reporter').value.trim();
    const subject = document.getElementById('field-subject').value.trim();
    if (!subject) {
        showToast('กรุณากรอกเรื่อง', 'warning');
        return;
    }

    const item = {
        order: '',
        reporter,
        department: document.getElementById('field-department').value,
        channel: document.getElementById('field-channel').value,
        subject,
        floor: document.getElementById('field-floor').value.trim(),
        type: document.getElementById('field-type').value,
        dateReported: document.getElementById('field-date-reported').value,
        location: document.getElementById('field-location').value.trim(),
        status: document.getElementById('field-status').value,
        dateFixed: '',
        photos: [...AppState.editPhotos],
    };

    const editIdx = parseInt(document.getElementById('edit-index').value);

    if (editIdx >= 0 && editIdx < AppState.data.repairs.length) {
        item.order = AppState.data.repairs[editIdx].order;
        item.dateFixed = AppState.data.repairs[editIdx].dateFixed;
        if (item.status === 'เรียบร้อย' && !item.dateFixed) {
            const now = new Date();
            item.dateFixed = `${now.getFullYear() + 543}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        }
        AppState.data.repairs[editIdx] = item;
        showToast('แก้ไขงานซ่อมเรียบร้อย', 'success');
    } else {
        item.order = String((AppState.data.repairs.length || 0) + 1);
        AppState.data.repairs.push(item);
        showToast('เพิ่มงานซ่อมเรียบร้อย', 'success');
    }

    recomputeSummary();
    persistData();
    closeModal();
    populateFilterDropdowns();
    renderCurrentPage();
}

function confirmDelete(index) {
    AppState.confirmCallback = () => {
        AppState.data.repairs.splice(index, 1);
        // Re-number
        AppState.data.repairs.forEach((r, i) => r.order = String(i + 1));
        recomputeSummary();
        persistData();
        populateFilterDropdowns();
        renderCurrentPage();
        showToast('ลบงานซ่อมเรียบร้อย', 'success');
    };
    document.getElementById('confirm-dialog').classList.add('active');
}

function confirmAction() {
    if (AppState.confirmCallback) AppState.confirmCallback();
    AppState.confirmCallback = null;
    closeConfirm();
}

function closeConfirm() {
    document.getElementById('confirm-dialog').classList.remove('active');
}

// ========================================
// Photo Upload & Gallery
// ========================================
function handlePhotoUpload(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast(`${file.name} มีขนาดเกิน 5MB`, 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            AppState.editPhotos.push(ev.target.result);
            renderPhotoGallery();
        };
        reader.readAsDataURL(file);
    });
    e.target.value = ''; // reset
}

// Drag & Drop on upload zone
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const zone = document.getElementById('photo-upload-zone');
        if (!zone) return;
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => {
                if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    AppState.editPhotos.push(ev.target.result);
                    renderPhotoGallery();
                };
                reader.readAsDataURL(file);
            });
        });
    }, 500);
});

function renderPhotoGallery() {
    const el = document.getElementById('photo-gallery');
    if (!el) return;
    if (!AppState.editPhotos.length) {
        el.innerHTML = '';
        return;
    }
    el.innerHTML = AppState.editPhotos.map((p, i) => `
        <div class="photo-gallery-item">
            <img src="${p}" alt="photo ${i+1}">
            <button class="photo-remove" onclick="removeEditPhoto(${i})">×</button>
        </div>
    `).join('');
}

function removeEditPhoto(index) {
    AppState.editPhotos.splice(index, 1);
    renderPhotoGallery();
}

// Lightbox
function openLightbox(repairIndex, photoIndex) {
    const r = AppState.data.repairs[repairIndex];
    if (!r || !r.photos || !r.photos.length) return;
    AppState.lightboxPhotos = r.photos;
    AppState.lightboxIndex = photoIndex || 0;
    document.getElementById('lightbox-img').src = AppState.lightboxPhotos[AppState.lightboxIndex];
    document.getElementById('lightbox').classList.add('active');
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
}

function lightboxPrev() {
    AppState.lightboxIndex = (AppState.lightboxIndex - 1 + AppState.lightboxPhotos.length) % AppState.lightboxPhotos.length;
    document.getElementById('lightbox-img').src = AppState.lightboxPhotos[AppState.lightboxIndex];
}

function lightboxNext() {
    AppState.lightboxIndex = (AppState.lightboxIndex + 1) % AppState.lightboxPhotos.length;
    document.getElementById('lightbox-img').src = AppState.lightboxPhotos[AppState.lightboxIndex];
}

// ========================================
// Weekly Summary Page
// ========================================
function renderWeeklyPage() {
    const weekly = AppState.data.weekly || [];
    
    // Find months with actual data
    const monthsWithData = weekly.filter(w => w.weeks.some(wk => wk.reported > 0 || wk.completed > 0));
    const allMonths = weekly.length ? weekly : THAI_MONTHS.map(m => ({ month: m, weeks: [], cumulative: {} }));

    if (!AppState.selectedWeeklyMonth) {
        AppState.selectedWeeklyMonth = monthsWithData.length ? monthsWithData[monthsWithData.length - 1].month : THAI_MONTHS[0];
    }

    // Month tabs
    const tabsEl = document.getElementById('weekly-month-tabs');
    if (tabsEl) {
        tabsEl.innerHTML = allMonths.map(w => {
            const hasData = w.weeks.some(wk => wk.reported > 0 || wk.completed > 0);
            return `<button class="month-tab ${w.month === AppState.selectedWeeklyMonth ? 'active' : ''}" 
                onclick="selectWeeklyMonth('${w.month}')" ${!hasData ? 'style="opacity:0.4"' : ''}>${w.month}</button>`;
        }).join('');
    }

    // Find current month data
    const current = weekly.find(w => w.month === AppState.selectedWeeklyMonth) || { weeks: [], cumulative: {} };

    // Chart
    renderWeeklyChart(current);

    // Table
    const tbody = document.getElementById('weekly-tbody');
    if (tbody) {
        if (!current.weeks.length || !current.weeks.some(w => w.reported || w.completed)) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-tertiary);padding:24px">ยังไม่มีข้อมูลสำหรับเดือนนี้</td></tr>';
        } else {
            let html = current.weeks.map(w => `
                <tr>
                    <td><strong>สัปดาห์ ${w.week}</strong></td>
                    <td>${w.reported}</td>
                    <td>${w.completed}</td>
                    <td>${w.remaining}</td>
                </tr>
            `).join('');
            
            if (current.cumulative && (current.cumulative.reported || current.cumulative.completed)) {
                html += `<tr style="font-weight:700;background:var(--bg-table-header)">
                    <td>รวมสะสม</td>
                    <td>${current.cumulative.reported || 0}</td>
                    <td>${current.cumulative.completed || 0}</td>
                    <td>${current.cumulative.remaining || 0}</td>
                </tr>`;
            }
            tbody.innerHTML = html;
        }
    }
}

function selectWeeklyMonth(month) {
    AppState.selectedWeeklyMonth = month;
    renderWeeklyPage();
}

function renderWeeklyChart(monthData) {
    const ctx = document.getElementById('weekly-chart');
    if (!ctx) return;
    if (AppState.charts.weekly) AppState.charts.weekly.destroy();

    const weeks = monthData.weeks || [];
    const labels = weeks.map(w => `สัปดาห์ ${w.week}`);

    AppState.charts.weekly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'แจ้งซ่อม',
                    data: weeks.map(w => w.reported),
                    backgroundColor: CHART_COLORS.blueBg,
                    borderColor: CHART_COLORS.blue,
                    borderWidth: 1.5,
                    borderRadius: 8,
                    barPercentage: 0.6,
                },
                {
                    label: 'สำเร็จ',
                    data: weeks.map(w => w.completed),
                    backgroundColor: CHART_COLORS.greenBg,
                    borderColor: CHART_COLORS.green,
                    borderWidth: 1.5,
                    borderRadius: 8,
                    barPercentage: 0.6,
                },
                {
                    label: 'คงค้าง',
                    data: weeks.map(w => w.remaining),
                    type: 'line',
                    borderColor: CHART_COLORS.amber,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: CHART_COLORS.amber,
                    yAxisID: 'y',
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, padding: 16, font: { family: "'Noto Sans Thai'", size: 12 } } },
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: "'Noto Sans Thai'" } } },
                x: { grid: { display: false }, ticks: { font: { family: "'Noto Sans Thai'" } } },
            }
        }
    });
}

// ========================================
// Monthly Analysis Page
// ========================================
function renderAnalysisPage() {
    const analysis = AppState.data.analysis || [];
    if (!analysis.length) return;

    if (!AppState.selectedAnalysisMonth) {
        AppState.selectedAnalysisMonth = analysis[0].month;
    }

    // Month tabs
    const tabsEl = document.getElementById('analysis-month-tabs');
    if (tabsEl) {
        tabsEl.innerHTML = analysis.map(a =>
            `<button class="month-tab ${a.month === AppState.selectedAnalysisMonth ? 'active' : ''}"
                onclick="selectAnalysisMonth('${a.month}')">${a.month}</button>`
        ).join('');
    }

    const current = analysis.find(a => a.month === AppState.selectedAnalysisMonth) || analysis[0];

    // Type donut chart
    renderAnalysisTypeChart(current);
    // Department bar chart
    renderAnalysisDeptChart(current);
    // Department cards grid
    renderAnalysisDeptGrid(current);
}

function selectAnalysisMonth(month) {
    AppState.selectedAnalysisMonth = month;
    renderAnalysisPage();
}

function renderAnalysisTypeChart(monthData) {
    const ctx = document.getElementById('analysis-type-chart');
    if (!ctx) return;
    if (AppState.charts.analysisType) AppState.charts.analysisType.destroy();

    const types = monthData.repairTypes || [];
    if (!types.length) return;

    const colors = [CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.red,
                    CHART_COLORS.purple, '#06B6D4', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316'];

    AppState.charts.analysisType = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: types.map(t => t.type),
            datasets: [{
                data: types.map(t => t.count),
                backgroundColor: types.map((_, i) => colors[i % colors.length]),
                borderWidth: 0,
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 10, font: { family: "'Noto Sans Thai'", size: 11 } } }
            }
        }
    });
}

function renderAnalysisDeptChart(monthData) {
    const ctx = document.getElementById('analysis-dept-chart');
    if (!ctx) return;
    if (AppState.charts.analysisDept) AppState.charts.analysisDept.destroy();

    const depts = (monthData.departments || []).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
    if (!depts.length) return;

    AppState.charts.analysisDept = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: depts.map(d => d.name),
            datasets: [{
                label: 'จำนวนแจ้งซ่อม',
                data: depts.map(d => d.count),
                backgroundColor: CHART_COLORS.blueBg,
                borderColor: CHART_COLORS.blue,
                borderWidth: 1.5,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: "'Noto Sans Thai'" } } },
                y: { grid: { display: false }, ticks: { font: { family: "'Noto Sans Thai'", size: 11 } } },
            }
        }
    });
}

function renderAnalysisDeptGrid(monthData) {
    const el = document.getElementById('analysis-dept-grid');
    if (!el) return;
    const depts = (monthData.departments || []).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
    const maxCount = depts.length ? depts[0].count : 1;

    el.innerHTML = depts.map(d => `
        <div class="dept-card">
            <div class="dept-card-header">
                <span class="dept-name">${escHtml(d.name)}</span>
                <span class="dept-count">${d.count}</span>
            </div>
            <div class="dept-bar">
                <div class="dept-bar-fill" style="width:${Math.round((d.count / maxCount) * 100)}%"></div>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">
                ${Object.entries(d.types || {}).map(([type, count]) => 
                    `<span style="font-size:10px;padding:2px 6px;border-radius:99px;background:rgba(59,130,246,0.08);color:var(--blue-600)">${type}: ${count}</span>`
                ).join('')}
            </div>
        </div>
    `).join('');
}

// ========================================
// Google Sheets Login
// ========================================
function handleGoogleLogin() {
    const urlInput = document.getElementById('login-sheet-url');
    const url = urlInput ? urlInput.value.trim() : '';

    if (!url) {
        showToast('กรุณาวางลิงก์', 'warning');
        return;
    }

    // Check if it's a valid Sheet URL or Apps Script URL
    const isSheet = url.includes('/spreadsheets/d/');
    const isScript = url.includes('script.google.com');
    
    if (!isSheet && !isScript) {
        showToast('ลิงก์ไม่ถูกต้อง กรุณาวาง URL ของ Google Sheet หรือ Apps Script', 'error');
        return;
    }

    AppState.sheetUrl = url;
    let sheetId = 'AppsScript';
    if (isSheet) {
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) sheetId = match[1];
    }
    
    localStorage.setItem('mtc_sheet_id', sheetId);
    localStorage.setItem('mtc_sheet_url', url);

    showToast(`เชื่อมต่อ Sheet ID: ${sheetId.substring(0, 12)}...`, 'success');

    // Hide login, show app
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').style.display = 'flex';

    // Update sync status
    updateSyncStatus('live');
    renderCurrentPage();
}

function handleOfflineMode() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').style.display = 'flex';
    updateSyncStatus('offline');
    renderCurrentPage();
}

function updateSyncStatus(state) {
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-text');
    if (!dot || !text) return;

    dot.className = 'sync-dot ' + state;
    switch (state) {
        case 'live':
            text.textContent = 'เชื่อมต่อแล้ว';
            break;
        case 'syncing':
            text.textContent = 'กำลังซิงค์...';
            break;
        case 'offline':
        default:
            text.textContent = 'ออฟไลน์';
    }
}

// ========================================
// Toast Notifications
// ========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons-round toast-icon">${icons[type] || 'info'}</span>
        <span class="toast-message">${escHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ========================================
// Utilities
// ========================================
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========================================
// Manual Sync & Logout
// ========================================
async function manualSync() {
    if (!AppState.sheetUrl) {
        showToast('คุณอยู่ในโหมดออฟไลน์ กรุณาเข้าสู่ระบบเพื่อซิงค์ข้อมูล', 'warning');
        return;
    }
    
    updateSyncStatus('syncing');
    showToast('กำลังประมวลผลไฟล์ Excel และอัปโหลด...', 'info');
    
    try {
        // 1. Auto-upload to Google Apps Script (Auto-Sync)
        if (AppState.sheetUrl.includes('script.google.com')) {
            const payload = { repairs: AppState.data.repairs };
            fetch(AppState.sheetUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(() => {
                console.log('Upload request sent to Google Apps Script');
            }).catch(e => console.error('Upload Error:', e));
        }
        
        let workbook = new ExcelJS.Workbook();
        let isTemplateLoaded = false;
        
        try {
            // 2. Fetch the original template file
            const templateRes = await fetch('อัปเดตตารางงานซ่อมติดตามรายเดือน.xlsm');
            if (templateRes.ok) {
                const arrayBuffer = await templateRes.arrayBuffer();
                await workbook.xlsx.load(arrayBuffer);
                isTemplateLoaded = true;
            }
        } catch (e) {
            console.warn("Could not load template, falling back to new workbook", e);
        }
        
        // 4. Update or create "🛠️งานซ่อมตามแผน" sheet
        let plannedSheet = workbook.getWorksheet('🛠️งานซ่อมตามแผน');
        const plannedData = AppState.data.repairs.filter(r => r.sourceTable !== 'requests');
        
        if (!plannedSheet) {
            plannedSheet = workbook.addWorksheet('🛠️งานซ่อมตามแผน');
            plannedSheet.addRow(['Ref. ID', 'รายละเอียด', 'แผนก/ส่วนงาน', 'หมายเหตุ', 'ประเภท', 'สถานที่', 'ช่างซ่อม', 'สถานะ', 'วันที่ซ่อม']);
        }
        
        // Clear existing rows starting from row 2 (only if template loaded)
        if (isTemplateLoaded) {
            let rowIdx = 2;
            while(plannedSheet.getRow(rowIdx).hasValues) {
                plannedSheet.getRow(rowIdx).values = [];
                rowIdx++;
            }
        }
        
        // Insert new data
        plannedData.forEach((r, i) => {
            const row = plannedSheet.getRow(i + 2);
            row.getCell(1).value = r.refId || '';
            row.getCell(2).value = r.description || '';
            row.getCell(3).value = r.department || '';
            row.getCell(4).value = r.note || '';
            row.getCell(5).value = r.type || '';
            row.getCell(6).value = r.location || '';
            row.getCell(7).value = r.technician || '';
            
            if (isTemplateLoaded) {
                row.getCell(12).value = (r.status === 'เรียบร้อย' ? 'สำเร็จ' : r.status) || '';
                row.getCell(13).value = r.date || '';
                row.getCell(14).value = 1;
                row.getCell(15).value = 60;
                row.getCell(16).value = 0;
                row.getCell(17).value = r.actionTaken || '';
            } else {
                row.getCell(8).value = r.status || '';
                row.getCell(9).value = r.date || '';
            }
            row.commit();
        });
        
        // 5. Update or create "🔧แจ้งซ่อมเพิ่มเติม" sheet
        let reqSheet = workbook.getWorksheet('🔧แจ้งซ่อมเพิ่มเติม');
        const reqData = AppState.data.repairs.filter(r => r.sourceTable === 'requests');
        
        if (!reqSheet) {
            reqSheet = workbook.addWorksheet('🔧แจ้งซ่อมเพิ่มเติม');
            reqSheet.addRow(['Ref. ID', 'ผู้แจ้ง', 'แผนก', 'ช่องทาง', 'รายละเอียด', 'สถานที่', 'ประเภท', 'วันที่แจ้งซ่อม', 'สถานที่', 'สถานะ', 'วันที่เสร็จ']);
        }
        
        if (isTemplateLoaded) {
            let reqRowIdx = 2;
            while(reqSheet.getRow(reqRowIdx).hasValues) {
                reqSheet.getRow(reqRowIdx).values = [];
                reqRowIdx++;
            }
        }
        
        reqData.forEach((r, i) => {
            const row = reqSheet.getRow(i + 2);
            row.getCell(1).value = r.refId || '';
            row.getCell(2).value = r.reporter || '';
            row.getCell(3).value = r.department || '';
            row.getCell(4).value = 'Web App';
            row.getCell(5).value = r.description || '';
            row.getCell(6).value = r.department || '';
            row.getCell(7).value = r.type || '';
            row.getCell(8).value = r.date || '';
            row.getCell(9).value = r.location || '';
            row.getCell(10).value = r.status || '';
            row.getCell(11).value = r.date || '';
            row.commit();
        });
        
        // 6. Generate blob and download
        const outBuffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const ext = isTemplateLoaded ? '.xlsm' : '.xlsx';
        saveAs(blob, "MTC_Data_Export_" + new Date().getTime() + ext);
        
        updateSyncStatus('live');
        showToast('อัปโหลดข้อมูลและดาวน์โหลดไฟล์ Excel เรียบร้อย', 'success');
        
        // Icon animation
        const icon = document.querySelector('.sync-icon');
        if (icon) {
            icon.style.transform = 'rotate(360deg)';
            icon.style.transition = 'transform 0.5s ease';
            setTimeout(() => {
                icon.style.transform = 'none';
                icon.style.transition = 'none';
            }, 500);
        }
        
    } catch (error) {
        console.error("Sync Error:", error);
        showToast('เกิดข้อผิดพลาดในการส่งออกไฟล์', 'error');
        updateSyncStatus('live');
    }
}

function handleLogout() {
    // Clear credentials
    localStorage.removeItem('mtc_sheet_id');
    localStorage.removeItem('mtc_sheet_url');
    AppState.sheetUrl = '';
    
    // Switch to offline status
    updateSyncStatus('offline');
    
    // Hide app, show login
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').classList.remove('hidden');
    
    showToast('ออกจากระบบเรียบร้อย', 'info');
}
