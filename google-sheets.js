/**
 * MTC Maintenance Management System
 * Google Sheets Database Layer
 * 
 * Handles OAuth 2.0 authentication via Google Identity Services (GIS)
 * and CRUD operations via Google Sheets API v4.
 */

const GoogleSheetsDB = (() => {
    // ========================================
    // Configuration
    // ========================================
    const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
    const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

    let tokenClient = null;
    let gapiInited = false;
    let gisInited = false;
    let currentUser = null;
    let spreadsheetId = null;
    let clientId = null;
    let refreshInterval = null;
    let lastDataHash = null;
    let isConnected = false;

    // Sheet tab names mapped to AppState keys
    const SHEET_MAP = {
        planned: { tab: 'planned', headers: ['รหัสงานซ่อม', 'หัวข้อ', 'ชั้น', 'งานเพิ่มเติม', 'ประเภท', 'ตำแหน่ง', 'ผู้รับผิดชอบ', 'หมายเหตุ', 'ระดับ', 'ความสำคัญ', 'ความเร่งด่วน', 'สำเร็จ', 'วันที่เข้าแก้ไข', 'จำนวนคนที่ใช้', 'เวลาที่ใช้ (นาที)', 'ค่าใช้จ่าย (บาท)', 'วิธีแก้ไข', 'เดือน', 'สัปดาห์'] },
        requests: { tab: 'requests', headers: ['ลำดับ', 'ชื่อผู้แจ้งซ่อม', 'ฝ่าย', 'แจ้งผ่าน', 'เรื่อง', 'ชั้น', 'ประเภท', 'วันที่แจ้งซ่อม', 'ตำแหน่ง', 'สถานะ', 'วันที่เข้าแก้ไข'] },
        warehouse: { tab: 'warehouse', headers: ['ลำดับ', 'วันที่แจ้ง', 'งานของเดือน', 'ผู้แจ้ง', 'ฝ่าย', 'ชั้น', 'รายละเอียด', 'ประเภท', 'โอนย้ายซ่อมในเดือน', 'สถานะงาน', 'ความเร่งด่วน'] },
        monthly: { tab: 'monthly', headers: ['เดือน', 'งานทั้งหมด', 'เสร็จ', 'รอดำเนินการ', 'งานสะสม'] },
        leaks: { tab: 'leaks', headers: ['ลำดับ', 'ชั้น', 'ตำแหน่ง', 'รายละเอียด'] },
        curtains: { tab: 'curtains', headers: ['ลำดับ', 'อุปกรณ์', 'ตำแหน่ง', 'ชั้น', 'ปกติ', 'เสีย', 'รายละเอียด', 'ตำแหน่งห้อง'] },
        summary: { tab: 'summary', headers: ['งานทั้งหมด', 'สำเร็จ', 'รอดำเนินการ', 'กำลังดำเนินการ'] }
    };

    // ========================================
    // Callbacks (set by app.js)
    // ========================================
    let onAuthChange = null;
    let onDataRefresh = null;
    let onConnectionChange = null;
    let onError = null;

    // ========================================
    // Initialization
    // ========================================
    async function init(config) {
        clientId = config.clientId;
        spreadsheetId = config.spreadsheetId;
        onAuthChange = config.onAuthChange || (() => { });
        onDataRefresh = config.onDataRefresh || (() => { });
        onConnectionChange = config.onConnectionChange || (() => { });
        onError = config.onError || (() => { });

        const savedConfig = getSavedConfig();
        if (!clientId && savedConfig.clientId) clientId = savedConfig.clientId;
        if (!spreadsheetId && savedConfig.spreadsheetId) spreadsheetId = savedConfig.spreadsheetId;

        try {
            await initGapi();
            initGis();
            return true;
        } catch (err) {
            console.error('GoogleSheetsDB init failed:', err);
            onError('ไม่สามารถเริ่มต้น Google API ได้');
            return false;
        }
    }

    function initGapi() {
        return new Promise((resolve, reject) => {
            if (typeof gapi === 'undefined') {
                reject(new Error('GAPI not loaded'));
                return;
            }
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    gapiInited = true;
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    function initGis() {
        if (typeof google === 'undefined' || !google.accounts) {
            throw new Error('GIS not loaded');
        }
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: handleTokenResponse,
        });
        gisInited = true;
    }

    function handleTokenResponse(resp) {
        if (resp.error) {
            console.error('Token error:', resp);
            onError('การเข้าสู่ระบบล้มเหลว');
            onAuthChange(false, null);
            return;
        }
        fetchUserInfo();
    }

    async function fetchUserInfo() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${gapi.client.getToken().access_token}` }
            });
            const userInfo = await response.json();
            currentUser = {
                email: userInfo.email,
                name: userInfo.name || userInfo.email,
                picture: userInfo.picture || null
            };
            setConnected(true);
            onAuthChange(true, currentUser);
        } catch (err) {
            console.error('Failed to fetch user info:', err);
            currentUser = { email: 'user@google.com', name: 'User', picture: null };
            setConnected(true);
            onAuthChange(true, currentUser);
        }
    }

    // ========================================
    // Authentication
    // ========================================
    function signIn() {
        if (!gisInited || !clientId) {
            onError('กรุณาตั้งค่า Client ID ก่อน');
            return;
        }
        if (gapi.client.getToken() !== null) {
            google.accounts.oauth2.revoke(gapi.client.getToken().access_token);
            gapi.client.setToken(null);
        }
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }

    function signInSilent() {
        if (!gisInited || !clientId) return;
        if (gapi.client.getToken() !== null) {
            fetchUserInfo();
            return;
        }
        tokenClient.requestAccessToken({ prompt: '' });
    }

    function signOut() {
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken(null);
        }
        currentUser = null;
        setConnected(false);
        stopAutoRefresh();
        onAuthChange(false, null);
    }

    function isSignedIn() {
        return gapi.client.getToken() !== null && currentUser !== null;
    }

    // ========================================
    // Configuration Management
    // ========================================
    function setSpreadsheetId(id) {
        spreadsheetId = id;
        saveConfig();
    }

    function getSpreadsheetId() {
        return spreadsheetId;
    }

    function setClientId(id) {
        clientId = id;
        saveConfig();
        if (typeof google !== 'undefined' && google.accounts) {
            initGis();
        }
    }

    function getClientId() {
        return clientId;
    }

    function saveConfig() {
        localStorage.setItem('mtc_gsheet_config', JSON.stringify({
            clientId: clientId,
            spreadsheetId: spreadsheetId
        }));
    }

    function getSavedConfig() {
        try {
            return JSON.parse(localStorage.getItem('mtc_gsheet_config') || '{}');
        } catch {
            return {};
        }
    }

    function getCurrentUser() {
        return currentUser;
    }

    // ========================================
    // Connection State
    // ========================================
    function setConnected(state) {
        isConnected = state;
        onConnectionChange(state);
    }

    function getConnectionStatus() {
        return isConnected;
    }

    // ========================================
    // CRUD Operations
    // ========================================
    async function readSheet(sheetName) {
        if (!spreadsheetId) throw new Error('No spreadsheet ID configured');

        const mapping = SHEET_MAP[sheetName];
        if (!mapping) throw new Error(`Unknown sheet: ${sheetName}`);

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${mapping.tab}!A:Z`,
            });

            const rows = response.result.values || [];
            if (rows.length < 2) return [];

            const headers = rows[0];
            return rows.slice(1).map(row => {
                const obj = {};
                headers.forEach((h, i) => {
                    obj[h] = row[i] || '';
                });
                return obj;
            }).filter(obj => {
                return Object.values(obj).some(v => v !== '');
            });
        } catch (err) {
            console.error(`Failed to read sheet ${sheetName}:`, err);
            setConnected(false);
            throw err;
        }
    }

    async function readSummary() {
        if (!spreadsheetId) throw new Error('No spreadsheet ID configured');

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'summary!A:B',
            });

            const rows = response.result.values || [];
            const summary = {};
            rows.forEach(row => {
                if (row[0]) summary[row[0]] = row[1] || '0';
            });
            return summary;
        } catch (err) {
            console.error('Failed to read summary:', err);
            return { 'งานทั้งหมด': '0', 'สำเร็จ': '0', 'รอดำเนินการ': '0', 'กำลังดำเนินการ': '0' };
        }
    }

    async function loadAllData() {
        if (!isSignedIn()) throw new Error('Not signed in');
        if (!spreadsheetId) throw new Error('No spreadsheet ID configured');

        try {
            const [planned, requests, warehouse, monthly, leaks, curtains, summary] = await Promise.all([
                readSheet('planned'),
                readSheet('requests'),
                readSheet('warehouse'),
                readSheet('monthly'),
                readSheet('leaks'),
                readSheet('curtains'),
                readSummary()
            ]);

            const data = { planned, requests, warehouse, monthly, leaks, curtains, summary };

            const newHash = simpleHash(JSON.stringify(data));
            const hasChanged = lastDataHash !== null && newHash !== lastDataHash;
            lastDataHash = newHash;

            localStorage.setItem('mtc_data', JSON.stringify(data));
            setConnected(true);

            return { data, hasChanged };
        } catch (err) {
            console.error('Failed to load all data:', err);
            setConnected(false);
            throw err;
        }
    }

    async function appendRow(sheetName, item) {
        if (!spreadsheetId) throw new Error('No spreadsheet ID configured');

        const mapping = SHEET_MAP[sheetName];
        if (!mapping) throw new Error(`Unknown sheet: ${sheetName}`);

        const row = mapping.headers.map(h => item[h] || '');

        try {
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: spreadsheetId,
                range: `${mapping.tab}!A:Z`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [row]
                }
            });
            setConnected(true);
            return true;
        } catch (err) {
            console.error(`Failed to append to ${sheetName}:`, err);
            setConnected(false);
            throw err;
        }
    }

    async function updateRow(sheetName, rowIndex, item) {
        if (!spreadsheetId) throw new Error('No spreadsheet ID configured');

        const mapping = SHEET_MAP[sheetName];
        if (!mapping) throw new Error(`Unknown sheet: ${sheetName}`);

        const row = mapping.headers.map(h => item[h] || '');
        const sheetRow = rowIndex + 2;

        try {
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: `${mapping.tab}!A${sheetRow}:Z${sheetRow}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [row]
                }
            });
            setConnected(true);
            return true;
        } catch (err) {
            console.error(`Failed to update ${sheetName} row ${rowIndex}:`, err);
            setConnected(false);
            throw err;
        }
    }

    async function deleteRow(sheetName, rowIndex) {
        if (!spreadsheetId) throw new Error('No spreadsheet ID configured');

        const mapping = SHEET_MAP[sheetName];
        if (!mapping) throw new Error(`Unknown sheet: ${sheetName}`);

        try {
            const sheetMeta = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId,
                fields: 'sheets.properties'
            });

            const sheets = sheetMeta.result.sheets || [];
            const targetSheet = sheets.find(s => s.properties.title === mapping.tab);
            if (!targetSheet) throw new Error(`Sheet tab "${mapping.tab}" not found`);

            const sheetId = targetSheet.properties.sheetId;
            const sheetRow = rowIndex + 1;

            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: 'ROWS',
                                startIndex: sheetRow,
                                endIndex: sheetRow + 1
                            }
                        }
                    }]
                }
            });
            setConnected(true);
            return true;
        } catch (err) {
            console.error(`Failed to delete ${sheetName} row ${rowIndex}:`, err);
            setConnected(false);
            throw err;
        }
    }

    async function updateSummary(summary) {
        if (!spreadsheetId) return;

        try {
            const rows = Object.entries(summary).map(([key, value]) => [key, String(value)]);
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: 'summary!A1:B' + rows.length,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: rows
                }
            });
        } catch (err) {
            console.error('Failed to update summary:', err);
        }
    }

    async function writeFullSheet(sheetName, items) {
        if (!spreadsheetId) throw new Error('No spreadsheet ID configured');

        const mapping = SHEET_MAP[sheetName];
        if (!mapping) throw new Error(`Unknown sheet: ${sheetName}`);

        const rows = [mapping.headers];
        items.forEach(item => {
            rows.push(mapping.headers.map(h => item[h] || ''));
        });

        try {
            await gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: spreadsheetId,
                range: `${mapping.tab}!A:Z`,
            });

            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: `${mapping.tab}!A1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: rows
                }
            });
            setConnected(true);
            return true;
        } catch (err) {
            console.error(`Failed to write full sheet ${sheetName}:`, err);
            setConnected(false);
            throw err;
        }
    }

    // ========================================
    // Auto-Refresh (Polling)
    // ========================================
    function startAutoRefresh(intervalMs = 30000) {
        stopAutoRefresh();
        refreshInterval = setInterval(async () => {
            if (!isSignedIn()) return;
            try {
                const result = await loadAllData();
                if (result.hasChanged) {
                    onDataRefresh(result.data);
                }
            } catch (err) {
                console.warn('Auto-refresh failed:', err);
            }
        }, intervalMs);
    }

    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    // ========================================
    // Utility
    // ========================================
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    // ========================================
    // Public API
    // ========================================
    return {
        init,
        signIn,
        signInSilent,
        signOut,
        isSignedIn,
        getCurrentUser,
        getConnectionStatus,
        setSpreadsheetId,
        getSpreadsheetId,
        setClientId,
        getClientId,
        saveConfig,
        getSavedConfig,
        readSheet,
        readSummary,
        loadAllData,
        appendRow,
        updateRow,
        deleteRow,
        updateSummary,
        writeFullSheet,
        startAutoRefresh,
        stopAutoRefresh,
        SHEET_MAP
    };
})();
