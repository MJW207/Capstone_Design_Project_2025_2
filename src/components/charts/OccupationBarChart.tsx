import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { OccupationData } from '../../utils/statistics';

interface OccupationBarChartProps {
  data: OccupationData[];
  totalCount: number;
}

export function OccupationBarChart({ data, totalCount }: OccupationBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-tertiary)' }}>
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
          <XAxis 
            type="number" 
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            style={{ fill: 'var(--text-secondary)', fontSize: '12px' }}
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={120}
            style={{ fill: 'var(--text-secondary)', fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number, name: string, props: any) => {
              if (name === 'rate') {
                return [`${value}% (${props.payload.count}명)`, '비율'];
              }
              return [value, name];
            }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}
          />
          <Bar dataKey="rate" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
      
      {/* 범례 */}
      <div className="mt-4 pt-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border-secondary)' }}>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          총 {totalCount.toLocaleString()}명
        </div>
      </div>
    </div>
  );
}

