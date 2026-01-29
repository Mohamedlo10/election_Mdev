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
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#111827', fontSize: '20px', marginBottom: '16px' }}>{categoryName}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" strokeWidth={1.5} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 14, fill: '#374151', fontWeight: 600 }}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            stroke="#6b7280"
            strokeWidth={2}
          />
          <YAxis 
            label={{ value: 'Nombre de votes', angle: -90, position: 'insideLeft', style: { fill: '#374151', fontSize: 14, fontWeight: 600 } }}
            stroke="#6b7280"
            strokeWidth={2}
            tick={{ fill: '#374151', fontSize: 14, fontWeight: 600 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px'
            }}
            labelStyle={{ fontWeight: 'bold', color: '#111827', fontSize: '14px' }}
            formatter={(value: any) => {
              const item = data.find(d => d.votes === value);
              return [`${value} votes (${item?.percentage || 0}%)`, 'Résultat'];
            }}
          />
          <Legend wrapperStyle={{ color: '#111827', fontSize: '14px', fontWeight: 600 }} iconSize={16} />
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
