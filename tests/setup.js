/**
 * Jest Test Setup
 * 
 * Mocks browser APIs and Google API globals needed by the MTC WebApp.
 * This runs before each test file to provide a consistent test environment.
 */

// ========================================
// localStorage Mock
// ========================================
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = String(value);
        }),
        removeItem: jest.fn(key => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: jest.fn(idx => Object.keys(store)[idx] || null)
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// ========================================
// fetch Mock
// ========================================
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
            planned: [],
            requests: [],
            warehouse: [],
            monthly: [],
            leaks: [],
            curtains: [],
            summary: {}
        })
    })
);

// ========================================
// Google API (gapi) Mock
// ========================================
const gapiMock = {
    load: jest.fn((api, callback) => {
        if (callback) callback();
    }),
    client: {
        init: jest.fn(() => Promise.resolve()),
        getToken: jest.fn(() => ({ access_token: 'mock-access-token' })),
        setToken: jest.fn(),
        sheets: {
            spreadsheets: {
                values: {
                    get: jest.fn(() => Promise.resolve({
                        result: { values: [['Header1', 'Header2'], ['val1', 'val2']] }
                    })),
                    append: jest.fn(() => Promise.resolve()),
                    update: jest.fn(() => Promise.resolve()),
                    clear: jest.fn(() => Promise.resolve())
                },
                get: jest.fn(() => Promise.resolve({
                    result: {
                        sheets: [
                            { properties: { title: 'planned', sheetId: 0 } },
                            { properties: { title: 'requests', sheetId: 1 } },
                            { properties: { title: 'warehouse', sheetId: 2 } },
                            { properties: { title: 'monthly', sheetId: 3 } },
                            { properties: { title: 'leaks', sheetId: 4 } },
                            { properties: { title: 'curtains', sheetId: 5 } },
                            { properties: { title: 'summary', sheetId: 6 } }
                        ]
                    }
                })),
                batchUpdate: jest.fn(() => Promise.resolve())
            }
        }
    }
};

global.gapi = gapiMock;

// ========================================
// Google Identity Services (GIS) Mock
// ========================================
const gisMock = {
    accounts: {
        oauth2: {
            initTokenClient: jest.fn((config) => ({
                requestAccessToken: jest.fn((options) => {
                    // Simulate successful token response
                    if (config.callback) {
                        config.callback({ access_token: 'mock-token' });
                    }
                })
            })),
            revoke: jest.fn()
        }
    }
};

global.google = gisMock;

// ========================================
// Chart.js Mock
// ========================================
global.Chart = jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    data: { labels: [], datasets: [] },
    options: {}
}));

// ========================================
// DOM Setup — Minimal HTML structure
// ========================================
function setupDOM() {
    document.body.innerHTML = `
        <!-- Login Screen -->
        <div id="login-screen" class="login-screen">
            <div class="login-card">
                <input type="text" id="login-client-id" value="test-client-id">
                <input type="text" id="login-sheet-id" value="test-sheet-id">
                <input type="checkbox" id="login-remember" checked>
                <button id="login-google-btn"></button>
                <button id="login-offline-btn"></button>
            </div>
        </div>

        <!-- Loading Screen -->
        <div id="loading-screen" class="loading-screen hidden">
            <div class="loading-content">
                <div class="loading-bar-container">
                    <div class="loading-bar"></div>
                </div>
                <p class="loading-status" id="loading-status">กำลังโหลดข้อมูล...</p>
                <div class="loading-actions" id="loading-actions">
                    <button class="btn btn-primary" id="loading-retry-btn">ลองใหม่</button>
                    <button class="btn btn-ghost" id="loading-offline-btn">ใช้งานออฟไลน์</button>
                </div>
            </div>
        </div>

        <!-- Main App -->
        <div id="app" class="app hidden">
            <aside id="sidebar" class="sidebar">
                <button id="sidebar-toggle"></button>
                <nav class="sidebar-nav">
                    <a href="#" class="nav-item active" data-page="dashboard" id="nav-dashboard">
                        <span class="nav-label">แดชบอร์ด</span>
                    </a>
                    <a href="#" class="nav-item" data-page="planned" id="nav-planned">
                        <span class="nav-label">งานซ่อมตามแผน</span>
                    </a>
                    <a href="#" class="nav-item" data-page="requests" id="nav-requests">
                        <span class="nav-label">แจ้งซ่อมเพิ่มเติม</span>
                    </a>
                    <a href="#" class="nav-item" data-page="warehouse" id="nav-warehouse">
                        <span class="nav-label">คลังงานซ่อม</span>
                    </a>
                    <a href="#" class="nav-item" data-page="leaks" id="nav-leaks">
                        <span class="nav-label">ตำแหน่งน้ำรั่ว</span>
                    </a>
                    <a href="#" class="nav-item" data-page="curtains" id="nav-curtains">
                        <span class="nav-label">เช็คม่าน</span>
                    </a>
                    <a href="#" class="nav-item" data-page="monthly" id="nav-monthly">
                        <span class="nav-label">สรุปรายเดือน</span>
                    </a>
                </nav>
                <div class="sidebar-settings" id="sidebar-settings">
                    <img id="user-avatar" class="user-avatar" src="" alt="">
                    <span class="user-name" id="user-name">ไม่ได้เข้าสู่ระบบ</span>
                    <span class="user-email" id="user-email"></span>
                    <span class="connection-dot offline" id="connection-dot"></span>
                    <span class="connection-text" id="connection-text">ออฟไลน์</span>
                    <button id="btn-change-db"></button>
                    <button id="btn-switch-account"></button>
                    <button id="btn-sign-out"></button>
                </div>
            </aside>

            <main id="main-content" class="main-content">
                <header class="topbar">
                    <button id="mobile-menu-btn"></button>
                    <h2 id="page-title" class="page-title">แดชบอร์ด</h2>
                    <span class="sync-dot" id="sync-dot"></span>
                    <span class="sync-text" id="sync-text">ออฟไลน์</span>
                    <input type="text" id="global-search" placeholder="ค้นหา..." autocomplete="off">
                    <span id="current-date"></span>
                </header>

                <div id="page-content" class="page-content">
                    <section id="page-dashboard" class="page active">
                        <div class="stats-grid" id="stats-grid"></div>
                        <div id="recent-activity"></div>
                        <canvas id="monthly-chart"></canvas>
                        <canvas id="status-chart"></canvas>
                        <canvas id="type-chart"></canvas>
                    </section>
                    <section id="page-planned" class="page">
                        <select id="planned-filter-status" class="filter-select">
                            <option value="">สถานะทั้งหมด</option>
                        </select>
                        <select id="planned-filter-type" class="filter-select">
                            <option value="">ประเภททั้งหมด</option>
                        </select>
                        <select id="planned-filter-month" class="filter-select">
                            <option value="">เดือนทั้งหมด</option>
                        </select>
                        <button id="add-planned-btn"></button>
                        <tbody id="planned-tbody"></tbody>
                        <div id="planned-pagination"></div>
                    </section>
                    <section id="page-requests" class="page">
                        <select id="requests-filter-status" class="filter-select">
                            <option value="">สถานะทั้งหมด</option>
                        </select>
                        <button id="add-request-btn"></button>
                        <tbody id="requests-tbody"></tbody>
                        <div id="requests-pagination"></div>
                    </section>
                    <section id="page-warehouse" class="page">
                        <select id="warehouse-filter-status" class="filter-select">
                            <option value="">สถานะทั้งหมด</option>
                        </select>
                        <select id="warehouse-filter-urgency" class="filter-select">
                            <option value="">ความเร่งด่วนทั้งหมด</option>
                        </select>
                        <button id="add-warehouse-btn"></button>
                        <tbody id="warehouse-tbody"></tbody>
                        <div id="warehouse-pagination"></div>
                    </section>
                    <section id="page-leaks" class="page">
                        <button id="add-leak-btn"></button>
                        <div class="cards-grid" id="leaks-grid"></div>
                    </section>
                    <section id="page-curtains" class="page">
                        <select id="curtains-filter-status" class="filter-select">
                            <option value="">สถานะทั้งหมด</option>
                        </select>
                        <button id="add-curtain-btn"></button>
                        <tbody id="curtains-tbody"></tbody>
                    </section>
                    <section id="page-monthly" class="page">
                        <canvas id="monthly-detail-chart"></canvas>
                        <tbody id="monthly-tbody"></tbody>
                    </section>
                </div>
            </main>
        </div>

        <!-- Modal Overlay -->
        <div id="modal-overlay" class="modal-overlay hidden">
            <div id="modal" class="modal">
                <h3 id="modal-title">เพิ่มข้อมูล</h3>
                <button id="modal-close"></button>
                <div class="modal-body" id="modal-body"></div>
                <button id="modal-cancel-btn">ยกเลิก</button>
                <button id="modal-save-btn">บันทึก</button>
            </div>
        </div>

        <!-- Confirm Dialog -->
        <div id="confirm-overlay" class="modal-overlay hidden">
            <p id="confirm-message"></p>
            <button id="confirm-close"></button>
            <button id="confirm-cancel-btn">ยกเลิก</button>
            <button id="confirm-ok-btn">ลบ</button>
        </div>

        <!-- Move Modal -->
        <div id="move-overlay" class="modal-overlay hidden">
            <p id="move-info"></p>
            <select id="move-destination"></select>
            <button id="move-close"></button>
            <button id="move-cancel-btn">ยกเลิก</button>
            <button id="move-ok-btn">ย้ายงาน</button>
        </div>

        <!-- Change DB Modal -->
        <div id="changedb-overlay" class="modal-overlay hidden">
            <input type="text" id="changedb-sheet-id">
            <button id="changedb-close"></button>
            <button id="changedb-cancel-btn">ยกเลิก</button>
            <button id="changedb-ok-btn">เปลี่ยน</button>
        </div>

        <!-- Toast Container -->
        <div id="toast-container" class="toast-container"></div>
    `;
}

// ========================================
// Helper to load and execute source files in global scope
// ========================================
function loadAndExecute(filePath) {
    const fs = require('fs');
    const path = require('path');
    let code = fs.readFileSync(path.resolve(__dirname, '..', filePath), 'utf-8');
    // Convert const/let to var so declarations become global
    // (indirect eval makes var/function declarations global, but const/let remain block-scoped)
    code = code.replace(/\bconst\s+/g, 'var ');
    code = code.replace(/\blet\s+/g, 'var ');
    // Use indirect eval to execute in global scope (has access to jsdom's document, window, etc.)
    (0, eval)(code);
}

// ========================================
// Exports
// ========================================
module.exports = {
    setupDOM,
    loadAndExecute,
    gapiMock,
    gisMock,
    localStorageMock
};
