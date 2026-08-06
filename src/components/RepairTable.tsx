'use client';

import React from 'react';
import { Repair } from '@/types';
import { STATUS_COLORS } from '@/lib/constants';
import { formatDateThai } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface RepairTableProps {
  repairs: Repair[];
  onEdit: (repair: Repair) => void;
  onDelete: (id: number) => void;
}

export default function RepairTable({ repairs, onEdit, onDelete }: RepairTableProps) {
  const { isAdmin } = useAuth();

  if (repairs.length === 0) {
    return (
      <div className="empty-state">
        <span className="material-icons-round empty-icon" style={{ fontSize: '48px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>inbox</span>
        <h3 className="empty-title" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>ไม่มีข้อมูลงานซ่อม</h3>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>ลำดับที่</th>
            <th>ผู้แจ้ง / สาขา</th>
            <th>หน่วยงาน</th>
            <th>ช่องทาง</th>
            <th>รายการซ่อม</th>
            <th>ชั้น</th>
            <th>ประเภท</th>
            <th>วันที่แจ้ง</th>
            <th>สถานที่</th>
            <th>สถานะ</th>
            <th>วันที่ซ่อมเสร็จ</th>
            <th>รูปภาพ</th>
            {isAdmin && <th>จัดการ</th>}
          </tr>
        </thead>
        <tbody>
          {repairs.map(repair => (
            <tr key={repair.id}>
              <td className="td-order">{repair.order}</td>
              <td className="td-reporter">{repair.reporter}</td>
              <td className="td-department">{repair.department}</td>
              <td className="td-channel">{repair.channel}</td>
              <td className="td-subject" style={{ fontWeight: 500 }}>{repair.subject}</td>
              <td className="td-floor">{repair.floor}</td>
              <td className="td-type">{repair.type}</td>
              <td className="td-dateReported">{formatDateThai(repair.dateReported)}</td>
              <td className="td-location">{repair.location}</td>
              <td className="td-status">
                <span className={`status-badge ${STATUS_COLORS[repair.status] || ''}`}>
                  {repair.status}
                </span>
              </td>
              <td className="td-dateFixed">{formatDateThai(repair.dateFixed)}</td>
              <td className="td-photos">
                {repair.photos && repair.photos.length > 0 ? (
                  <span className="material-icons-round" style={{ color: 'var(--blue-500)' }} title={`${repair.photos.length} รูป`}>photo_library</span>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                )}
              </td>
              {isAdmin && (
                <td className="td-actions">
                  <button 
                    className="action-btn" 
                    title="แก้ไข" 
                    onClick={() => onEdit(repair)}
                  >
                    <span className="material-icons-round">edit</span>
                  </button>
                  <button 
                    className="action-btn delete" 
                    title="ลบ" 
                    onClick={() => repair.id && onDelete(repair.id)}
                  >
                    <span className="material-icons-round">delete</span>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
