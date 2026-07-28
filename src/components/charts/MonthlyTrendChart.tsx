'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { WeeklyData } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MonthlyTrendChartProps {
  data: WeeklyData[];
}

export default function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  // Extract last 6 months for the trend
  const trendData = data.slice(-6);
  const labels = trendData.map(d => d.month);
  const reportedData = trendData.map(d => d.cumulative.reported);
  const completedData = trendData.map(d => d.cumulative.completed);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'งานที่แจ้ง',
        data: reportedData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#3B82F6',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'งานที่เสร็จสิ้น',
        data: completedData,
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#22C55E',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: "'Noto Sans Thai', sans-serif" },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { family: "'Noto Sans Thai', sans-serif", size: 13 },
        bodyFont: { family: "'Noto Sans Thai', sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(203, 213, 225, 0.4)'
        },
        ticks: {
          font: { family: "'Inter', sans-serif" }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { family: "'Noto Sans Thai', sans-serif" }
        }
      }
    }
  };

  return <Line data={chartData} options={options} />;
}
