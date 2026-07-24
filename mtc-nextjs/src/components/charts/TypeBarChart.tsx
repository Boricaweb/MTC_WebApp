'use client';

import React from 'react';
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

interface TypeBarChartProps {
  typeCounts: Record<string, number>;
}

export default function TypeBarChart({ typeCounts }: TypeBarChartProps) {
  // Sort by count descending and take top 7
  const sortedTypes = Object.keys(typeCounts)
    .map(key => ({ type: key, count: typeCounts[key] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const labels = sortedTypes.map(item => item.type);
  const dataValues = sortedTypes.map(item => item.count);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'จำนวนงานซ่อม',
        data: dataValues,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4,
        barPercentage: 0.6
      }
    ]
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { family: "'Noto Sans Thai', sans-serif", size: 13 },
        bodyFont: { family: "'Noto Sans Thai', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(203, 213, 225, 0.4)'
        },
        ticks: {
          stepSize: 1,
          font: { family: "'Inter', sans-serif" }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: { family: "'Noto Sans Thai', sans-serif" }
        }
      }
    }
  };

  if (Object.keys(typeCounts).length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
        ไม่มีข้อมูล
      </div>
    );
  }

  return <Bar data={chartData} options={options} />;
}
