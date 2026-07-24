import React from 'react';
import { Repair } from '@/types';
import { STATUS_COLORS } from '@/lib/constants';
import { formatDateThai } from '@/lib/utils';

interface RecentListProps {
  repairs: Repair[];
}

export default function RecentList({ repairs }: RecentListProps) {
  if (repairs.length === 0) {
    return <div className="no-data-message" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>ยังไม่มีข้อมูลงานซ่อมล่าสุด</div>;
  }

  return (
    <div className="recent-list" id="recent-list">
      {repairs.map(repair => (
        <div key={repair.id} className="recent-item">
          <div className="recent-header">
            <span className="recent-subject">{repair.subject}</span>
            <span className={`status-badge ${STATUS_COLORS[repair.status] || ''}`}>{repair.status}</span>
          </div>
          <div className="recent-details">
            <div className="detail-item">
              <span className="material-icons-round">person</span>
              <span>{repair.reporter}</span>
            </div>
            <div className="detail-item">
              <span className="material-icons-round">location_on</span>
              <span>{repair.location} (ชั้น {repair.floor})</span>
            </div>
            <div className="detail-item">
              <span className="material-icons-round">calendar_today</span>
              <span>{formatDateThai(repair.dateReported)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
