import { krw } from '../lib/format'

const bepData = {
  workshop: { fixed: 3731250, variableRate: 0.307, bep: 5384204, current: 3850000, rate: 71.5 },
  pension: { fixed: 200000, variableRate: 0.1, bep: 222222, current: 800000, rate: 360 },
}

const orders = [
  { id: 'CNC-031', desc: 'AL6061 정밀가공 50EA', revenue: 2500000, cost: 1302500, margin: 47.9, status: 'ok' },
  { id: 'CNC-032', desc: 'SUS304 브라켓 30EA', revenue: 1800000, cost: 1154000, margin: 35.9, status: 'ok' },
  { id: 'CNC-033', desc: 'MDF 레이저커팅 간판', revenue: 500000, cost: 192000, margin: 61.6, status: 'ok' },
  { id: 'CNC-034', desc: 'AL6061 시제품 급행 5EA', revenue: 350000, cost: 483000, margin: -38.0, status: 'danger' },
  { id: 'CNC-035', desc: 'SUS304 정밀부품 100EA', revenue: 5000000, cost: 3450000, margin: 31.0, status: 'ok' },
]

function GaugeBar({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
      <div className="text-[11px] text-[#8b8fa3] mb-2">{label}</div>
      <div className="text-3xl font-bold mb-3" style={{ color }}>{Math.min(rate, 999).toFixed(1)}%</div>
      <div className="h-3 bg-[#2a2d3a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(rate, 100)}%`, background: color }} />
      </div>
      <div className="text-[10px] text-[#8b8fa3] mt-1">{rate >= 100 ? 'BEP 달성!' : `달성까지 ${(100 - rate).toFixed(1)}% 남음`}</div>
    </div>
  )
}

export default function Bep() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">손익분기점</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GaugeBar label="공방 BEP 달성률" rate={bepData.workshop.rate} color={bepData.workshop.rate >= 80 ? '#4CAF50' : '#f1c40f'} />
        <GaugeBar label="펜션 BEP 달성률" rate={bepData.pension.rate} color="#4CAF50" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">공방 BEP 계산</h3>
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-[#8b8fa3]">고정비 (임대+인건비+이자+감가)</span><span>{krw(bepData.workshop.fixed)}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8fa3]">변동비율</span><span>{(bepData.workshop.variableRate * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between border-t border-[#2a2d3a] pt-2 font-medium"><span>BEP 매출</span><span className="text-[#f1c40f]">{krw(bepData.workshop.bep)}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8fa3]">현재 매출</span><span>{krw(bepData.workshop.current)}</span></div>
            <div className="flex justify-between font-medium"><span>BEP까지 필요 매출</span><span className="text-[#e74c3c]">{krw(Math.max(0, bepData.workshop.bep - bepData.workshop.current))}</span></div>
          </div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">펜션 BEP 계산</h3>
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-[#8b8fa3]">고정비</span><span>{krw(bepData.pension.fixed)}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8fa3]">변동비율</span><span>{(bepData.pension.variableRate * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between border-t border-[#2a2d3a] pt-2 font-medium"><span>BEP 매출</span><span className="text-[#4CAF50]">{krw(bepData.pension.bep)}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8fa3]">현재 매출</span><span>{krw(bepData.pension.current)}</span></div>
            <div className="flex justify-between font-medium text-[#4CAF50]"><span>BEP 초과 달성!</span><span>+{krw(bepData.pension.current - bepData.pension.bep)}</span></div>
          </div>
        </div>
      </div>

      {/* 수주 마진 체크 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">수주 마진 실시간 체크</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[500px]">
            <thead>
              <tr className="border-b-2 border-[#2a2d3a]">
                <th className="text-left py-2 px-2 text-[#8b8fa3]">수주번호</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3]">내용</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3]">매출</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3]">원가</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3]">마진율</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-[#2a2d3a]/50 hover:bg-[#22252f]">
                  <td className="py-2 px-2 font-medium">{o.id}</td>
                  <td className="py-2 px-2">{o.desc}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{krw(o.revenue)}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-[#8b8fa3]">{krw(o.cost)}</td>
                  <td className={`py-2 px-2 text-right font-bold tabular-nums ${o.margin < 5 ? 'text-[#e74c3c]' : o.margin < 15 ? 'text-[#f1c40f]' : 'text-[#4CAF50]'}`}>
                    {o.margin.toFixed(1)}%
                    {o.margin < 5 && ' ⚠️'}
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
