import { useState, useRef, useEffect } from 'react'
import { Bot, Send, AlertCircle, Lightbulb, TrendingUp, Loader2, Settings } from 'lucide-react'

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

// 재무 데이터 컨텍스트 (Claude에게 전달)
const FINANCE_CONTEXT = `당신은 스토리팜의 AI 재무 관리사 SOL-CFO입니다. 친근하고 실용적인 조언을 한국어로 제공합니다.

현재 스토리팜 재무 현황 (2026년 3월):
- 총 매출: 465만원 (공방 385만원, 펜션 80만원)
- 총 지출: 817만원 (재료비 83.2만, 인건비 0, 임대료 80만, 공과금 18.5만, 대출상환 72.1만 등)
- 영업이익: -352만원
- 현재 잔고: 약 850만원

채무 현황:
- OK저축은행: 잔액 905만원, 연 17.2%, 월 72.1만원, 만기 2027-03-09
- 카드론: 잔액 300만원, 연 19.5%, 월 25만원
- 국민은행 일시상환: 잔액 1,000만원, 연 4.5%, 월 이자 3.75만원, 만기 2026-09-15

자산:
- CNC 머신 1호 (DMG MORI): 취득가 3천만, 장부가 1,515만
- 레이저커터 (Universal): 취득가 1,500만, 장부가 915만
- CNC 라우터 (ShopBot): 취득가 800만, 장부가 512만

주요 수주:
- CNC-031 SUS304 정밀부품 100EA: 500만원 (미입금)
- CNC-029 SUS304 브라켓 30EA: 180만원 (입금완료)
- CNC-028 AL6061 정밀가공 50EA: 250만원 (입금완료)

펜션(달팽이아지트): 객실 5개, 가동률 16.1%, BEP 초과 달성중

답변은 간결하고 핵심 위주로 하되, 구체적인 숫자를 포함해주세요. 이모지는 쓰지 마세요.`

export default function AiInsight() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_api_key') || '')
  const [showSettings, setShowSettings] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  const saveApiKey = (key: string) => {
    setApiKey(key)
    localStorage.setItem('claude_api_key', key)
    setShowSettings(false)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const userMsg = { role: 'user' as const, text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    if (apiKey) {
      // Claude API 연동
      try {
        const chatHistory = [...messages, userMsg].map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text
        }))

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: FINANCE_CONTEXT,
            messages: chatHistory,
          })
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error?.message || `API 오류 (${res.status})`)
        }

        const data = await res.json()
        const aiText = data.content?.[0]?.text || '응답을 받지 못했습니다.'
        setMessages(prev => [...prev, { role: 'ai', text: aiText }])
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : '알 수 없는 오류'
        setMessages(prev => [...prev, { role: 'ai', text: `API 연동 오류: ${errMsg}\n\n기본 응답으로 전환합니다.\n\n${getAiResponse(text)}` }])
      }
    } else {
      // 오프라인 폴백
      await new Promise(r => setTimeout(r, 500))
      setMessages(prev => [...prev, { role: 'ai', text: getAiResponse(text) }])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">AI 인사이트</h2>
        <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-1.5 text-[#8b8fa3] hover:text-white text-[11px] transition-colors">
          <Settings size={14} />
          {apiKey ? 'Claude API 연결됨' : 'API 키 설정'}
        </button>
      </div>

      {/* API 키 설정 */}
      {showSettings && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-2">Claude API 설정</h3>
          <p className="text-[11px] text-[#8b8fa3] mb-3">Anthropic API 키를 입력하면 자연어 질문에 Claude가 실시간으로 답변합니다. 키는 브라우저에만 저장됩니다.</p>
          <div className="flex gap-2">
            <input
              type="password"
              defaultValue={apiKey}
              placeholder="sk-ant-api03-..."
              className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2E7D32]"
              onKeyDown={e => { if (e.key === 'Enter') saveApiKey((e.target as HTMLInputElement).value) }}
            />
            <button
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
                saveApiKey(input.value)
              }}
              className="bg-[#2E7D32] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50]"
            >저장</button>
          </div>
        </div>
      )}

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
            {apiKey && <span className="text-[10px] text-[#4CAF50] font-normal ml-1">Claude API 활성</span>}
            {!apiKey && <span className="text-[10px] text-[#8b8fa3] font-normal ml-1">오프라인 모드</span>}
          </h3>
        </div>

        <div ref={chatRef} className="h-72 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-[#8b8fa3] text-[12px] py-8">
              <Bot size={32} className="mx-auto mb-3 opacity-30" />
              <p>재무 관련 질문을 자유롭게 해보세요</p>
              {!apiKey && <p className="text-[10px] mt-1">Claude API 키를 등록하면 더 정확한 답변을 받을 수 있습니다</p>}
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
              <div className={`max-w-[80%] p-3 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#2E7D32] text-white rounded-br-none'
                  : 'bg-[#0f1117] border border-[#2a2d3a] rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#0f1117] border border-[#2a2d3a] rounded-xl rounded-bl-none p-3 flex items-center gap-2 text-[12px] text-[#8b8fa3]">
                <Loader2 size={14} className="animate-spin" /> 분석 중...
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#2a2d3a] flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="질문을 입력하세요..."
            disabled={loading}
            className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2E7D32] disabled:opacity-50"
          />
          <button onClick={() => sendMessage(input)} disabled={loading} className="bg-[#2E7D32] text-white p-2 rounded-lg hover:bg-[#4CAF50] disabled:opacity-50">
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
  return 'Claude API 키를 등록하시면 더 정확하고 상세한 분석을 받을 수 있습니다. 상단의 "API 키 설정"에서 Anthropic API 키를 입력해주세요.'
}
