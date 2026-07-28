'use client';

import React, { useState, useEffect } from 'react';
import { formatDateThai } from '@/lib/utils';
import { useToast } from './Toast';

export default function Topbar({ title = 'ระบบจัดการงานซ่อมบำรุง' }: { title?: string }) {
  const [currentDate, setCurrentDate] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear() + 543;
    setCurrentDate(formatDateThai(`${y}-${m}-${d}`));
  }, []);

  const handleSync = async () => {
    const scriptUrl = localStorage.getItem('mtc_script_url');
    if (!scriptUrl) {
      showToast('กรุณาตั้งค่า Web App URL ในหน้าล็อกอิน', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scriptUrl })
      });
      
      if (!res.ok) throw new Error('Sync failed');
      showToast('ซิงค์ข้อมูลกับ Google Sheets สำเร็จ', 'success');
    } catch (error) {
      console.error(error);
      showToast('ไม่สามารถซิงค์ข้อมูลได้', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    window.location.href = '/api/export';
  };

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button id="mobile-menu-btn" className="mobile-menu-btn">
          <span className="material-icons-round">menu</span>
        </button>
        <h1 id="page-title" className="page-title">{title}</h1>
      </div>
      
      <div className="top-bar-right">
        <div className="date-display">
          <span className="material-icons-round">calendar_today</span>
          <span id="current-date">{currentDate}</span>
        </div>
        
        <div className="action-buttons">
          <button 
            id="sync-btn" 
            className={`btn-icon ${isSyncing ? 'syncing' : ''}`} 
            title="ซิงค์ข้อมูลไป Google Sheets"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <span className="material-icons-round">sync</span>
          </button>
          
          <button 
            id="export-btn" 
            className="btn-icon" 
            title="ดาวน์โหลดไฟล์ Excel"
            onClick={handleExport}
          >
            <span className="material-icons-round">download</span>
          </button>
        </div>
      </div>
    </header>
  );
}
