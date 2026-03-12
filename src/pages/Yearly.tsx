import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { krw } from '../lib/format'

const defaultYearlyData = [
  { month: '1월', 수입: 3300000, 지출: 6500000, 순이익: -3200000 },
  { month: '2월', 수입: 4000000, 지출: 6800000, 순이익: -2800000 },
  { month: '3월', 수입: 4650000, 지출: 8175000, 순이익: -3525000 },
  { month: '4월', 수입: 0, 지출: 0, 순이익: 0 },
]

const defaultGrowthData = [
  { month: '1월', MoM: -15.2, YoY: 0 },
  { month: '2월', MoM: 21.2, YoY: 0 },
  { month: '3월', MoM: 16.3, YoY: 0 },
]

const defaultOrderAnalysis = [
  { type: 'AL6061 가공', count: 12, revenue: 28500000, avgMargin: 42.3 },
  { type: 'SUS304 가공', count: 8, revenue: 19200000, avgMargin: 33.1 },
  { type: 'MDF 레이저', count: 15, revenue: 5800000, avgMargin: 58.4 },
  { type: '기타 용역', count: 5, revenue: 3200000, avgMargin: 28.7 },
]

export default function Yearly() {
  const [yearlyData, setYearlyData] = useState(defaultYearlyData)
  const [growthData, setGrowthData] = useState(defaultGrowthData)
  const [orderAnalysis, setOrderAnalysis] = useState(defaultOrderAnalysis)

  useEffect(() => {
    async function fetchData() {
      try {
        const currentYear = new Date().getFullYear()
        const yearStart = `${currentYear}-01-01`
        const yearEnd = `${currentYear}-12-31`

        const [incomeRes, expenseRes, ordersRes] = await Promise.all([
          supabase.from('income').select('*').gte('date', yearStart).lte('date', yearEnd),
          supabase.from('expenses').select('*').gte('date', yearStart).lte('date', yearEnd),
          supabase.from('orders').select('*'),
        ])

        // Process yearly data (income & expenses by month)
        if (!incomeRes.error && !expenseRes.error && (incomeRes.data || expenseRes.data)) {
          const monthlyMap: Record<number, { income: number; expense: number }> = {}
          for (let m = 1; m <= 12; m++) {
            monthlyMap[m] = { income: 0, expense: 0 }
          }

          if (incomeRes.data) {
            for (const row of incomeRes.data) {
              const month = new Date(row.date).getMonth() + 1
              monthlyMap[month].income += row.amount || 0
            }
          }

          if (expenseRes.data) {
            for (const row of expenseRes.data) {
              const month = new Date(row.date).getMonth() + 1
              monthlyMap[month].expense += row.amount || 0
            }
          }

          const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
          const newYearlyData = monthNames.map((name, i) => {
            const m = i + 1
            const income = monthlyMap[m].income
            const expense = monthlyMap[m].expense
            return { month: name, 수입: income, 지출: expense, 순이익: income - expense }
          })

          setYearlyData(newYearlyData)

          // Compute MoM growth
          const newGrowthData: typeof defaultGrowthData = []
          for (let i = 0; i < newYearlyData.length; i++) {
            if (newYearlyData[i].수입 === 0 && newYearlyData[i].지출 === 0) continue
            const thisMonth = newYearlyData[i].수입
            const lastMonth = i > 0 ? newYearlyData[i - 1].수입 : 0
            const mom = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
            newGrowthData.push({ month: newYearlyData[i].month, MoM: Math.round(mom * 10) / 10, YoY: 0 })
          }

          if (newGrowthData.length > 0) {
            setGrowthData(newGrowthData)
          }
        }

        // Process order analysis
        if (!ordersRes.error && ordersRes.data && ordersRes.data.length > 0) {
          const groupMap: Record<string, { count: number; revenue: number; totalMargin: number }> = {}

          for (const order of ordersRes.data) {
            const desc = order.desc || order.description || ''
            // Extract type pattern from description (first part before space or specific keywords)
            let type = '기타 용역'
            if (desc.includes('AL6061')) type = 'AL6061 가공'
            else if (desc.includes('SUS304')) type = 'SUS304 가공'
            else if (desc.includes('MDF') || desc.includes('레이저')) type = 'MDF 레이저'

            if (!groupMap[type]) {
              groupMap[type] = { count: 0, revenue: 0, totalMargin: 0 }
            }
            groupMap[type].count += 1
            groupMap[type].revenue += order.revenue || 0
            const margin = order.margin_rate ?? (order.revenue > 0 ? ((order.revenue - (order.total_cost || 0)) / order.revenue) * 100 : 0)
            groupMap[type].totalMargin += margin
          }

          const newOrderAnalysis = Object.entries(groupMap).map(([type, data]) => ({
            type,
            count: data.count,
            revenue: data.revenue,
            avgMargin: Math.round((data.totalMargin / data.count) * 10) / 10,
          }))

          if (newOrderAnalysis.length > 0) {
            setOrderAnalysis(newOrderAnalysis)
          }
        }
      } catch (err) {
        console.error('Yearly fetch error, using defaults:', err)
        // Keep default values on error
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">연도별 분석 — 2026</h2>

      {/* 월별 추이 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">월별 수입/지출 추이</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData.filter(d => d.수입 > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="month" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }} formatter={(v) => krw(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="수입" fill="#2E7D32" radius={[4,4,0,0]} />
              <Bar dataKey="지출" fill="#e74c3c" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 성장률 + 수주 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">전월 대비 성장률 (MoM)</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="month" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="MoM" stroke="#4CAF50" strokeWidth={2} dot={{ fill: '#4CAF50', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">품목별 수주 분석</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b-2 border-[#2a2d3a]">
                  <th className="text-left py-2 text-[#8b8fa3]">품목</th>
                  <th className="text-right py-2 text-[#8b8fa3]">건수</th>
                  <th className="text-right py-2 text-[#8b8fa3]">매출</th>
                  <th className="text-right py-2 text-[#8b8fa3]">평균마진</th>
                </tr>
              </thead>
              <tbody>
                {orderAnalysis.map(o => (
                  <tr key={o.type} className="border-b border-[#2a2d3a]/50">
                    <td className="py-2">{o.type}</td>
                    <td className="py-2 text-right tabular-nums">{o.count}건</td>
                    <td className="py-2 text-right tabular-nums">{krw(o.revenue)}</td>
                    <td className={`py-2 text-right tabular-nums font-medium ${o.avgMargin >= 40 ? 'text-[#4CAF50]' : o.avgMargin >= 20 ? 'text-[#f1c40f]' : 'text-[#e74c3c]'}`}>{o.avgMargin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
