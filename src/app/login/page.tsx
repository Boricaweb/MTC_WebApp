'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'view' | 'admin'>('view');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { loginAdmin, enterViewMode } = useAuth();

  const handleViewMode = () => {
    enterViewMode();
    router.push('/');
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setLoading(true);
    const success = await loginAdmin(username, password, sheetUrl);
    setLoading(false);
    if (success) {
      router.push('/');
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-bg-glow"></div>
      <div className="login-card" style={{ maxWidth: '460px' }}>
        <div className="login-header">
          <span className="material-icons-round login-logo-icon">engineering</span>
          <h1 className="login-title">MTC</h1>
          <p className="login-subtitle">ระบบจัดการงานซ่อมบำรุง</p>
        </div>

        {/* Mode Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid var(--border-primary, rgba(255,255,255,0.1))',
          marginBottom: '24px',
        }}>
          <button
            onClick={() => { setActiveTab('view'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'view' ? '2px solid var(--blue-500, #3b82f6)' : '2px solid transparent',
              color: activeTab === 'view' ? 'var(--blue-500, #3b82f6)' : 'var(--text-secondary, #9ca3af)',
              fontWeight: activeTab === 'view' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '20px' }}>visibility</span>
            View Mode
          </button>
          <button
            onClick={() => { setActiveTab('admin'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'admin' ? '2px solid var(--amber-500, #f59e0b)' : '2px solid transparent',
              color: activeTab === 'admin' ? 'var(--amber-500, #f59e0b)' : 'var(--text-secondary, #9ca3af)',
              fontWeight: activeTab === 'admin' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '20px' }}>admin_panel_settings</span>
            Admin Mode
          </button>
        </div>

        <div className="login-body">
          {activeTab === 'view' ? (
            /* ===== VIEW MODE ===== */
            <div>
              <div style={{
                background: 'var(--surface-secondary, rgba(255,255,255,0.05))',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span className="material-icons-round" style={{ fontSize: '28px', color: 'var(--blue-500, #3b82f6)' }}>info</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>โหมดดูข้อมูล</h3>
                </div>
                <ul style={{ fontSize: '13px', color: 'var(--text-secondary, #9ca3af)', lineHeight: '1.8', paddingLeft: '16px', margin: 0 }}>
                  <li>ดูแดชบอร์ด กราฟ และสถิติทั้งหมด</li>
                  <li>ดูรายการงานซ่อมทั้งหมด</li>
                  <li>ดูรายงานสรุปรายสัปดาห์และรายเดือน</li>
                  <li style={{ color: 'var(--red-400, #f87171)' }}>ไม่สามารถเพิ่ม แก้ไข หรือลบข้อมูลได้</li>
                  <li style={{ color: 'var(--red-400, #f87171)' }}>ไม่สามารถซิงค์หรือส่งออกข้อมูลได้</li>
                </ul>
              </div>
              <button className="btn btn-primary" onClick={handleViewMode} style={{ width: '100%' }}>
                <span className="material-icons-round">visibility</span>
                เข้าสู่โหมดดูข้อมูล
              </button>
            </div>
          ) : (
            /* ===== ADMIN MODE ===== */
            <form onSubmit={handleAdminLogin}>
              <div style={{
                background: 'var(--surface-secondary, rgba(255,255,255,0.05))',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span className="material-icons-round" style={{ fontSize: '28px', color: 'var(--amber-500, #f59e0b)' }}>shield</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #f3f4f6)' }}>โหมดผู้ดูแลระบบ</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary, #9ca3af)', margin: 0 }}>
                  สามารถเพิ่ม แก้ไข ลบข้อมูล, ซิงค์ Google Sheets และส่งออกไฟล์ได้
                </p>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  color: 'var(--red-400, #f87171)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span className="material-icons-round" style={{ fontSize: '18px' }}>error</span>
                  {error}
                </div>
              )}

              <div className="login-field" style={{ marginBottom: '16px' }}>
                <label htmlFor="admin-username">
                  <span className="material-icons-round">person</span>
                  ชื่อผู้ใช้ (Username)
                </label>
                <input
                  type="text"
                  id="admin-username"
                  className="form-input"
                  placeholder="กรอกชื่อผู้ใช้"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="login-field" style={{ marginBottom: '16px' }}>
                <label htmlFor="admin-password">
                  <span className="material-icons-round">lock</span>
                  รหัสผ่าน (Password)
                </label>
                <input
                  type="password"
                  id="admin-password"
                  className="form-input"
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="login-field" style={{ marginBottom: '20px' }}>
                <label htmlFor="admin-sheet-url">
                  <span className="material-icons-round">link</span>
                  Google Sheet URL (สำหรับซิงค์ข้อมูล)
                </label>
                <input
                  type="url"
                  id="admin-sheet-url"
                  className="form-input"
                  placeholder="https://script.google.com/macros/s/xxxxx/exec"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                  ใส่ Web App URL ของ Apps Script เพื่อซิงค์ข้อมูลไป Google Sheets (ไม่บังคับ)
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', background: 'var(--amber-500, #f59e0b)', borderColor: 'var(--amber-500, #f59e0b)' }}
                disabled={loading}
              >
                {loading ? (
                  <div className="loading-spinner" style={{ width: '20px', height: '20px' }}></div>
                ) : (
                  <>
                    <span className="material-icons-round">login</span>
                    เข้าสู่ระบบ Admin
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
