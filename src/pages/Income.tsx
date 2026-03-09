import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Plus } from 'lucide-react'
import { krw } from '../lib/format'

const channelData = [
  { name: 'CNC 가공', value: 2500000, color: '#2E7D32' },
  { name: '레이저', value: 500000, color: '#4CAF50' },
  { name: '수업·강의', value: 350000, color: '#3498db' },
  { name: '장비 대여', value: 500000, color: '#f1c40f' },
  { name: '펜션 객실', value: 800000, color: '#9b59b6' },
]

const monthlyData = [
  { month: '1월', 공방: 2900000, 펜션: 400000 },
  { month: '2월', 공방: 3500000, 펜션: 500000 },
  { month: '3월', 공방: 3850000, 펜션: 800000 },
]

const incomeList = [
  { id: '1', date: '2026-03-22', desc: 'SUS304 정밀부품 100EA', biz: '공방', type: 'CNC가공', amount: 5000000, confirmed: false, counterparty: '삼성전자 협력사' },
  { id: '2', date: '2026-03-12', desc: 'MDF 레이저커팅 간판', biz: '공방', type: '레이저', amount: 500000, confirmed: true, counterparty: '로컬카페' },
  { id: '3', date: '2026-03-07', desc: 'SUS304 브라켓 30EA', biz: '공방', type: 'CNC가공', amount: 1800000, confirmed: true, counterparty: '현대모비스' },
  { id: '4', date: '2026-03-03', desc: 'AL6061 정밀가공 50EA', biz: '공방', type: 'CNC가공', amount: 2500000, confirmed: true, counterparty: '(주)테크원' },
  { id: '5', date: '2026-03-01', desc: '달팽이아지트 객실 2박', biz: '펜션', type: '객실', amount: 320000, confirmed: true, counterparty: '에어비앤비' },
]

export default function Income() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">수입 관리</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50] transition-colors">
          <Plus size={16} /> 수입 등록
        </button>
      </div>

      {showForm && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">수입 등록</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">날짜</label>
              <input type="date" defaultValue="2026-03-10" className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2E7D32] outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">사업 구분</label>
              <select className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2E7D32] outline-none">
                <option>공방</option><option>펜션</option><option>기타</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">수입 유형</label>
              <select className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2E7D32] outline-none">
                <option>CNC가공</option><option>레이저</option><option>수업·강의</option><option>장비대여</option><option>객실</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">금액</label>
              <input type="number" placeholder="0" className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2E7D32] outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">거래처</label>
              <input type="text" placeholder="거래처명" className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2E7D32] outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">메모</label>
              <input type="text" placeholder="메모" className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2E7D32] outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <label className="flex items-center gap-2 text-[12px] text-[#8b8fa3]">
              <input type="checkbox" className="accent-[#2E7D32]" /> 세금계산서 발행
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[#8b8fa3]">
              <input type="checkbox" defaultChecked className="accent-[#2E7D32]" /> 입금 확인
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="bg-[#2E7D32] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50]">저장</button>
            <button onClick={() => setShowForm(false)} className="border border-[#2a2d3a] text-[#8b8fa3] px-5 py-2 rounded-lg text-sm hover:text-white">취소</button>
          </div>
        </div>
      )}

      {/* 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">채널별 매출</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" dataKey="value" stroke="none">
                  {channelData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }} formatter={(v) => krw(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">월별 매출 비교</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="month" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={(v) => `${(v/10000).toFixed(0)}만`} />
                <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }} formatter={(v) => krw(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="공방" fill="#2E7D32" radius={[4,4,0,0]} />
                <Bar dataKey="펜션" fill="#3498db" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 수입 목록 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">수입 내역</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-[#2a2d3a]">
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">날짜</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">구분</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">내용</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">거래처</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">금액</th>
                <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">입금</th>
              </tr>
            </thead>
            <tbody>
              {incomeList.map(item => (
                <tr key={item.id} className="border-b border-[#2a2d3a]/50 hover:bg-[#22252f] cursor-pointer">
                  <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{item.date}</td>
                  <td className="py-2 px-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.biz === '공방' ? 'bg-[#2E7D32]/20 text-[#4CAF50]' : 'bg-[#3498db]/20 text-[#3498db]'}`}>
                      {item.biz}
                    </span>
                  </td>
                  <td className="py-2 px-2">{item.desc}</td>
                  <td className="py-2 px-2 text-[#8b8fa3]">{item.counterparty}</td>
                  <td className="py-2 px-2 text-right text-[#4CAF50] tabular-nums font-medium">{krw(item.amount)}</td>
                  <td className="py-2 px-2 text-center">
                    {item.confirmed
                      ? <span className="text-[#4CAF50]">✓</span>
                      : <span className="text-[#f1c40f]">미수</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
