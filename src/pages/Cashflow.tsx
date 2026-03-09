import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { krw } from '../lib/format'

const forecast = [
  { date: '3/10', 입금: 0, 출금: 300000, 잔고: 8200000 },
  { date: '3/15', 입금: 0, 출금: 537500, 잔고: 7662500 },
  { date: '3/17', 입금: 0, 출금: 500000, 잔고: 7162500 },
  { date: '3/20', 입금: 0, 출금: 850000, 잔고: 6312500 },
  { date: '3/25', 입금: 0, 출금: 2250000, 잔고: 4062500 },
  { date: '3/31', 입금: 0, 출금: 0, 잔고: 4062500 },
  { date: '4/1', 입금: 0, 출금: 800000, 잔고: 3262500 },
  { date: '4/4', 입금: 0, 출금: 0, 잔고: 3262500 },
]

const schedule = [
  { date: '3/10', type: 'expense', desc: '공과금', amount: 300000 },
  { date: '3/15', type: 'expense', desc: '국민은행 이자 + 국민카드', amount: 537500 },
  { date: '3/17', type: 'expense', desc: '신한카드 결제', amount: 500000 },
  { date: '3/20', type: 'expense', desc: 'OK캐피탈 상환', amount: 850000 },
  { date: '3/25', type: 'expense', desc: '카드론 + 급여', amount: 2250000 },
  { date: '4/01', type: 'expense', desc: '월세', amount: 800000 },
]

export default function Cashflow() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">현금흐름 예측</h2>

      {/* 30일 차트 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">30일 잔고 예측</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecast}>
              <defs>
                <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4CAF50" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="date" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }} formatter={(v) => krw(Number(v))} />
              <ReferenceLine y={5000000} stroke="#f1c40f" strokeDasharray="5 5" label={{ value: '주의 500만', fill: '#f1c40f', fontSize: 10 }} />
              <ReferenceLine y={2000000} stroke="#e74c3c" strokeDasharray="5 5" label={{ value: '위험 200만', fill: '#e74c3c', fontSize: 10 }} />
              <Area type="monotone" dataKey="잔고" stroke="#4CAF50" fill="url(#cfGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 예정 일정 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">예정된 입출금</h3>
        <div className="space-y-1">
          {schedule.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#2a2d3a]/50 last:border-0 text-[12px]">
              <div className="flex items-center gap-3">
                <span className="text-[#8b8fa3] tabular-nums w-10">{s.date}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${s.type === 'income' ? 'bg-[#4CAF50]' : 'bg-[#e74c3c]'}`} />
                <span>{s.desc}</span>
              </div>
              <span className={`tabular-nums font-medium ${s.type === 'income' ? 'text-[#4CAF50]' : 'text-[#e74c3c]'}`}>
                {s.type === 'income' ? '+' : '-'}{krw(s.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
