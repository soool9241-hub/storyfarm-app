import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AlertTriangle, Calculator } from 'lucide-react'
import { krw } from '../lib/format'

const debts = [
  { id: '1', name: 'OK저축은행', balance: 9050535, rate: 17.2, monthly: 721162, payDay: 9, dueDate: '2027-03-09', lastPaid: '2026-03-09', lastAmount: 721162, type: '대출' },
  { id: '2', name: '카드론', balance: 3000000, rate: 19.5, monthly: 250000, payDay: 25, dueDate: null, lastPaid: null, lastAmount: null, type: '카드론' },
  { id: '3', name: '국민은행 일시상환', balance: 10000000, rate: 4.5, monthly: 37500, payDay: 15, dueDate: '2026-09-15', lastPaid: '2026-03-15', lastAmount: 37500, type: '대출' },
]

const simData = [
  { month: '3월', 최소납부: 22050535, 추가50만: 22050535, 추가100만: 22050535 },
  { month: '6월', 최소납부: 20500000, 추가50만: 19000000, 추가100만: 17500000 },
  { month: '9월', 최소납부: 19000000, 추가50만: 16000000, 추가100만: 13000000 },
  { month: '12월', 최소납부: 17500000, 추가50만: 13000000, 추가100만: 8500000 },
  { month: '25/3월', 최소납부: 16000000, 추가50만: 10000000, 추가100만: 4000000 },
  { month: '25/6월', 최소납부: 14500000, 추가50만: 7000000, 추가100만: 0 },
]

function dDay(dateStr: string | null): string {
  if (!dateStr) return '-'
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
}

function dDayColor(dateStr: string | null): string {
  if (!dateStr) return 'text-[#8b8fa3]'
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff <= 7) return 'text-[#e74c3c]'
  if (diff <= 30) return 'text-[#f1c40f]'
  if (diff <= 90) return 'text-[#e67e22]'
  return 'text-[#8b8fa3]'
}

export default function Debt() {
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0)
  const totalMonthly = debts.reduce((s, d) => s + d.monthly, 0)
  const totalInterest = debts.reduce((s, d) => s + Math.round(d.balance * d.rate / 100 / 12), 0)

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">대출·채무 관리</h2>

      {/* 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">총 채무 잔액</div>
          <div className="text-xl font-bold text-[#e74c3c]">{krw(totalDebt)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">월 상환액</div>
          <div className="text-xl font-bold text-[#f1c40f]">{krw(totalMonthly)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">월 이자 부담</div>
          <div className="text-xl font-bold text-[#e67e22]">{krw(totalInterest)}</div>
        </div>
      </div>

      {/* 채무 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {debts.map(d => {
          const monthlyInterest = Math.round(d.balance * d.rate / 100 / 12)
          return (
            <div key={d.id} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 hover:border-[#2E7D32] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-sm">{d.name}</h4>
                  <span className="text-[10px] text-[#8b8fa3]">{d.type} · 연 {d.rate}%</span>
                </div>
                {d.rate >= 15 && <AlertTriangle size={16} className="text-[#e74c3c]" />}
              </div>
              <div className="text-2xl font-bold text-[#e74c3c] mb-3 tabular-nums">{krw(d.balance)}</div>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#8b8fa3]">월 상환</span>
                  <span>{krw(d.monthly)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b8fa3]">월 이자</span>
                  <span className="text-[#e67e22]">{krw(monthlyInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b8fa3]">납부일</span>
                  <span>매월 {d.payDay}일</span>
                </div>
                {d.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-[#8b8fa3]">만기</span>
                    <span className={`font-medium ${dDayColor(d.dueDate)}`}>{d.dueDate} ({dDay(d.dueDate)})</span>
                  </div>
                )}
                {d.lastPaid && (
                  <div className="flex justify-between">
                    <span className="text-[#8b8fa3]">최근 납부</span>
                    <span className="text-[#4CAF50]">{d.lastPaid} ✓</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 상환 시뮬레이션 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a] flex items-center gap-2">
          <Calculator size={16} className="text-[#4CAF50]" />
          고금리 우선 상환 시뮬레이션
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-[#0f1117] rounded-lg p-3 text-center">
            <div className="text-[10px] text-[#8b8fa3] mb-1">시나리오 A: 최소납부</div>
            <div className="text-sm font-bold text-[#e74c3c]">완제 2027년 5월</div>
            <div className="text-[11px] text-[#8b8fa3]">총이자 806,327원</div>
          </div>
          <div className="bg-[#0f1117] rounded-lg p-3 text-center border border-[#f1c40f]/30">
            <div className="text-[10px] text-[#f1c40f] mb-1">시나리오 B: +50만원</div>
            <div className="text-sm font-bold text-[#f1c40f]">완제 2026년 10월</div>
            <div className="text-[11px] text-[#8b8fa3]">이자절감 242,513원</div>
          </div>
          <div className="bg-[#0f1117] rounded-lg p-3 text-center border border-[#4CAF50]/30">
            <div className="text-[10px] text-[#4CAF50] mb-1">시나리오 C: +100만원</div>
            <div className="text-sm font-bold text-[#4CAF50]">완제 2026년 10월</div>
            <div className="text-[11px] text-[#8b8fa3]">이자절감 310,580원</div>
          </div>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="month" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }} formatter={(v) => krw(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="최소납부" stroke="#e74c3c" fill="#e74c3c" fillOpacity={0.1} />
              <Area type="monotone" dataKey="추가50만" stroke="#f1c40f" fill="#f1c40f" fillOpacity={0.1} />
              <Area type="monotone" dataKey="추가100만" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
