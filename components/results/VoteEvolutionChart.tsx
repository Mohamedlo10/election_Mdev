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
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#9ca3af"
          />
          <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}
            labelStyle={{ fontWeight: 'bold', color: '#111827' }}
          />
          <Legend wrapperStyle={{ color: '#111827' }} />
          <Line 
            type="monotone" 
            dataKey="cumulativeVotes" 
            stroke="#22c55e" 
            strokeWidth={2}
            name="Votes cumulés"
            dot={{ r: 3, fill: '#22c55e' }}
            activeDot={{ r: 6, fill: '#22c55e' }}
          />
          <Line 
            type="monotone" 
            dataKey="votes" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Votes par période"
            dot={{ r: 3, fill: '#3b82f6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
