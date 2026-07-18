/**
 * Google Apps Script for MTC Web App Auto-Upload
 * 
 * วิธีการติดตั้ง:
 * 1. เปิด Google Sheet ของคุณ
 * 2. ไปที่เมนู ส่วนขยาย (Extensions) -> Apps Script
 * 3. ลบโค้ดเดิมทิ้ง แล้วคัดลอกโค้ดทั้งหมดนี้ไปวาง
 * 4. กดบันทึก (ไอคอนแผ่นดิสก์)
 * 5. กดปุ่ม การทำให้ใช้งานได้ (Deploy) -> การทำให้ใช้งานได้รายการใหม่ (New deployment)
 * 6. เลือกประเภท (Select type) เป็น "เว็บแอป" (Web app)
 * 7. ตั้งค่า:
 *    - สิทธิ์การเข้าถึง (Who has access): "ทุกคน" (Anyone)
 * 8. กด การทำให้ใช้งานได้ (Deploy) -> อาจจะต้องกดยืนยันสิทธิ์ (Authorize access)
 * 9. คัดลอก "URL ของเว็บแอป" (Web App URL) ที่ได้
 * 10. นำ URL นั้นไปวางในหน้า Login ของ MTC Web App
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var repairs = data.repairs || [];
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // แยกข้อมูลตาม sourceTable
    var plannedData = [];
    var requestsData = [];
    
    for (var i = 0; i < repairs.length; i++) {
      var r = repairs[i];
      if (r.sourceTable === 'planned') {
        // แผนกงานซ่อมตามแผน (ปรับคอลัมน์ตามหน้า Sheet จริง)
        plannedData.push([
          r.refId, r.description, r.department, r.note, r.type, 
          r.location || '', r.technician, '', '', '', '', 
          (r.status === 'เรียบร้อย' ? 'สำเร็จ' : r.status), 
          r.date, 1, 60, 0, r.actionTaken, '', ''
        ]);
      } else {
        // แจ้งซ่อมเพิ่มเติม
        requestsData.push([
          r.refId, r.reporter, r.department, 'Web App', r.description,
          r.department, r.type, r.date, r.location || '', r.status, r.date
        ]);
      }
    }
    
    // อัปเดต Sheet งานซ่อมตามแผน
    var plannedSheet = ss.getSheetByName('🛠️งานซ่อมตามแผน');
    if (plannedSheet && plannedData.length > 0) {
      // ลบข้อมูลเก่า (เริ่มที่แถว 2)
      var lastRow = plannedSheet.getLastRow();
      if (lastRow > 1) {
        plannedSheet.getRange(2, 1, lastRow - 1, plannedSheet.getLastColumn()).clearContent();
      }
      plannedSheet.getRange(2, 1, plannedData.length, plannedData[0].length).setValues(plannedData);
    }
    
    // อัปเดต Sheet แจ้งซ่อมเพิ่มเติม
    var reqSheet = ss.getSheetByName('🔧แจ้งซ่อมเพิ่มเติม');
    if (reqSheet && requestsData.length > 0) {
      // ลบข้อมูลเก่า
      var lastRowReq = reqSheet.getLastRow();
      if (lastRowReq > 1) {
        reqSheet.getRange(2, 1, lastRowReq - 1, reqSheet.getLastColumn()).clearContent();
      }
      reqSheet.getRange(2, 1, requestsData.length, requestsData[0].length).setValues(requestsData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data updated successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Support OPTIONS method for CORS
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
