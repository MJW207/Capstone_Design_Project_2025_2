import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { LifestyleData } from '../../utils/statistics';

interface LifestyleDonutChartProps {
  data: LifestyleData[];
  totalCount: number;
  title: string;
}

export function LifestyleDonutChart({ data, totalCount, title }: LifestyleDonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-tertiary)' }}>
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, rate }) => `${name} ${rate}%`}
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            dataKey="rate"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number, name: string, props: any) => {
              return [`${value}% (${props.payload.count}명)`, props.payload.name];
            }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* 범례 */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
        <div className="flex flex-col gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {item.count.toLocaleString()}명 ({item.rate}%)
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          총 {totalCount.toLocaleString()}명
        </div>
      </div>
    </div>
  );
}

