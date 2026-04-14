import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';

interface VitalSign {
  recordedAt: string;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
}

interface VitalSignsChartProps {
  vitals: VitalSign[];
}

const VitalSignsChart: React.FC<VitalSignsChartProps> = ({ vitals }) => {
  const data = [...vitals]
    .slice(0, 10)
    .reverse()
    .map((v) => ({
      date: dayjs(v.recordedAt).format('MM/DD HH:mm'),
      systolic: v.bloodPressureSystolic ?? undefined,
      diastolic: v.bloodPressureDiastolic ?? undefined,
      heartRate: v.heartRate ?? undefined,
    }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="systolic"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="BP Systolic"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="diastolic"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="BP Diastolic"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="heartRate"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Heart Rate"
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default VitalSignsChart;
