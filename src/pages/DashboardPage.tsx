import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { GlassCard } from '../components/GlassCard'

const kpis = [
  ['Total', '42'],
  ['Active', '19'],
  ['Interviews', '6'],
  ['Offers', '1'],
  ['Response Rate', '28%'],
]

const weekly = [
  { week: 'W1', applications: 4 },
  { week: 'W2', applications: 7 },
  { week: 'W3', applications: 5 },
  { week: 'W4', applications: 9 },
]

export const DashboardPage = () => (
  <div className="space-y-4">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map(([label, value]) => (
        <GlassCard key={label} level={1} className="text-center">
          <p className="text-xs text-slate-300">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </GlassCard>
      ))}
    </section>

    <div className="grid gap-4 xl:grid-cols-3">
      <GlassCard className="xl:col-span-2">
        <h2 className="mb-2 text-sm font-medium">Applications per week</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={weekly}>
              <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="week" stroke="rgba(255,255,255,0.7)" />
              <Tooltip />
              <Bar dataKey="applications" fill="url(#grad)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6ee7ff" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
      <GlassCard>
        <h2 className="mb-2 text-sm font-medium">Needs follow-up</h2>
        <ul className="space-y-2 text-sm">
          <li>Acme Corp — Applied 9 days ago</li>
          <li>Northwind — Applied 11 days ago</li>
        </ul>
      </GlassCard>
    </div>
  </div>
)
