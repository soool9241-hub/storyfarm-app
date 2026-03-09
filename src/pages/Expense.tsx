import { useState } from 'react'
import { Plus, Camera, MessageSquare } from 'lucide-react'
import { krw } from '../lib/format'

const expenses = [
  { id: '1', date: '2026-03-09', category: '대출상환', desc: 'OK저축은행 3월', amount: 721162, method: '계좌이체', biz: '공통' },
  { id: '2', date: '2026-03-07', category: '재료비', desc: 'SUS304 50kg', amount: 520000, method: '국민카드', biz: '공방' },
  { id: '3', date: '2026-03-05', category: '공과금', desc: '전기요금', amount: 185000, method: '계좌이체', biz: '공통' },
  { id: '4', date: '2026-03-04', category: '재료비', desc: 'AL6061 30kg', amount: 312000, method: '국민카드', biz: '공방' },
  { id: '5', date: '2026-03-03', category: '운영비', desc: '인터넷·전화', amount: 55000, method: '계좌이체', biz: '공통' },
  { id: '6', date: '2026-03-02', category: '식대', desc: '직원 회식', amount: 120000, method: '신한카드', biz: '공방' },
  { id: '7', date: '2026-03-01', category: '임대료', desc: '공방 월세', amount: 800000, method: '계좌이체', biz: '공방' },
]

const budgetData = [
  { category: '재료비', budget: 2000000, spent: 832000 },
  { category: '인건비', budget: 2000000, spent: 0 },
  { category: '임대료', budget: 800000, spent: 800000 },
  { category: '공과금', budget: 400000, spent: 185000 },
  { category: '식대·교통', budget: 300000, spent: 120000 },
]

export default function Expense() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">지출 관리</h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 bg-[#3498db] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#2980b9]">
            <Camera size={16} /> 영수증 스캔
          </button>
          <button className="flex items-center gap-1.5 bg-[#9b59b6] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#8e44ad]">
            <MessageSquare size={16} /> 문자 파싱
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50]">
            <Plus size={16} /> 직접 입력
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">지출 등록 (빠른 입력)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">날짜</label>
              <input type="date" defaultValue="2026-03-10" className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2E7D32]" />
            </div>
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">카테고리</label>
              <select className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2E7D32]">
                <option>재료비</option><option>인건비</option><option>임대료</option><option>공과금</option><option>장비</option><option>마케팅</option><option>세금</option><option>식대·교통</option><option>기타</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">금액</label>
              <input type="number" placeholder="0" className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2E7D32]" />
            </div>
            <div>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">결제수단</label>
              <select className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2E7D32]">
                <option>국민카드</option><option>신한카드</option><option>계좌이체</option><option>현금</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="bg-[#2E7D32] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50]">저장</button>
            <button onClick={() => setShowForm(false)} className="border border-[#2a2d3a] text-[#8b8fa3] px-5 py-2 rounded-lg text-sm hover:text-white">취소</button>
          </div>
        </div>
      )}

      {/* 예산 관리 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">카테고리별 예산</h3>
        <div className="space-y-3">
          {budgetData.map(b => {
            const pct = (b.spent / b.budget) * 100
            const over = pct > 100
            return (
              <div key={b.category}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span>{b.category}</span>
                  <span className={over ? 'text-[#e74c3c] font-medium' : 'text-[#8b8fa3]'}>
                    {krw(b.spent)} / {krw(b.budget)} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-[#2a2d3a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-[#e74c3c]' : pct > 80 ? 'bg-[#f1c40f]' : 'bg-[#2E7D32]'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 지출 목록 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">지출 내역</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[550px]">
            <thead>
              <tr className="border-b-2 border-[#2a2d3a]">
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">날짜</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">카테고리</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">내용</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">결제</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">금액</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b border-[#2a2d3a]/50 hover:bg-[#22252f] cursor-pointer">
                  <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{e.date}</td>
                  <td className="py-2 px-2"><span className="text-[10px] bg-[#2a2d3a] px-2 py-0.5 rounded-full">{e.category}</span></td>
                  <td className="py-2 px-2">{e.desc}</td>
                  <td className="py-2 px-2 text-[#8b8fa3]">{e.method}</td>
                  <td className="py-2 px-2 text-right text-[#e74c3c] tabular-nums font-medium">{krw(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
