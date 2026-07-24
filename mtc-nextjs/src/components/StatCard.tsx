import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  type: 'total' | 'completed' | 'pending' | 'in-progress' | 'transferred';
}

export default function StatCard({ title, value, icon, type }: StatCardProps) {
  return (
    <div className={`stat-card ${type}`}>
      <div className="stat-icon-wrapper">
        <span className="material-icons-round">{icon}</span>
      </div>
      <div className="stat-info">
        <h3 className="stat-title">{title}</h3>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}
