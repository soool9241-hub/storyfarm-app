import { krw } from '../lib/format'

interface KpiCardProps {
  label: string
  value: number
  sub?: string
  alert?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
}

export default function KpiCard({ label, value, sub, alert = 'neutral', icon }: KpiCardProps) {
  const color =
    alert === 'positive' ? 'text-[#4CAF50]' :
    alert === 'negative' ? 'text-[#e74c3c]' : 'text-white'

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 hover:border-[#2E7D32] hover:shadow-[0_0_20px_rgba(46,125,50,0.15)] transition-all group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#8b8fa3] uppercase tracking-wider">{label}</span>
        {icon && <span className="text-[#8b8fa3] group-hover:text-[#4CAF50] transition-colors">{icon}</span>}
      </div>
      <div className={`text-xl font-bold tabular-nums ${color}`}>
        {krw(value)}
      </div>
      {sub && <div className="text-[11px] text-[#8b8fa3] mt-1">{sub}</div>}
    </div>
  )
}
