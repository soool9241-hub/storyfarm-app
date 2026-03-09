import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, Line,
} from 'recharts'
import { TrendingUp, Wallet, CreditCard, TrendingDown, Target, AlertCircle, CheckCircle, Info } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import { krw } from '../lib/format'

// 샘플 데이터 (Supabase 연동 전까지 사용)
const SAMPLE = {
  revenue: 4650000,
  cogs: 1430000,
  grossProfit: 3220000,
  sga: 6745000,
  operatingIncome: -3525000,
  netIncome: -3661250,
  totalAssets: 29420000,
  totalDebt: 18000000,
  cashBalance: 8500000,
  cashForecast30d: 3262500,
  bepRate: 62.3,
  monthlyExpense: 8175000,
}

const revenueData = [
  { month: '10월', 공방: 3200000, 펜션: 1200000, 순이익: -800000 },
  { month: '11월', 공방: 3800000, 펜션: 600000, 순이익: -500000 },
  { month: '12월', 공방: 4100000, 펜션: 1800000, 순이익: 200000 },
  { month: '1월', 공방: 2900000, 펜션: 400000, 순이익: -1200000 },
  { month: '2월', 공방: 3500000, 펜션: 500000, 순이익: -900000 },
  { month: '3월', 공방: 3850000, 펜션: 800000, 순이익: -3661250 },
]

const expenseBreakdown = [
  { name: '인건비', value: 2000000, color: '#e74c3c' },
  { name: '원재료비', value: 1430000, color: '#e67e22' },
  { name: '기타판관비', value: 3150000, color: '#f1c40f' },
  { name: '임차료', value: 800000, color: '#9b59b6' },
  { name: '감가상각비', value: 795000, color: '#3498db' },
]

const cashflowData = [
  { day: '3/10', balance: 8200000, status: 'ok' },
  { day: '3/15', balance: 7662500, status: 'ok' },
  { day: '3/17', balance: 7162500, status: 'ok' },
  { day: '3/20', balance: 6312500, status: 'ok' },
  { day: '3/25', balance: 4062500, status: 'warn' },
  { day: '3/31', balance: 4062500, status: 'warn' },
  { day: '4/1', balance: 3262500, status: 'warn' },
]

const alerts = [
  { type: 'critical' as const, msg: '카드론 19.5% 고금리 — 우선 상환 검토 필요', icon: <AlertCircle size={14} /> },
  { type: 'warning' as const, msg: '3/25 급여+카드론 상환일 — 잔고 주의', icon: <AlertCircle size={14} /> },
  { type: 'warning' as const, msg: '펜션 객실 가동률 16.1% — 마케팅 강화 검토', icon: <Info size={14} /> },
  { type: 'info' as const, msg: '공방 마진율 47.9% (CNC-031) 양호', icon: <CheckCircle size={14} /> },
]

const recentTx = [
  { date: '03-09', desc: 'OK저축 3월 상환', amount: -721162, biz: 'shared' },
  { date: '03-07', desc: 'SUS304 브라켓 수주', amount: 1800000, biz: 'workshop' },
  { date: '03-05', desc: '포스코스틸 재료비', amount: -520000, biz: 'workshop' },
  { date: '03-03', desc: 'AL6061 정밀가공 수주', amount: 2500000, biz: 'workshop' },
  { date: '03-02', desc: '달팽이아지트 객실', amount: 160000, biz: 'pension' },
]

export default function Dashboard() {
  return (
    <div className="space-y-5">
      {/* KPI 카드 6개 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="이번달 총매출" value={SAMPLE.revenue} alert="positive" sub="전월比 +8.4%" icon={<TrendingUp size={16} />} />
        <KpiCard label="이번달 순이익" value={SAMPLE.netIncome} alert="negative" sub="이익률 -78.7%" icon={<TrendingDown size={16} />} />
        <KpiCard label="현금 잔고" value={SAMPLE.cashBalance} alert="neutral" sub={`30일 후 ${krw(SAMPLE.cashForecast30d)}`} icon={<Wallet size={16} />} />
        <KpiCard label="채무 총액" value={SAMPLE.totalDebt} alert="negative" sub="이번달 납부 1,137,500원" icon={<CreditCard size={16} />} />
        <KpiCard label="이번달 지출" value={SAMPLE.monthlyExpense} alert="negative" sub="전월比 +3.2%" icon={<TrendingDown size={16} />} />
        <KpiCard label="BEP 달성률" value={0} alert={SAMPLE.bepRate >= 80 ? 'positive' : 'negative'} sub={`${SAMPLE.bepRate}% 달성`} icon={<Target size={16} />} />
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 월별 수익 추이 */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">월별 수익 추이</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="month" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={(v) => `${(v/10000).toFixed(0)}만`} />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => krw(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="공방" fill="#2E7D32" radius={[4,4,0,0]} />
                <Bar dataKey="펜션" fill="#3498db" radius={[4,4,0,0]} />
                <Line type="monotone" dataKey="순이익" stroke="#e74c3c" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 지출 카테고리 */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">지출 카테고리</h3>
          <div className="h-56 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  dataKey="value"
                  stroke="none"
                >
                  {expenseBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => krw(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 현금흐름 30일 예측 */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">
            30일 현금흐름 예측
            <span className="ml-2 text-[10px] bg-[#2E7D32] text-white px-2 py-0.5 rounded-full font-normal">실시간</span>
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowData}>
                <defs>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2E7D32" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2E7D32" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="day" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={(v) => `${(v/10000).toFixed(0)}만`} />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => krw(Number(v))}
                />
                <Area type="monotone" dataKey="balance" stroke="#4CAF50" fill="url(#cashGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 하단: 알림 + 최근 거래 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 알림 패널 */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">알림·경보</h3>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-[12px] ${
                a.type === 'critical' ? 'bg-[#e74c3c]/10 text-[#e74c3c]' :
                a.type === 'warning' ? 'bg-[#f1c40f]/10 text-[#f1c40f]' :
                'bg-[#4CAF50]/10 text-[#4CAF50]'
              }`}>
                {a.icon}
                <span>{a.msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 거래 */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">최근 거래 내역</h3>
          <div className="space-y-1">
            {recentTx.map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#2a2d3a]/50 last:border-0 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#8b8fa3] tabular-nums w-12">{tx.date}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    tx.biz === 'workshop' ? 'bg-[#2E7D32]/20 text-[#4CAF50]' :
                    tx.biz === 'pension' ? 'bg-[#3498db]/20 text-[#3498db]' :
                    'bg-[#8b8fa3]/20 text-[#8b8fa3]'
                  }`}>
                    {tx.biz === 'workshop' ? '공방' : tx.biz === 'pension' ? '펜션' : '공통'}
                  </span>
                  <span>{tx.desc}</span>
                </div>
                <span className={`tabular-nums font-medium ${tx.amount >= 0 ? 'text-[#4CAF50]' : 'text-[#e74c3c]'}`}>
                  {krw(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI 오늘의 한마디 */}
      <div className="bg-gradient-to-r from-[#2E7D32]/10 to-[#1a1d27] border border-[#2E7D32]/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={16} className="text-[#4CAF50]" />
          <span className="text-[12px] font-semibold text-[#4CAF50]">SOL-CFO 오늘의 한마디</span>
        </div>
        <p className="text-[13px] text-[#8b8fa3] leading-relaxed">
          이번달 공방 마진이 47.9%로 양호하지만, 전체 판관비가 매출을 초과하고 있어요.
          카드론(19.5%) 우선 상환과 펜션 가동률 개선이 급선무입니다.
          3/25 급여일까지 잔고 여유를 확인하세요.
        </p>
      </div>
    </div>
  )
}

// Bot icon import (이미 lucide에 있음)
import { Bot } from 'lucide-react'
