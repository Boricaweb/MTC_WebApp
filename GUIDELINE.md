# MTC Web App v3.0 — Development Guideline

> This guideline is designed for any AI agent to follow correctly when building, maintaining, or extending this web application.

---

## 1. Project Overview

**MTC Maintenance Management System** — A local-first SPA (Single Page Application) for managing building maintenance work orders. Built with vanilla HTML/CSS/JS, no framework required.

### Key Requirements
- **Language**: All UI text in Thai (ภาษาไทย)
- **Theme**: Blue-white-yellow liquid glass / glassmorphism
- **Data Source**: Static `data.json` (extracted from Excel), with optional Google Sheets sync
- **Features**: CRUD, multi-photo upload, trend charts, real-time sync, search, filter, pagination

---

## 2. File Structure & Responsibilities

```
MTC_WebApp_project/
├── index.html          # Main HTML structure (sidebar, pages, modals, lightbox)
├── style.css           # Complete CSS theme (liquid glass, design tokens)
├── app.js              # Main application logic (rendering, CRUD, charts, state)
├── google-sheets.js    # Google Sheets API integration (optional sync layer)
├── data.json           # Static data extracted from Excel (source of truth)
├── chart.umd.min.js    # Chart.js 4.x UMD bundle (local, no CDN)
├── extract_data.py     # Python script to extract data from Excel → data.json
├── GUIDELINE.md        # This file — AI development guide
├── tests/
│   └── e2e.spec.js     # Playwright E2E test suite
└── *.xlsm              # Source Excel files (not served to browser)
```

### File Dependencies (load order in browser)
```
index.html
  ├── style.css (linked)
  ├── chart.umd.min.js (script, must load first)
  └── app.js (script, main logic)
```

---

## 3. Data Model (`data.json`)

The JSON file has 4 top-level keys:

### `repairs` (Array) — Main work order list
Each item:
```json
{
  "order": "1",
  "reporter": "Kan/อาคาร",
  "department": "อาคาร/รีเซป",
  "channel": "Line",
  "subject": "หลอดไฟไม่ติดห้องน้ำชาย",
  "floor": "G",
  "type": "ไฟฟ้า",
  "dateReported": "2569-04-17",
  "location": "ห้องน้ำชาย",
  "status": "เรียบร้อย",
  "dateFixed": "2569-04-17",
  "photos": []
}
```

**Status values**: `เรียบร้อย`, `รอดำเนินการ`, `กำลังดำเนินการ`, `โอนย้าย`
**Type values**: `ไฟฟ้า`, `สุขภัณฑ์`, `ประปา`, `ระบบแอร์`, `ม่าน`, `เก้าอี้`, `ประตู`, `อุปกรณ์`, `ขอบคิ้ว`, `อื่นๆ`
**Photos**: Array of Base64 data URLs

### `weekly` (Array) — Weekly tracking per month
```json
{
  "month": "มิถุนายน",
  "weeks": [
    { "week": 1, "reported": 7, "completed": 18, "remaining": 40 },
    ...
  ],
  "cumulative": { "reported": 48, "completed": 70, "remaining": 29 }
}
```

### `analysis` (Array) — Monthly department-level analysis
```json
{
  "month": "พฤษภาคม",
  "departments": [
    { "name": "อาคาร/รีเซป", "count": 43, "percentage": 86, "types": { "ไฟฟ้า": 9, ... } }
  ],
  "repairTypes": [ { "type": "ไฟฟ้า", "count": 10 } ],
  "totals": { "total": 50, "completed": 42, "inProgress": 0, "pending": 0, "transferred": 8 }
}
```

### `summary` (Object)
```json
{ "total": 206, "completed": 116, "pending": 56, "inProgress": 6, "transferred": 24 }
```

---

## 4. Application Architecture (`app.js`)

### Global State
```javascript
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
};
```

### Page Navigation
- Pages are `<section class="page-section" id="page-{name}">`
- Toggle `.active` class on sections + sidebar `.nav-item`
- Update `#page-title` text

### Chart Management (IMPORTANT)
- **Always destroy** existing chart before creating new: `AppState.charts[id]?.destroy()`
- Store instances: `AppState.charts[id] = new Chart(ctx, config)`
- Use Chart.js 4.x registered via UMD global `Chart`

### CRUD Flow
1. Add/Edit → modal with form → `saveRepair()` → update array → persist → re-render
2. Delete → confirm dialog → splice from array → persist → re-render
3. Persist to `localStorage` key `mtc_app_data`

### Photo Upload
- `FileReader.readAsDataURL()` to convert files to Base64
- Store in `AppState.editPhotos[]` during edit
- On save, copy to `repair.photos[]`
- Lightbox for full-screen view with prev/next navigation

---

## 5. Design System

### Glass Effect Pattern
```css
background: rgba(255, 255, 255, 0.55);
backdrop-filter: blur(18px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.45);
border-radius: 16px;
box-shadow: 0 8px 32px rgba(30, 64, 175, 0.08);
```

### Key Colors
- Primary: `#2563EB` (blue) / Accent: `#F59E0B` (amber)
- Success: `#22C55E` / Danger: `#EF4444`
- Text: `#1E293B` / Secondary: `#64748B`

---

## 6. Google Sheets Integration (Simplified Login)

### User Flow
1. App loads → shows login screen
2. User pastes **Google Sheet URL** only (e.g. `https://docs.google.com/spreadsheets/d/XXX/edit`)
3. App extracts Sheet ID from URL via regex
4. App uploads `data.json` data to the user's sheet
5. After that, app reads/writes directly to Google Sheets
6. "ใช้งานแบบออฟไลน์" button skips login entirely

### Sheet ID Extraction
```javascript
const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
const sheetId = match ? match[1] : null;
```

---

## 7. Pages

| Page ID | Thai Title | Content |
|---------|-----------|---------|
| `dashboard` | แดชบอร์ด | Stat cards, monthly trend chart, status donut, type bars, recent list |
| `repairs` | รายการงานซ่อม | Filterable/sortable table with CRUD + photos |
| `weekly` | สรุปรายสัปดาห์ | Month tabs, weekly bar+line chart, summary table |
| `analysis` | วิเคราะห์รายเดือน | Month tabs, type donut, dept bar chart, dept cards |

### External Link (Sidebar)
- **ระบบเบิกอะไหล่**: Opens Google Apps Script URL in new tab
- URL: `https://script.google.com/macros/s/AKfycby2dTKsM-pbyvQqqd3w0fU4hcSqPtoWrEK-WikE3fhYZ7Og9Jq5rxnqAntlCIUYw-ce/exec`

---

## 8. Data Extraction

### Source: Only VISIBLE sheets from `อัปเดตตารางงานซ่อมติดตามรายเดือน.xlsm`
| Sheet | Purpose |
|-------|---------|
| 🔧รายการงานซ่อมทั้งหมด | Main repair list |
| 📈ตัวอย่างตารางงาน | Weekly tracking |
| 📊วิเคราะห์งานรายเดือน | Department analysis |

```bash
python -X utf8 extract_data.py
```

---

## 9. Testing & Running

```bash
# Run locally
python -m http.server 8080

# E2E tests
npx playwright install --with-deps chromium
npx playwright test tests/e2e.spec.js
```

---

## 10. Deployment
Deploy to GitHub Pages: `index.html`, `style.css`, `app.js`, `data.json`, `chart.umd.min.js`
