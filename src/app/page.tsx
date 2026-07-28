'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Topbar from '@/components/Topbar';
import StatCard from '@/components/StatCard';
import MonthlyTrendChart from '@/components/charts/MonthlyTrendChart';
import StatusDonutChart from '@/components/charts/StatusDonutChart';
import TypeBarChart from '@/components/charts/TypeBarChart';
import RecentList from '@/components/RecentList';
import { SummaryData, WeeklyData, Repair } from '@/types';
import { useSync } from '@/hooks/useSync';

export default function Dashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData[]>([]);
  const [recentRepairs, setRecentRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, weeklyRes, repairsRes] = await Promise.all([
        fetch('/api/summary'),
        fetch('/api/weekly'),
        fetch('/api/repairs?limit=5&sort=desc')
      ]);
      
      const summaryData = await summaryRes.json();
      const weeklyData = await weeklyRes.json();
      const repairsData = await repairsRes.json();
      
      if (summaryData && typeof summaryData.total === 'number') {
        setSummary(summaryData);
      }
      if (Array.isArray(weeklyData)) {
        setWeekly(weeklyData);
      }
      if (Array.isArray(repairsData)) {
        setRecentRepairs(repairsData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useSync(fetchData);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="page-wrapper fade-in">
      <Topbar title="แดชบอร์ด" />
      
      <div className="content-container">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="dashboard-grid">
              <StatCard 
                title="งานซ่อมทั้งหมด" 
                value={summary?.total || 0} 
                icon="assignment" 
                type="total" 
              />
              <StatCard 
                title="ดำเนินการเสร็จสิ้น" 
                value={summary?.completed || 0} 
                icon="check_circle" 
                type="completed" 
              />
              <StatCard 
                title="รอดำเนินการ" 
                value={summary?.pending || 0} 
                icon="pending_actions" 
                type="pending" 
              />
              <StatCard 
                title="กำลังดำเนินการ" 
                value={summary?.inProgress || 0} 
                icon="engineering" 
                type="in-progress" 
              />
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '24px' }}>
              {/* Trend Chart */}
              <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header">
                  <h3 className="card-title">แนวโน้มงานซ่อมรายเดือน</h3>
                </div>
                <div className="chart-container" style={{ height: '300px', position: 'relative' }}>
                  <MonthlyTrendChart data={weekly} />
                </div>
              </div>

              {/* Status Chart */}
              <div className="chart-card">
                <div className="card-header">
                  <h3 className="card-title">สัดส่วนสถานะงาน</h3>
                </div>
                <div className="chart-container" style={{ height: '300px', position: 'relative' }}>
                  <StatusDonutChart statusCounts={summary?.statusCounts || {}} />
                </div>
              </div>

              {/* Type Chart */}
              <div className="chart-card">
                <div className="card-header">
                  <h3 className="card-title">ประเภทงานซ่อม (สูงสุด 7 อันดับ)</h3>
                </div>
                <div className="chart-container" style={{ height: '300px', position: 'relative' }}>
                  <TypeBarChart typeCounts={summary?.typeCounts || {}} /> 
                </div>
              </div>
            </div>

            {/* Recent Repairs */}
            <div className="chart-card" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <h3 className="card-title">รายการล่าสุด</h3>
                <a href="/repairs" className="btn btn-ghost btn-sm">ดูทั้งหมด</a>
              </div>
              <RecentList repairs={recentRepairs} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
