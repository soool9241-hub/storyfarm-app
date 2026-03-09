import { Plus } from 'lucide-react'
import { krw } from '../lib/format'

const assets = [
  { id: '1', name: 'CNC 머신 1호', model: 'DMG MORI', acquired: '2023-06-15', cost: 30000000, life: 60, method: '정액법', accDep: 14850000, bookValue: 15150000, lifePct: 55 },
  { id: '2', name: '레이저커터', model: 'Universal VLS6.60', acquired: '2024-01-10', cost: 15000000, life: 60, method: '정액법', accDep: 5850000, bookValue: 9150000, lifePct: 43.3 },
  { id: '3', name: 'CNC 라우터', model: 'ShopBot PRSalpha', acquired: '2024-06-01', cost: 8000000, life: 60, method: '정액법', accDep: 2880000, bookValue: 5120000, lifePct: 40 },
]

const maintenance = [
  { date: '2026-02-15', asset: 'CNC 머신 1호', desc: '스핀들 베어링 교체', cost: 450000, vendor: '한국DMG' },
  { date: '2026-01-20', asset: '레이저커터', desc: '레이저 튜브 교체', cost: 280000, vendor: '유니버설 서비스' },
  { date: '2025-12-05', asset: 'CNC 라우터', desc: '정기 점검', cost: 80000, vendor: '자체 점검' },
]

export default function Assets() {
  const totalCost = assets.reduce((s, a) => s + a.cost, 0)
  const totalBook = assets.reduce((s, a) => s + a.bookValue, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">자산·장비 관리</h2>
        <button className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50]">
          <Plus size={16} /> 장비 등록
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">총 취득원가</div>
          <div className="text-xl font-bold">{krw(totalCost)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">현재 장부가</div>
          <div className="text-xl font-bold text-[#4CAF50]">{krw(totalBook)}</div>
        </div>
      </div>

      {/* 장비 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assets.map(a => (
          <div key={a.id} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
            <h4 className="font-semibold text-sm mb-1">{a.name}</h4>
            <p className="text-[11px] text-[#8b8fa3] mb-3">{a.model} · {a.method}</p>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-[#8b8fa3]">취득원가</span><span>{krw(a.cost)}</span></div>
              <div className="flex justify-between"><span className="text-[#8b8fa3]">장부가</span><span className="text-[#4CAF50]">{krw(a.bookValue)}</span></div>
              <div className="flex justify-between"><span className="text-[#8b8fa3]">감가상각 누계</span><span className="text-[#e67e22]">{krw(a.accDep)}</span></div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8b8fa3]">내용연수 소진</span>
                <span className={a.lifePct > 80 ? 'text-[#e74c3c]' : a.lifePct > 50 ? 'text-[#e67e22]' : 'text-[#4CAF50]'}>{a.lifePct}%</span>
              </div>
              <div className="h-2 bg-[#2a2d3a] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${a.lifePct > 80 ? 'bg-[#e74c3c]' : a.lifePct > 50 ? 'bg-[#e67e22]' : 'bg-[#2E7D32]'}`} style={{ width: `${a.lifePct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 유지보수 이력 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">유지보수 이력</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[450px]">
            <thead>
              <tr className="border-b-2 border-[#2a2d3a]">
                <th className="text-left py-2 px-2 text-[#8b8fa3]">날짜</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3]">장비</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3]">내용</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3]">업체</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3]">비용</th>
              </tr>
            </thead>
            <tbody>
              {maintenance.map((m, i) => (
                <tr key={i} className="border-b border-[#2a2d3a]/50 hover:bg-[#22252f]">
                  <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{m.date}</td>
                  <td className="py-2 px-2">{m.asset}</td>
                  <td className="py-2 px-2">{m.desc}</td>
                  <td className="py-2 px-2 text-[#8b8fa3]">{m.vendor}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-[#e67e22]">{krw(m.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
