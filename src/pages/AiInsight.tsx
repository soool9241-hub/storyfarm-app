import { useState } from 'react'
import { Bot, Send, AlertCircle, Lightbulb, TrendingUp } from 'lucide-react'

const briefing = {
  date: '2026-03-10',
  items: [
    { priority: 'critical', text: '카드론 19.5% 고금리 — 월 48,750원 이자 발생. 여유자금 50만원 추가 상환 시 이자 24만원 절감.' },
    { priority: 'warning', text: '3/25 급여 + 카드론 상환일 겹침. 잔고 4,062,500원 예상 — 마이너스 리스크 없으나 여유분 적음.' },
    { priority: 'warning', text: '펜션 가동률 16.1%. 봄 시즌 마케팅으로 주말 가동률 60% 목표 권장.' },
    { priority: 'info', text: '공방 CNC-031 수주 마진 47.9%로 양호. AL6061 가공이 가장 수익성 높은 품목입니다.' },
  ]
}

const suggestions = [
  "이번달 괜찮아?",
  "카드론 언제 다 갚아?",
  "어떤 수주가 제일 남았어?",
  "지금 당장 제일 급한 게 뭐야?",
  "다음달 통장 잔고 얼마 될 것 같아?",
  "공방이랑 펜션 중에 어디가 더 남아?",
]

export default function AiInsight() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [input, setInput] = useState('')

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev,
      { role: 'user', text },
      { role: 'ai', text: getAiResponse(text) }
    ])
    setInput('')
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">AI 인사이트</h2>

      {/* SOL-CFO 브리핑 */}
      <div className="bg-gradient-to-r from-[#2E7D32]/10 to-[#1a1d27] border border-[#2E7D32]/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={18} className="text-[#4CAF50]" />
          <span className="text-sm font-semibold text-[#4CAF50]">SOL-CFO 오늘의 브리핑</span>
          <span className="text-[10px] text-[#8b8fa3] ml-auto">{briefing.date}</span>
        </div>
        <div className="space-y-2">
          {briefing.items.map((item, i) => (
            <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-[12px] ${
              item.priority === 'critical' ? 'bg-[#e74c3c]/10 text-[#e74c3c]' :
              item.priority === 'warning' ? 'bg-[#f1c40f]/10 text-[#f1c40f]' :
              'bg-[#4CAF50]/10 text-[#4CAF50]'
            }`}>
              {item.priority === 'critical' ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> :
               item.priority === 'warning' ? <Lightbulb size={14} className="mt-0.5 shrink-0" /> :
               <TrendingUp size={14} className="mt-0.5 shrink-0" />}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 챗봇 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Bot size={16} /> 자연어 질문
          </h3>
        </div>

        <div className="h-72 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-[#8b8fa3] text-[12px] py-8">
              <Bot size={32} className="mx-auto mb-3 opacity-30" />
              <p>재무 관련 질문을 자유롭게 해보세요</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)} className="bg-[#0f1117] border border-[#2a2d3a] rounded-full px-3 py-1.5 text-[11px] hover:border-[#2E7D32] hover:text-[#4CAF50] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-xl text-[12px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#2E7D32] text-white rounded-br-none'
                  : 'bg-[#0f1117] border border-[#2a2d3a] rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-[#2a2d3a] flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder="질문을 입력하세요..."
            className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2E7D32]"
          />
          <button onClick={() => sendMessage(input)} className="bg-[#2E7D32] text-white p-2 rounded-lg hover:bg-[#4CAF50]">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function getAiResponse(q: string): string {
  if (q.includes('괜찮')) return '이번달은 매출 465만원으로 전월 대비 8.4% 성장했지만, 판관비가 커서 영업이익은 -352만원이에요. 급한 건 카드론 고금리 상환과 펜션 가동률 개선입니다.'
  if (q.includes('카드론')) return '카드론 잔액 300만원, 연 19.5%. 현재 최소 납부(월 25만원)로 약 14개월 소요. 50만원 추가 상환 시 7개월로 단축, 이자 24만원 절감됩니다.'
  if (q.includes('수주') || q.includes('남았')) return 'CNC-033 MDF 레이저커팅이 마진율 61.6%로 가장 높고, CNC-031 AL6061 가공이 47.9%로 2위입니다. CNC-034 급행건은 -38%로 손해에요.'
  if (q.includes('급한')) return '1순위: 카드론 19.5% 우선 상환, 2순위: 3/25 급여일 자금 확보, 3순위: 펜션 봄시즌 마케팅. 이 세 가지를 이번 주 내로 검토하세요.'
  if (q.includes('통장') || q.includes('잔고')) return '현재 잔고 850만원 → 3/25 급여+카드론 후 약 406만원 → 4/1 월세 후 약 326만원 예상. 위험하진 않지만 여유분이 적어요.'
  if (q.includes('공방') && q.includes('펜션')) return '3월 기준 공방 385만원 vs 펜션 80만원. 공방이 4.8배 더 벌지만 고정비도 큽니다. 펜션은 BEP를 초과 달성 중이라 안정적이에요.'
  return '해당 질문에 대한 분석을 준비 중입니다. Supabase 연동 후 실시간 데이터 기반으로 정확한 답변을 드릴 수 있어요.'
}
