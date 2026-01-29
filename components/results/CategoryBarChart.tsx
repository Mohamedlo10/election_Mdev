'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CandidateResult {
  name: string;
  votes: number;
  percentage: number;
  color?: string;
}

interface CategoryBarChartProps {
  data: CandidateResult[];
  categoryName: string;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function CategoryBarChart({ data, categoryName }: CategoryBarChartProps) {
  return (
    <div className="w-full h-80" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>{categoryName}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            stroke="#9ca3af"
          />
          <YAxis 
            label={{ value: 'Nombre de votes', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
            stroke="#9ca3af"
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}
            formatter={(value: any) => {
              const item = data.find(d => d.votes === value);
              return [`${value} votes (${item?.percentage || 0}%)`, 'Résultat'];
            }}
          />
          <Legend wrapperStyle={{ color: '#111827' }} />
          <Bar dataKey="votes" name="Votes" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
