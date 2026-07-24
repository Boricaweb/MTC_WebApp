'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'แดชบอร์ด', path: '/', icon: 'dashboard', id: 'nav-dashboard' },
    { name: 'รายการซ่อม', path: '/repairs', icon: 'build', id: 'nav-repairs' },
    { name: 'สรุปรายสัปดาห์', path: '/weekly', icon: 'view_week', id: 'nav-weekly' },
    { name: 'วิเคราะห์รายเดือน', path: '/analysis', icon: 'analytics', id: 'nav-analysis' }
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <span className="material-icons-round logo-icon">engineering</span>
        </div>
        <div className="brand">
          <h2 className="brand-title">MTC</h2>
          <p className="brand-subtitle">Maintenance System</p>
        </div>
      </div>

      <div className="nav-menu">
        {navItems.map(item => (
          <Link
            key={item.id}
            href={item.path}
            id={item.id}
            className={`nav-item ${pathname === item.path ? 'active' : ''}`}
          >
            <span className="material-icons-round">{item.icon}</span>
            <span className="nav-text">{item.name}</span>
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
          <span className="nav-text">ระบบเบิกอะไหล่</span>
          <span className="material-icons-round external-icon">open_in_new</span>
        </a>
      </div>
    </nav>
  );
}
