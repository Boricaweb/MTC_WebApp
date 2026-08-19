import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/auth';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const repairs = await prisma.repair.findMany({
      orderBy: { id: 'asc' }
    });

    const workbook = new ExcelJS.Workbook();
    
    // Try to read the template file, fall back to creating a fresh workbook
    const templatePath = path.join(process.cwd(), 'public', 'อัปเดตตารางงานซ่อมติดตามรายเดือน.xlsm');
    let sheet: ExcelJS.Worksheet;

    if (fs.existsSync(templatePath)) {
      await workbook.xlsx.readFile(templatePath);
      const templateSheet = workbook.getWorksheet('ข้อมูลดิบ');
      if (templateSheet) {
        sheet = templateSheet;
        // Clear existing data (start from row 4)
        let rowIndex = 4;
        while (sheet.getRow(rowIndex).hasValues) {
          const row = sheet.getRow(rowIndex);
          for (let i = 1; i <= 20; i++) {
            row.getCell(i).value = null;
          }
          rowIndex++;
        }
      } else {
        sheet = workbook.addWorksheet('ข้อมูลดิบ');
        addHeaders(sheet);
      }
    } else {
      // No template — create a fresh worksheet with headers
      sheet = workbook.addWorksheet('ข้อมูลดิบ');
      addHeaders(sheet);
    }

    // Write data
    let currentRow = sheet.name === 'ข้อมูลดิบ' && fs.existsSync(templatePath) ? 4 : 2;
    for (const repair of repairs) {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = repair.order;
      row.getCell(2).value = repair.reporter;
      row.getCell(3).value = repair.department;
      row.getCell(4).value = repair.channel;
      row.getCell(5).value = repair.subject;
      row.getCell(6).value = repair.floor;
      row.getCell(7).value = repair.type;
      row.getCell(8).value = repair.dateReported;
      row.getCell(9).value = repair.location;
      row.getCell(10).value = repair.status;
      row.getCell(11).value = repair.dateFixed;
      row.commit();
      currentRow++;
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="MTC_Repairs_Export.xlsx"`
      }
    });

  } catch (error: any) {
    console.error('Failed to export Excel:', error);
    return NextResponse.json({ error: 'Failed to export Excel', details: error.message }, { status: 500 });
  }
}

function addHeaders(sheet: ExcelJS.Worksheet) {
  const headers = [
    'ลำดับ', 'ผู้แจ้ง', 'หน่วยงาน', 'ช่องทาง', 'รายการซ่อม',
    'ชั้น', 'ประเภท', 'วันที่แจ้ง', 'สถานที่', 'สถานะ', 'วันที่ซ่อมเสร็จ'
  ];
  const headerRow = sheet.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
  });
  headerRow.commit();
}
