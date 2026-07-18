const fs = require('fs');
const filePath = 'app.js';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /async function manualSync\(\) \{[\s\S]*?function handleLogout\(\) \{/m;

const newManualSync = `async function manualSync() {
    if (!AppState.sheetUrl) {
        showToast('คุณอยู่ในโหมดออฟไลน์ กรุณาเข้าสู่ระบบเพื่อซิงค์ข้อมูล', 'warning');
        return;
    }
    
    updateSyncStatus('syncing');
    showToast('กำลังประมวลผลไฟล์ Excel และอัปโหลด...', 'info');
    
    try {
        // 1. Auto-upload to Google Apps Script (Auto-Sync)
        if (AppState.sheetUrl.includes('script.google.com/macros/')) {
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
        const plannedData = AppState.data.repairs.filter(r => r.sourceTable === 'planned');
        
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

function handleLogout() {`;

content = content.replace(regex, newManualSync);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed manualSync in app.js');
