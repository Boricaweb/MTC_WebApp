'use client';

import React, { useState, useEffect } from 'react';
import Topbar from '@/components/Topbar';
import MonthlyTrendChart from '@/components/charts/MonthlyTrendChart';
import { WeeklyData } from '@/types';
import { THAI_MONTHS } from '@/lib/constants';

export default function WeeklySummaryPage() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeekly = async () => {
      try {
        const res = await fetch('/api/weekly');
        const data = await res.json();
        if (Array.isArray(data)) {
          setWeeklyData(data);
          if (data.length > 0) {
            setActiveMonth(data[data.length - 1].month);
          }
        } else {
          console.error('Weekly API returned non-array:', data);
        }
      } catch (error) {
        console.error('Failed to fetch weekly data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWeekly();
  }, []);

  const activeData = weeklyData.find(d => d.month === activeMonth);

  return (
    <div className="page-wrapper fade-in">
      <Topbar title="สรุปรายสัปดาห์" />
      
      <div className="content-container">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <div className="card-header">
                <h3 className="card-title">แนวโน้มงานซ่อม</h3>
              </div>
              <div className="chart-container" style={{ height: '350px', position: 'relative' }}>
                <MonthlyTrendChart data={weeklyData} />
              </div>
            </div>

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
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>สัปดาห์ที่</th>
                          <th>งานที่แจ้ง (รายสัปดาห์)</th>
                          <th>งานที่เสร็จสิ้น (รายสัปดาห์)</th>
                          <th>งานที่แจ้ง (สะสม)</th>
                          <th>งานที่เสร็จสิ้น (สะสม)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeData.weeks.map(week => (
                          <tr key={week.week}>
                            <td>{week.week}</td>
                            <td>{week.reported}</td>
                            <td>{week.completed}</td>
                            <td>{week.cumulativeReported}</td>
                            <td>{week.cumulativeCompleted}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'rgba(241, 245, 249, 0.5)', fontWeight: 600 }}>
                          <td>รวมทั้งเดือน</td>
                          <td>{activeData.cumulative.reported}</td>
                          <td>{activeData.cumulative.completed}</td>
                          <td>-</td>
                          <td>-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                    ไม่มีข้อมูลสำหรับเดือนนี้
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
