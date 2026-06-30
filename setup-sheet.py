"""
MTC Maintenance System - Google Sheet Migration Script
Populates a Google Sheet from data.json

Usage:
1. pip install gspread google-auth
2. Create a service account in Google Cloud Console
3. Download the service account JSON key file
4. Share your Google Sheet with the service account email
5. Run: python setup-sheet.py --key service_account.json --sheet-id YOUR_SPREADSHEET_ID

Or use OAuth (opens browser for login):
   python setup-sheet.py --sheet-id YOUR_SPREADSHEET_ID
"""

import json
import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description='Populate Google Sheet from data.json')
    parser.add_argument('--key', help='Path to service account JSON key file (optional, uses OAuth if not provided)')
    parser.add_argument('--sheet-id', required=True, help='Google Spreadsheet ID')
    parser.add_argument('--data', default='data.json', help='Path to data.json file (default: data.json)')
    args = parser.parse_args()

    try:
        import gspread
    except ImportError:
        print("Error: gspread not installed. Run: pip install gspread google-auth")
        sys.exit(1)

    # Load data
    print(f"Loading data from {args.data}...")
    with open(args.data, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Authenticate
    if args.key:
        from google.oauth2.service_account import Credentials
        scopes = ['https://www.googleapis.com/auth/spreadsheets']
        creds = Credentials.from_service_account_file(args.key, scopes=scopes)
        gc = gspread.authorize(creds)
    else:
        gc = gspread.oauth()

    # Open spreadsheet
    print(f"Opening spreadsheet {args.sheet_id}...")
    spreadsheet = gc.open_by_key(args.sheet_id)

    # Define sheet structure
    sheets_config = {
        'planned': {
            'headers': ['รหัสงานซ่อม','หัวข้อ','ชั้น','งานเพิ่มเติม','ประเภท','ตำแหน่ง','ผู้รับผิดชอบ','หมายเหตุ','ระดับ','ความสำคัญ','ความเร่งด่วน','สำเร็จ','วันที่เข้าแก้ไข','จำนวนคนที่ใช้','เวลาที่ใช้ (นาที)','ค่าใช้จ่าย (บาท)','วิธีแก้ไข','เดือน','สัปดาห์'],
            'data_key': 'planned'
        },
        'requests': {
            'headers': ['ลำดับ','ชื่อผู้แจ้งซ่อม','ฝ่าย','แจ้งผ่าน','เรื่อง','ชั้น','ประเภท','วันที่แจ้งซ่อม','ตำแหน่ง','สถานะ','วันที่เข้าแก้ไข'],
            'data_key': 'requests'
        },
        'warehouse': {
            'headers': ['ลำดับ','วันที่แจ้ง','งานของเดือน','ผู้แจ้ง','ฝ่าย','ชั้น','รายละเอียด','ประเภท','โอนย้ายซ่อมในเดือน','สถานะงาน','ความเร่งด่วน'],
            'data_key': 'warehouse'
        },
        'monthly': {
            'headers': ['เดือน','งานทั้งหมด','เสร็จ','รอดำเนินการ','งานสะสม'],
            'data_key': 'monthly'
        },
        'leaks': {
            'headers': ['ลำดับ','ชั้น','ตำแหน่ง','รายละเอียด'],
            'data_key': 'leaks'
        },
        'curtains': {
            'headers': ['ลำดับ','อุปกรณ์','ตำแหน่ง','ชั้น','ปกติ','เสีย','รายละเอียด','ตำแหน่งห้อง'],
            'data_key': 'curtains'
        },
    }

    for sheet_name, config in sheets_config.items():
        print(f"\nProcessing sheet: {sheet_name}...")
        
        # Get or create worksheet
        try:
            worksheet = spreadsheet.worksheet(sheet_name)
            print(f"  Found existing worksheet '{sheet_name}', clearing...")
            worksheet.clear()
        except gspread.WorksheetNotFound:
            print(f"  Creating new worksheet '{sheet_name}'...")
            worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=1000, cols=len(config['headers']))

        # Write headers
        headers = config['headers']
        worksheet.update('A1', [headers])
        
        # Write data
        items = data.get(config['data_key'], [])
        if items:
            rows = []
            for item in items:
                row = [str(item.get(h, '')) for h in headers]
                rows.append(row)
            
            if rows:
                cell_range = f'A2:{chr(64 + len(headers))}{len(rows) + 1}'
                worksheet.update(cell_range, rows, value_input_option='USER_ENTERED')
                print(f"  Written {len(rows)} rows")
        else:
            print(f"  No data for this sheet")

    # Create summary sheet
    print("\nProcessing sheet: summary...")
    try:
        summary_ws = spreadsheet.worksheet('summary')
        summary_ws.clear()
    except gspread.WorksheetNotFound:
        summary_ws = spreadsheet.add_worksheet(title='summary', rows=10, cols=2)

    summary = data.get('summary', {})
    if isinstance(summary, dict):
        summary_rows = [[k, str(v)] for k, v in summary.items()]
    else:
        # Calculate from planned data
        planned = data.get('planned', [])
        total = len(planned)
        done = sum(1 for p in planned if 'เสร็จ' in (p.get('สำเร็จ', '')))
        pending = sum(1 for p in planned if 'รอ' in (p.get('สำเร็จ', '')))
        in_progress = sum(1 for p in planned if 'กำลัง' in (p.get('สำเร็จ', '')))
        summary_rows = [
            ['งานทั้งหมด', str(total)],
            ['สำเร็จ', str(done)],
            ['รอดำเนินการ', str(pending)],
            ['กำลังดำเนินการ', str(in_progress)]
        ]
    
    if summary_rows:
        summary_ws.update('A1', summary_rows)
        print(f"  Written {len(summary_rows)} summary entries")

    # Remove default Sheet1 if it exists
    try:
        default_sheet = spreadsheet.worksheet('Sheet1')
        spreadsheet.del_worksheet(default_sheet)
        print("\nRemoved default 'Sheet1'")
    except (gspread.WorksheetNotFound, gspread.exceptions.APIError):
        pass

    print(f"\n✅ Migration complete!")
    print(f"Spreadsheet ID: {args.sheet_id}")
    print(f"URL: https://docs.google.com/spreadsheets/d/{args.sheet_id}/edit")

if __name__ == '__main__':
    main()
