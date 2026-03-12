import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, Line,
} from 'recharts'
import { TrendingUp, Wallet, CreditCard, TrendingDown, Target, AlertCircle, CheckCircle, Info, Bot, Loader2 } from 'lucide-react'
import KpiCard from '../components/KpiCard'
import { krw } from '../lib/format'
import { supabase } from '../lib/supabase'

// --- Types ---
type IncomeItem = {
  id: string; date: string; desc: string; biz: string; type: string; amount: number; counterparty?: string
}
type ExpenseItem = {
  id: string; date: string; category: string; desc: string; amount: number; method: string; biz: string
}
type DebtItem = {
  id: string; name: string; totalLoan: number; paidAmount: number; balance: number; rate: number; monthly: number;
  payDay: number; dueDate: string; lastPaid: string; lastAmount: number; type: string
}
type PensionRevenue = {
  id: number; reservation_date: string; total_revenue: number; guest_name: string; status: string
}

// --- Helpers ---
const PIE_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#9b59b6', '#3498db', '#2E7D32', '#1abc9c']

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function parseLocalStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : fallback
  } catch {
    return fallback
  }
}

function isSameMonth(dateStr: string, year: number, month: number): boolean {
  const d = new Date(dateStr)
  return d.getFullYear() === year && d.getMonth() === month
}


export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [incomeList, setIncomeList] = useState<IncomeItem[]>([])
  const [expenseList, setExpenseList] = useState<ExpenseItem[]>([])
  const [debtList, setDebtList] = useState<DebtItem[]>([])
  const [pensionRevenue, setPensionRevenue] = useState<PensionRevenue[]>([])

  // Current month: 2026-03 (month index 2)
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() // 0-indexed

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      try {
        const [incomeRes, expenseRes, debtRes, pensionRes] = await Promise.all([
          supabase.from('income').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('debts').select('*'),
          supabase.from('v_reservation_revenue').select('*'),
        ])

        if (cancelled) return

        // Income
        if (incomeRes.error || !incomeRes.data) {
          setIncomeList(parseLocalStorage<IncomeItem>('storyfarm_income_list', []))
        } else {
          setIncomeList(incomeRes.data as IncomeItem[])
        }

        // Expenses
        if (expenseRes.error || !expenseRes.data) {
          setExpenseList(parseLocalStorage<ExpenseItem>('storyfarm_expense_list', []))
        } else {
          setExpenseList(expenseRes.data as ExpenseItem[])
        }

        // Debts
        if (debtRes.error || !debtRes.data) {
          setDebtList(parseLocalStorage<DebtItem>('storyfarm_debt_list', []))
        } else {
          setDebtList(debtRes.data as DebtItem[])
        }

        // Pension revenue (view might not exist)
        if (pensionRes.error || !pensionRes.data) {
          setPensionRevenue([])
        } else {
          setPensionRevenue(pensionRes.data as PensionRevenue[])
        }
      } catch {
        // Full failure — fallback to localStorage
        if (!cancelled) {
          setIncomeList(parseLocalStorage<IncomeItem>('storyfarm_income_list', []))
          setExpenseList(parseLocalStorage<ExpenseItem>('storyfarm_expense_list', []))
          setDebtList(parseLocalStorage<DebtItem>('storyfarm_debt_list', []))
          setPensionRevenue([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [])

  // --- Compute KPIs ---
  const curMonthIncome = incomeList.filter(i => isSameMonth(i.date, curYear, curMonth))
  const curMonthExpenses = expenseList.filter(e => isSameMonth(e.date, curYear, curMonth))
  const curMonthPension = pensionRevenue.filter(p => isSameMonth(p.reservation_date, curYear, curMonth))

  const workshopRevenue = curMonthIncome.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const pensionTotal = curMonthPension.reduce((sum, p) => sum + (Number(p.total_revenue) || 0), 0)
  const revenue = workshopRevenue + pensionTotal

  const monthlyExpense = curMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const netIncome = revenue - monthlyExpense
  const totalDebt = debtList.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  const monthlyDebtPayment = debtList.reduce((sum, d) => sum + (Number(d.monthly) || 0), 0)
  const cashBalance = revenue - monthlyExpense // simplified
  const bepRate = revenue > 0 ? Math.min(100, Math.round((revenue / (monthlyExpense || 1)) * 100 * 10) / 10) : 0

  // Previous month comparison
  const prevMonth = curMonth === 0 ? 11 : curMonth - 1
  const prevYear = curMonth === 0 ? curYear - 1 : curYear
  const prevMonthIncome = incomeList.filter(i => isSameMonth(i.date, prevYear, prevMonth))
  const prevMonthExpenses = expenseList.filter(e => isSameMonth(e.date, prevYear, prevMonth))
  const prevMonthPension = pensionRevenue.filter(p => isSameMonth(p.reservation_date, prevYear, prevMonth))
  const prevRevenue = prevMonthIncome.reduce((s, i) => s + (Number(i.amount) || 0), 0) +
    prevMonthPension.reduce((s, p) => s + (Number(p.total_revenue) || 0), 0)
  const prevExpense = prevMonthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  const revChangeRate = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100).toFixed(1) : '-'
  const expChangeRate = prevExpense > 0 ? ((monthlyExpense - prevExpense) / prevExpense * 100).toFixed(1) : '-'
  const profitMargin = revenue !== 0 ? ((netIncome / revenue) * 100).toFixed(1) : '0.0'

  // --- Build revenueData (last 6 months) ---
  const revenueData = (() => {
    const months: { year: number; month: number }[] = []
    for (let i = 5; i >= 0; i--) {
      let m = curMonth - i
      let y = curYear
      while (m < 0) { m += 12; y -= 1 }
      months.push({ year: y, month: m })
    }
    return months.map(({ year, month }) => {
      const mIncome = incomeList.filter(it => isSameMonth(it.date, year, month))
      const mPension = pensionRevenue.filter(p => isSameMonth(p.reservation_date, year, month))
      const mExpense = expenseList.filter(e => isSameMonth(e.date, year, month))
      const workshopAmt = mIncome.reduce((s, i) => s + (Number(i.amount) || 0), 0)
      const pensionAmt = mPension.reduce((s, p) => s + (Number(p.total_revenue) || 0), 0)
      const expenseAmt = mExpense.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      return {
        month: MONTH_NAMES[month],
        공방: workshopAmt,
        펜션: pensionAmt,
        순이익: workshopAmt + pensionAmt - expenseAmt,
      }
    })
  })()

  // --- Build expenseBreakdown (current month, top 5) ---
  const expenseBreakdown = (() => {
    const catMap: Record<string, number> = {}
    curMonthExpenses.forEach(e => {
      const cat = e.category || '기타'
      catMap[cat] = (catMap[cat] || 0) + (Number(e.amount) || 0)
    })
    const sorted = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    return sorted.map((item, i) => ({ ...item, color: PIE_COLORS[i % PIE_COLORS.length] }))
  })()

  // --- Build recentTx (last 5 combined) ---
  const recentTx = (() => {
    const incomeTx = incomeList.map(i => ({
      date: (i.date || '').slice(5).replace('-', '-'),
      desc: i.desc || i.counterparty || '수입',
      amount: Number(i.amount) || 0,
      biz: i.biz === '공방' ? 'workshop' : i.biz === '펜션' ? 'pension' : 'shared',
      sortDate: i.date,
    }))
    const expenseTx = expenseList.map(e => ({
      date: (e.date || '').slice(5).replace('-', '-'),
      desc: e.desc || e.category || '지출',
      amount: -(Number(e.amount) || 0),
      biz: e.biz === '공방' ? 'workshop' : e.biz === '펜션' ? 'pension' : 'shared',
      sortDate: e.date,
    }))
    return [...incomeTx, ...expenseTx]
      .sort((a, b) => (b.sortDate || '').localeCompare(a.sortDate || ''))
      .slice(0, 5)
  })()

  // --- Build alerts from debt data ---
  const alerts = (() => {
    const items: { type: 'critical' | 'warning' | 'info'; msg: string; icon: React.ReactNode }[] = []

    // High-rate debts
    debtList
      .filter(d => d.rate >= 15)
      .sort((a, b) => b.rate - a.rate)
      .forEach(d => {
        items.push({
          type: 'critical',
          msg: `${d.name} ${d.rate}% 고금리 — 우선 상환 검토 필요`,
          icon: <AlertCircle size={14} />,
        })
      })

    // Upcoming payments this month
    debtList
      .filter(d => d.payDay >= now.getDate())
      .sort((a, b) => a.payDay - b.payDay)
      .forEach(d => {
        items.push({
          type: 'warning',
          msg: `${curMonth + 1}/${d.payDay} ${d.name} 상환일 — ${krw(d.monthly)} 납부 예정`,
          icon: <AlertCircle size={14} />,
        })
      })

    // Pension occupancy hint (if pension revenue is low)
    if (pensionTotal < 500000 && pensionRevenue.length > 0) {
      items.push({
        type: 'warning',
        msg: '펜션 이번달 매출 저조 — 마케팅 강화 검토',
        icon: <Info size={14} />,
      })
    }

    // Positive note if workshop margin is decent
    if (workshopRevenue > monthlyExpense * 0.4) {
      items.push({
        type: 'info',
        msg: `공방 매출 ${krw(workshopRevenue)} — 양호`,
        icon: <CheckCircle size={14} />,
      })
    }

    return items.length > 0 ? items : [
      { type: 'info' as const, msg: '데이터를 추가하면 알림이 자동 생성됩니다.', icon: <Info size={14} /> },
    ]
  })()

  // --- Cashflow forecast (simplified 30-day projection) ---
  const cashflowData = (() => {
    const startBalance = cashBalance > 0 ? cashBalance : 0
    const dailyExpense = monthlyExpense / 30
    const points: { day: string; balance: number; status: string }[] = []
    const dayNow = now.getDate()

    // Generate ~7 data points over the next 30 days
    const checkDays = [dayNow, dayNow + 5, dayNow + 10, dayNow + 15, dayNow + 20, dayNow + 25, 30]
    const uniqueDays = Array.from(new Set(checkDays.filter(d => d >= dayNow && d <= 31)))

    // Check for upcoming debt payments
    const debtPaymentDays = debtList.reduce((map, d) => {
      if (d.payDay >= dayNow) {
        map[d.payDay] = (map[d.payDay] || 0) + (Number(d.monthly) || 0)
      }
      return map
    }, {} as Record<number, number>)

    let runningBalance = startBalance
    uniqueDays.forEach(day => {
      const elapsed = day - dayNow
      let bal = startBalance - (dailyExpense * elapsed)
      // Apply debt payments for days that have passed
      Object.entries(debtPaymentDays).forEach(([pDay, amt]) => {
        if (Number(pDay) <= day && Number(pDay) >= dayNow) {
          bal -= amt
        }
      })
      runningBalance = Math.round(bal)
      points.push({
        day: `${curMonth + 1}/${day > 31 ? day - 31 : day}`,
        balance: Math.max(0, runningBalance),
        status: runningBalance < 2000000 ? 'warn' : 'ok',
      })
    })

    // Add next month start
    const nextMonthBal = Math.max(0, Math.round(startBalance - monthlyExpense - monthlyDebtPayment))
    points.push({
      day: `${curMonth + 2 > 12 ? 1 : curMonth + 2}/1`,
      balance: nextMonthBal,
      status: nextMonthBal < 2000000 ? 'warn' : 'ok',
    })

    return points.length > 0 ? points : [{ day: `${curMonth + 1}/${dayNow}`, balance: 0, status: 'ok' }]
  })()

  const cashForecast30d = cashflowData.length > 0 ? cashflowData[cashflowData.length - 1].balance : 0

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#4CAF50]" size={32} />
        <span className="ml-3 text-[#8b8fa3] text-sm">데이터를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPI 카드 6개 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="이번달 총매출" value={revenue} alert="positive" sub={`전월比 ${revChangeRate === '-' ? '-' : (Number(revChangeRate) >= 0 ? '+' : '') + revChangeRate + '%'}`} icon={<TrendingUp size={16} />} />
        <KpiCard label="이번달 순이익" value={netIncome} alert={netIncome >= 0 ? 'positive' : 'negative'} sub={`이익률 ${profitMargin}%`} icon={<TrendingDown size={16} />} />
        <KpiCard label="현금 잔고" value={cashBalance} alert="neutral" sub={`30일 후 ${krw(cashForecast30d)}`} icon={<Wallet size={16} />} />
        <KpiCard label="채무 총액" value={totalDebt} alert={totalDebt > 0 ? 'negative' : 'neutral'} sub={`이번달 납부 ${krw(monthlyDebtPayment)}`} icon={<CreditCard size={16} />} />
        <KpiCard label="이번달 지출" value={monthlyExpense} alert="negative" sub={`전월比 ${expChangeRate === '-' ? '-' : (Number(expChangeRate) >= 0 ? '+' : '') + expChangeRate + '%'}`} icon={<TrendingDown size={16} />} />
        <KpiCard label="BEP 달성률" value={0} alert={bepRate >= 80 ? 'positive' : 'negative'} sub={`${bepRate}% 달성`} icon={<Target size={16} />} />
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
            {recentTx.length === 0 && (
              <div className="text-center text-[#8b8fa3] text-[12px] py-4">거래 내역이 없습니다</div>
            )}
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
          {netIncome < 0
            ? `이번달 순이익이 ${krw(netIncome)}으로 적자 상태입니다. `
            : `이번달 순이익 ${krw(netIncome)}으로 양호합니다. `}
          {debtList.filter(d => d.rate >= 15).length > 0
            ? `고금리 채무(${debtList.filter(d => d.rate >= 15).map(d => `${d.name} ${d.rate}%`).join(', ')}) 우선 상환을 검토하세요. `
            : ''}
          {monthlyDebtPayment > 0
            ? `이번달 채무 상환 예정액은 ${krw(monthlyDebtPayment)}입니다. `
            : ''}
          잔고 여유를 수시로 확인하세요.
        </p>
      </div>
    </div>
  )
}
