'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, logout } = useAuth();

  const navItems = [
    { name: 'แดชบอร์ด', path: '/', icon: 'dashboard', id: 'nav-dashboard' },
    { name: 'รายการซ่อม', path: '/repairs', icon: 'build', id: 'nav-repairs' },
    { name: 'สรุปรายสัปดาห์', path: '/weekly', icon: 'view_week', id: 'nav-weekly' },
    { name: 'วิเคราะห์รายเดือน', path: '/analysis', icon: 'analytics', id: 'nav-analysis' }
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <span className="material-icons-round sidebar-logo-icon">engineering</span>
        <div className="sidebar-logo-text">
          <span className="logo-title">MTC</span>
          <span className="logo-sub">Maintenance System</span>
        </div>
      </div>

      {/* Mode Badge */}
      <div style={{
        margin: '0 16px 12px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: isAdmin ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
        border: isAdmin ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: isAdmin ? '#f59e0b' : '#3b82f6',
      }}>
        <span className="material-icons-round" style={{ fontSize: '16px' }}>
          {isAdmin ? 'admin_panel_settings' : 'visibility'}
        </span>
        {isAdmin ? 'Admin Mode' : 'View Mode'}
      </div>

      <div className="sidebar-nav">
        {navItems.map(item => (
          <Link
            key={item.id}
            href={item.path}
            id={item.id}
            className={`nav-item ${pathname === item.path ? 'active' : ''}`}
          >
            <span className="material-icons-round">{item.icon}</span>
            <span className="nav-label">{item.name}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <a 
          href="https://script.google.com/macros/s/AKfycby2dTKsM-pbyvQqqd3w0fU4hcSqPtoWrEK-WikE3fhYZ7Og9Jq5rxnqAntlCIUYw-ce/exec" 
          target="_blank" 
          rel="noopener noreferrer" 
          id="nav-parts" 
          className="nav-item external-link"
        >
          <span className="material-icons-round">inventory_2</span>
          <span className="nav-label">ระบบเบิกอะไหล่</span>
          <span className="material-icons-round external-icon">open_in_new</span>
        </a>
        
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            fontSize: '14px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
          }}
          id="nav-logout"
        >
          <span className="material-icons-round">{isAdmin ? 'logout' : 'swap_horiz'}</span>
          <span className="nav-label">{isAdmin ? 'ออกจากระบบ' : 'เปลี่ยนโหมด'}</span>
        </button>
      </div>
    </nav>
  );
}
