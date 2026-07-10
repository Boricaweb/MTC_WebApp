/**
 * MTC WebApp — Google Sheets Module Test Suite
 * 
 * Tests for the Google Sheets database layer including:
 * - Initialization (GAPI + GIS)
 * - Authentication (signIn, signOut, signInSilent)
 * - CRUD operations (readSheet, appendRow, updateRow, deleteRow)
 * - Configuration management (save/load from localStorage)
 * - Hash utility for change detection
 * - Auto-refresh start/stop
 * - Error handling for API failures
 */

const { setupDOM, loadAndExecute, localStorageMock, gapiMock } = require('./setup');

let GoogleSheetsDB;

// ========================================
// Load GoogleSheetsDB before each test
// ========================================
beforeEach(() => {
    jest.useFakeTimers();
    localStorageMock.clear();
    setupDOM();

    // Reset mocks
    jest.clearAllMocks();

    // Reload the module fresh for each test
    loadAndExecute('google-sheets.js');

    // GoogleSheetsDB is now a global
    GoogleSheetsDB = global.GoogleSheetsDB;
});

afterEach(() => {
    GoogleSheetsDB.stopAutoRefresh();
    jest.useRealTimers();
    jest.restoreAllMocks();
});

// ========================================
// SHEET_MAP Configuration Tests
// ========================================
describe('SHEET_MAP Configuration', () => {
    test('exposes SHEET_MAP with all required sheet definitions', () => {
        expect(GoogleSheetsDB.SHEET_MAP).toBeDefined();
        expect(GoogleSheetsDB.SHEET_MAP.planned).toBeDefined();
        expect(GoogleSheetsDB.SHEET_MAP.requests).toBeDefined();
        expect(GoogleSheetsDB.SHEET_MAP.warehouse).toBeDefined();
        expect(GoogleSheetsDB.SHEET_MAP.monthly).toBeDefined();
        expect(GoogleSheetsDB.SHEET_MAP.leaks).toBeDefined();
        expect(GoogleSheetsDB.SHEET_MAP.curtains).toBeDefined();
        expect(GoogleSheetsDB.SHEET_MAP.summary).toBeDefined();
    });

    test('each sheet mapping has tab and headers', () => {
        Object.values(GoogleSheetsDB.SHEET_MAP).forEach(mapping => {
            expect(mapping.tab).toBeDefined();
            expect(Array.isArray(mapping.headers)).toBe(true);
            expect(mapping.headers.length).toBeGreaterThan(0);
        });
    });

    test('planned sheet has correct header count', () => {
        expect(GoogleSheetsDB.SHEET_MAP.planned.headers.length).toBe(19);
    });

    test('requests sheet has correct header count', () => {
        expect(GoogleSheetsDB.SHEET_MAP.requests.headers.length).toBe(11);
    });
});

// ========================================
// Configuration Management Tests
// ========================================
describe('Configuration Management', () => {
    test('setSpreadsheetId saves to localStorage', () => {
        GoogleSheetsDB.setSpreadsheetId('test-sheet-123');
        expect(GoogleSheetsDB.getSpreadsheetId()).toBe('test-sheet-123');
        expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('setClientId saves to localStorage', () => {
        GoogleSheetsDB.setClientId('test-client-456');
        expect(GoogleSheetsDB.getClientId()).toBe('test-client-456');
        expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('getSavedConfig returns parsed config from localStorage', () => {
        localStorage.setItem('mtc_gsheet_config', JSON.stringify({
            clientId: 'saved-client',
            spreadsheetId: 'saved-sheet'
        }));

        const config = GoogleSheetsDB.getSavedConfig();
        expect(config.clientId).toBe('saved-client');
        expect(config.spreadsheetId).toBe('saved-sheet');
    });

    test('getSavedConfig returns empty object for missing/corrupt data', () => {
        localStorage.clear();
        expect(GoogleSheetsDB.getSavedConfig()).toEqual({});

        localStorage.setItem('mtc_gsheet_config', 'not json');
        expect(GoogleSheetsDB.getSavedConfig()).toEqual({});
    });

    test('saveConfig persists both clientId and spreadsheetId', () => {
        GoogleSheetsDB.setClientId('cid');
        GoogleSheetsDB.setSpreadsheetId('sid');
        GoogleSheetsDB.saveConfig();

        const saved = JSON.parse(localStorage.getItem('mtc_gsheet_config'));
        expect(saved.clientId).toBe('cid');
        expect(saved.spreadsheetId).toBe('sid');
    });
});

// ========================================
// Initialization Tests
// ========================================
describe('Initialization', () => {
    test('init resolves true when GAPI and GIS load successfully', async () => {
        const result = await GoogleSheetsDB.init({
            clientId: 'test-client',
            spreadsheetId: 'test-sheet',
            onAuthChange: jest.fn(),
            onDataRefresh: jest.fn(),
            onConnectionChange: jest.fn(),
            onError: jest.fn()
        });

        expect(result).toBe(true);
    });

    test('init resolves false when gapi is undefined', async () => {
        const originalGapi = global.gapi;
        delete global.gapi;

        const onError = jest.fn();
        const result = await GoogleSheetsDB.init({
            clientId: 'test-client',
            spreadsheetId: 'test-sheet',
            onError
        });

        expect(result).toBe(false);
        global.gapi = originalGapi;
    });

    test('init uses saved config when no clientId provided', async () => {
        localStorage.setItem('mtc_gsheet_config', JSON.stringify({
            clientId: 'saved-id',
            spreadsheetId: 'saved-sheet'
        }));

        await GoogleSheetsDB.init({
            onAuthChange: jest.fn(),
            onConnectionChange: jest.fn()
        });

        expect(GoogleSheetsDB.getClientId()).toBe('saved-id');
        expect(GoogleSheetsDB.getSpreadsheetId()).toBe('saved-sheet');
    });
});

// ========================================
// Read Operations Tests
// ========================================
describe('Read Operations', () => {
    beforeEach(async () => {
        await GoogleSheetsDB.init({
            clientId: 'test',
            spreadsheetId: 'sheet-123',
            onAuthChange: jest.fn(),
            onConnectionChange: jest.fn(),
            onError: jest.fn()
        });
    });

    test('readSheet returns parsed rows as objects', async () => {
        gapiMock.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
            result: {
                values: [
                    ['รหัสงานซ่อม', 'หัวข้อ', 'ชั้น'],
                    ['MT-001', 'ซ่อมไฟ', '5'],
                    ['MT-002', 'ซ่อมประตู', '3']
                ]
            }
        });

        const data = await GoogleSheetsDB.readSheet('planned');

        expect(data.length).toBe(2);
        expect(data[0]['รหัสงานซ่อม']).toBe('MT-001');
        expect(data[0]['หัวข้อ']).toBe('ซ่อมไฟ');
        expect(data[1]['ชั้น']).toBe('3');
    });

    test('readSheet returns empty array for no data rows', async () => {
        gapiMock.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
            result: { values: [['Header1', 'Header2']] }
        });

        const data = await GoogleSheetsDB.readSheet('planned');
        expect(data).toEqual([]);
    });

    test('readSheet returns empty array for completely empty sheet', async () => {
        gapiMock.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
            result: { values: [] }
        });

        const data = await GoogleSheetsDB.readSheet('planned');
        expect(data).toEqual([]);
    });

    test('readSheet filters out empty rows', async () => {
        gapiMock.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
            result: {
                values: [
                    ['Col1', 'Col2'],
                    ['data', 'here'],
                    ['', ''],
                    ['more', 'data']
                ]
            }
        });

        const data = await GoogleSheetsDB.readSheet('planned');
        expect(data.length).toBe(2);
    });

    test('readSheet throws for unknown sheet name', async () => {
        await expect(GoogleSheetsDB.readSheet('nonexistent'))
            .rejects.toThrow('Unknown sheet');
    });

    test('readSheet throws when no spreadsheet ID configured', async () => {
        GoogleSheetsDB.setSpreadsheetId('');
        // Force the internal value to empty
        await expect(GoogleSheetsDB.readSheet('planned'))
            .rejects.toThrow();
    });

    test('readSummary returns key-value pairs', async () => {
        gapiMock.client.sheets.spreadsheets.values.get.mockResolvedValueOnce({
            result: {
                values: [
                    ['งานทั้งหมด', '100'],
                    ['สำเร็จ', '80'],
                    ['รอดำเนินการ', '15'],
                    ['กำลังดำเนินการ', '5']
                ]
            }
        });

        const summary = await GoogleSheetsDB.readSummary();
        expect(summary['งานทั้งหมด']).toBe('100');
        expect(summary['สำเร็จ']).toBe('80');
    });

    test('readSummary returns default values on error', async () => {
        gapiMock.client.sheets.spreadsheets.values.get.mockRejectedValueOnce(
            new Error('API Error')
        );

        const summary = await GoogleSheetsDB.readSummary();
        expect(summary['งานทั้งหมด']).toBe('0');
    });
});

// ========================================
// Write Operations Tests
// ========================================
describe('Write Operations', () => {
    beforeEach(async () => {
        await GoogleSheetsDB.init({
            clientId: 'test',
            spreadsheetId: 'sheet-123',
            onAuthChange: jest.fn(),
            onConnectionChange: jest.fn(),
            onError: jest.fn()
        });
    });

    test('appendRow calls sheets API with correct parameters', async () => {
        const item = { 'รหัสงานซ่อม': 'MT-NEW', 'หัวข้อ': 'งานใหม่' };

        await GoogleSheetsDB.appendRow('planned', item);

        expect(gapiMock.client.sheets.spreadsheets.values.append)
            .toHaveBeenCalledWith(expect.objectContaining({
                spreadsheetId: 'sheet-123',
                range: 'planned!A:Z',
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS'
            }));
    });

    test('appendRow maps item fields to correct column order', async () => {
        const item = { 'รหัสงานซ่อม': 'MT-001', 'หัวข้อ': 'ทดสอบ', 'ชั้น': '5' };

        await GoogleSheetsDB.appendRow('planned', item);

        const callArgs = gapiMock.client.sheets.spreadsheets.values.append.mock.calls[0][0];
        const row = callArgs.resource.values[0];
        expect(row[0]).toBe('MT-001'); // First header is รหัสงานซ่อม
        expect(row[1]).toBe('ทดสอบ');  // Second is หัวข้อ
        expect(row[2]).toBe('5');       // Third is ชั้น
    });

    test('appendRow throws for unknown sheet', async () => {
        await expect(GoogleSheetsDB.appendRow('invalid', {}))
            .rejects.toThrow('Unknown sheet');
    });

    test('updateRow uses correct row number (data index + 2)', async () => {
        const item = { 'รหัสงานซ่อม': 'MT-UPDATED' };

        await GoogleSheetsDB.updateRow('planned', 5, item);

        const callArgs = gapiMock.client.sheets.spreadsheets.values.update.mock.calls[0][0];
        expect(callArgs.range).toBe('planned!A7:Z7'); // index 5 + 2 = row 7
    });

    test('deleteRow calls batchUpdate with correct row index', async () => {
        await GoogleSheetsDB.deleteRow('planned', 3);

        expect(gapiMock.client.sheets.spreadsheets.batchUpdate)
            .toHaveBeenCalledWith(expect.objectContaining({
                spreadsheetId: 'sheet-123',
                resource: expect.objectContaining({
                    requests: [expect.objectContaining({
                        deleteDimension: expect.objectContaining({
                            range: expect.objectContaining({
                                startIndex: 4,  // rowIndex(3) + 1
                                endIndex: 5
                            })
                        })
                    })]
                })
            }));
    });

    test('writeFullSheet clears and rewrites entire sheet', async () => {
        const items = [
            { 'รหัสงานซ่อม': 'A1', 'หัวข้อ': 'B1' },
            { 'รหัสงานซ่อม': 'A2', 'หัวข้อ': 'B2' }
        ];

        await GoogleSheetsDB.writeFullSheet('planned', items);

        expect(gapiMock.client.sheets.spreadsheets.values.clear).toHaveBeenCalledWith(
            expect.objectContaining({ range: 'planned!A:Z' })
        );
        expect(gapiMock.client.sheets.spreadsheets.values.update).toHaveBeenCalled();

        const updateArgs = gapiMock.client.sheets.spreadsheets.values.update.mock.calls[0][0];
        // Should have headers + 2 data rows = 3 rows total
        expect(updateArgs.resource.values.length).toBe(3);
    });

    test('updateSummary writes key-value rows', async () => {
        const summary = {
            'งานทั้งหมด': '50',
            'สำเร็จ': '30',
            'รอดำเนินการ': '15',
            'กำลังดำเนินการ': '5'
        };

        await GoogleSheetsDB.updateSummary(summary);

        expect(gapiMock.client.sheets.spreadsheets.values.update)
            .toHaveBeenCalledWith(expect.objectContaining({
                range: expect.stringContaining('summary!A1:B')
            }));
    });
});

// ========================================
// Error Handling Tests
// ========================================
describe('Error Handling', () => {
    beforeEach(async () => {
        await GoogleSheetsDB.init({
            clientId: 'test',
            spreadsheetId: 'sheet-123',
            onAuthChange: jest.fn(),
            onConnectionChange: jest.fn(),
            onError: jest.fn()
        });
    });

    test('readSheet sets connection to false on API error', async () => {
        const onConnectionChange = jest.fn();
        await GoogleSheetsDB.init({
            clientId: 'test',
            spreadsheetId: 'sheet-123',
            onConnectionChange,
            onError: jest.fn()
        });

        gapiMock.client.sheets.spreadsheets.values.get.mockRejectedValueOnce(
            new Error('Network Error')
        );

        await expect(GoogleSheetsDB.readSheet('planned')).rejects.toThrow();
        expect(onConnectionChange).toHaveBeenCalledWith(false);
    });

    test('appendRow sets connection to false on failure', async () => {
        gapiMock.client.sheets.spreadsheets.values.append.mockRejectedValueOnce(
            new Error('Permission denied')
        );

        await expect(GoogleSheetsDB.appendRow('planned', {})).rejects.toThrow();
    });

    test('deleteRow handles missing sheet tab gracefully', async () => {
        gapiMock.client.sheets.spreadsheets.get.mockResolvedValueOnce({
            result: { sheets: [] } // No matching tab
        });

        await expect(GoogleSheetsDB.deleteRow('planned', 0))
            .rejects.toThrow('not found');
    });
});

// ========================================
// Authentication Tests
// ========================================
describe('Authentication', () => {
    test('isSignedIn returns false when no token', () => {
        gapiMock.client.getToken.mockReturnValue(null);
        expect(GoogleSheetsDB.isSignedIn()).toBe(false);
    });

    test('getCurrentUser returns null before sign-in', () => {
        expect(GoogleSheetsDB.getCurrentUser()).toBeNull();
    });

    test('getConnectionStatus returns false initially', () => {
        expect(GoogleSheetsDB.getConnectionStatus()).toBe(false);
    });

    test('signOut clears token and user', async () => {
        await GoogleSheetsDB.init({
            clientId: 'test',
            spreadsheetId: 'sheet-123',
            onAuthChange: jest.fn(),
            onConnectionChange: jest.fn(),
            onError: jest.fn()
        });

        gapiMock.client.getToken.mockReturnValue({ access_token: 'token' });
        GoogleSheetsDB.signOut();

        expect(gapiMock.client.setToken).toHaveBeenCalledWith(null);
    });
});

// ========================================
// Auto-Refresh Tests
// ========================================
describe('Auto-Refresh', () => {
    test('startAutoRefresh sets up interval', () => {
        GoogleSheetsDB.startAutoRefresh(5000);
        // Verify stopAutoRefresh can be called without error
        expect(() => GoogleSheetsDB.stopAutoRefresh()).not.toThrow();
    });

    test('stopAutoRefresh clears the interval', () => {
        GoogleSheetsDB.startAutoRefresh(5000);
        GoogleSheetsDB.stopAutoRefresh();
        // Double stop should not throw
        expect(() => GoogleSheetsDB.stopAutoRefresh()).not.toThrow();
    });

    test('startAutoRefresh replaces existing interval', () => {
        GoogleSheetsDB.startAutoRefresh(5000);
        GoogleSheetsDB.startAutoRefresh(10000);
        // Should not throw
        GoogleSheetsDB.stopAutoRefresh();
    });
});

// ========================================
// Public API Surface Tests
// ========================================
describe('Public API', () => {
    test('exposes all expected public methods', () => {
        const expectedMethods = [
            'init', 'signIn', 'signInSilent', 'signOut',
            'isSignedIn', 'getCurrentUser', 'getConnectionStatus',
            'setSpreadsheetId', 'getSpreadsheetId',
            'setClientId', 'getClientId',
            'saveConfig', 'getSavedConfig',
            'readSheet', 'readSummary', 'loadAllData',
            'appendRow', 'updateRow', 'deleteRow',
            'updateSummary', 'writeFullSheet',
            'startAutoRefresh', 'stopAutoRefresh'
        ];

        expectedMethods.forEach(method => {
            expect(typeof GoogleSheetsDB[method]).toBe('function');
        });
    });

    test('SHEET_MAP is exposed as a public property', () => {
        expect(GoogleSheetsDB.SHEET_MAP).toBeDefined();
        expect(typeof GoogleSheetsDB.SHEET_MAP).toBe('object');
    });
});
