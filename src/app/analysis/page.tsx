'use client';

import React, { useState, useEffect } from 'react';
import Topbar from '@/components/Topbar';
import { AnalysisData } from '@/types';
import { THAI_MONTHS, DEPARTMENTS } from '@/lib/constants';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalysisPage() {
  const [analysisData, setAnalysisData] = useState<AnalysisData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await fetch('/api/analysis');
        const data = await res.json();
        if (Array.isArray(data)) {
          setAnalysisData(data);
          if (data.length > 0) {
            setActiveMonth(data[data.length - 1].month);
          }
        } else {
          console.error('Analysis API returned non-array:', data);
        }
      } catch (error) {
        console.error('Failed to fetch analysis data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, []);

  const activeData = analysisData.find(d => d.month === activeMonth);

  const getChartOptions = (displayXAxis: boolean = true) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { family: "'Noto Sans Thai', sans-serif", size: 13 },
        bodyFont: { family: "'Noto Sans Thai', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(203, 213, 225, 0.4)' },
        ticks: { stepSize: 1, font: { family: "'Inter', sans-serif" } }
      },
      x: {
        display: displayXAxis,
        grid: { display: false },
        ticks: { font: { family: "'Noto Sans Thai', sans-serif" }, maxRotation: 45, minRotation: 45 }
      }
    }
  });

  return (
    <div className="page-wrapper fade-in">
      <Topbar title="วิเคราะห์รายเดือน" />
      
      <div className="content-container">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '0' }}>
            <div className="tabs" style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(203, 213, 225, 0.4)' }}>
              {THAI_MONTHS.map(month => (
                <button 
                  key={month} 
                  className={`tab-btn ${activeMonth === month ? 'active' : ''}`}
                  onClick={() => setActiveMonth(month)}
                  style={{ 
                    padding: '16px 24px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeMonth === month ? '2px solid var(--blue-500)' : '2px solid transparent',
                    color: activeMonth === month ? 'var(--blue-500)' : 'var(--text-secondary)',
                    fontWeight: activeMonth === month ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {month}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px' }}>
              {activeData ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                    <div className="chart-card" style={{ border: '1px solid rgba(203, 213, 225, 0.4)', borderRadius: '12px', padding: '20px' }}>
                      <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>อาการเสีย / ประเภทงานซ่อม</h4>
                      <div style={{ height: '300px' }}>
                        <Bar 
                          data={{
                            labels: (activeData.repairTypes || []).map(i => i.type),
                            datasets: [{
                              data: (activeData.repairTypes || []).map(i => i.count),
                              backgroundColor: 'rgba(239, 68, 68, 0.8)',
                              borderRadius: 4
                            }]
                          }} 
                          options={getChartOptions()} 
                        />
                      </div>
                    </div>

                    <div className="chart-card" style={{ border: '1px solid rgba(203, 213, 225, 0.4)', borderRadius: '12px', padding: '20px' }}>
                      <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>หน่วยงานที่แจ้งซ่อม</h4>
                      <div style={{ height: '300px' }}>
                        <Bar 
                          data={{
                            labels: (activeData.departments || []).map(l => l.name),
                            datasets: [{
                              data: (activeData.departments || []).map(l => l.count),
                              backgroundColor: 'rgba(59, 130, 246, 0.8)',
                              borderRadius: 4
                            }]
                          }} 
                          options={getChartOptions()} 
                        />
                      </div>
                    </div>
                  </div>

                  <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '18px' }}>สถิติการแจ้งซ่อมตามหน่วยงาน</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {(activeData.departments || []).map(dept => {
                      return (
                        <div key={dept.name} style={{ background: 'rgba(248, 250, 252, 0.8)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{dept.name}</span>
                          <span style={{ fontSize: '24px', fontWeight: 700, color: dept.count > 0 ? 'var(--blue-600)' : 'var(--text-tertiary)' }}>{dept.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                  ไม่มีข้อมูลการวิเคราะห์สำหรับเดือนนี้
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
