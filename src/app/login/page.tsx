'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [url, setUrl] = useState('');
  const router = useRouter();

  const handleConnect = () => {
    if (!url) {
      alert('กรุณากรอก Web App URL');
      return;
    }
    localStorage.setItem('mtc_script_url', url);
    router.push('/');
  };

  const handleOffline = () => {
    router.push('/');
  };

  return (
    <div className="login-screen">
      <div className="login-bg-glow"></div>
      <div className="login-card">
        <div className="login-header">
          <span className="material-icons-round login-logo-icon">engineering</span>
          <h1 className="login-title">MTC</h1>
          <p className="login-subtitle">ระบบจัดการงานซ่อมบำรุง</p>
        </div>
        <div className="login-body">
          <div className="login-field">
            <label htmlFor="login-sheet-url">
              <span className="material-icons-round">link</span>
              ลิงก์ Google Apps Script (Web App URL)
            </label>
            <input 
              type="url" 
              id="login-sheet-url" 
              className="form-input" 
              placeholder="https://script.google.com/macros/s/xxxxx/exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
              วาง Web App URL ของ Apps Script ที่ติดตั้งไว้ เพื่อใช้ระบบอัปเดตอัตโนมัติ (Auto-Upload)
            </p>
          </div>
          <div className="login-actions">
            <button className="btn btn-primary" onClick={handleConnect}>
              <span className="material-icons-round">cloud_upload</span>
              เชื่อมต่อ Google Sheets
            </button>
            <div className="login-divider">หรือ</div>
            <button className="btn btn-ghost" onClick={handleOffline}>
              <span className="material-icons-round">wifi_off</span>
              ใช้งานแบบออฟไลน์
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
