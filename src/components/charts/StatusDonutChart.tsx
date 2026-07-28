'use client';

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface StatusDonutChartProps {
  statusCounts: Record<string, number>;
}

export default function StatusDonutChart({ statusCounts }: StatusDonutChartProps) {
  const labels = ['เรียบร้อย', 'กำลังดำเนินการ', 'รอดำเนินการ', 'โอนย้าย'];
  const dataValues = [
    statusCounts['เรียบร้อย'] || 0,
    statusCounts['กำลังดำเนินการ'] || 0,
    statusCounts['รอดำเนินการ'] || 0,
    statusCounts['โอนย้าย'] || 0
  ];

  const chartData = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: [
          '#22C55E', // เรียบร้อย - Green
          '#3B82F6', // กำลังดำเนินการ - Blue
          '#F59E0B', // รอดำเนินการ - Yellow/Amber
          '#A855F7'  // โอนย้าย - Purple
        ],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: { family: "'Noto Sans Thai', sans-serif" },
          usePointStyle: true,
          boxWidth: 8,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { family: "'Noto Sans Thai', sans-serif", size: 13 },
        bodyFont: { family: "'Noto Sans Thai', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.chart._metasets[context.datasetIndex].total;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return ` ${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Check if all values are 0
  const total = dataValues.reduce((a, b) => a + b, 0);
  
  if (total === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
        ไม่มีข้อมูล
      </div>
    );
  }

  return <Doughnut data={chartData} options={options} />;
}
