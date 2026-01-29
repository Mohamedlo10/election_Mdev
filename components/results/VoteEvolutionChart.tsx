'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VoteData {
  time: string;
  votes: number;
  cumulativeVotes: number;
}

interface VoteEvolutionChartProps {
  data: VoteData[];
  title?: string;
}

export default function VoteEvolutionChart({ data, title = "Évolution des votes" }: VoteEvolutionChartProps) {
  return (
    <div className="w-full h-80" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#111827', fontSize: '20px', marginBottom: '16px' }}>{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" strokeWidth={1.5} />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 14, fill: '#374151', fontWeight: 600 }}
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#6b7280"
            strokeWidth={2}
          />
          <YAxis 
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
          />
          <Legend 
            wrapperStyle={{ color: '#111827', fontSize: '14px', fontWeight: 600 }}
            iconSize={16}
          />
          <Line 
            type="monotone" 
            dataKey="cumulativeVotes" 
            stroke="#22c55e" 
            strokeWidth={3}
            name="Votes cumulés"
            dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 7, fill: '#22c55e', strokeWidth: 2, stroke: '#ffffff' }}
          />
          <Line 
            type="monotone" 
            dataKey="votes" 
            stroke="#3b82f6" 
            strokeWidth={3}
            name="Votes par période"
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 7, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
