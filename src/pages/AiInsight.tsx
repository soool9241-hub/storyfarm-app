import { useState, useRef, useEffect, useMemo } from 'react'
import { Bot, Send, AlertCircle, Lightbulb, TrendingUp, Loader2, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { krw } from '../lib/format'

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
  "이번달 매출 얼마야?",
  "총 채무 얼마 남았어?",
  "펜션 예약 현황 알려줘",
  "지출 가장 많은 항목은?",
  "이번달 수익 괜찮아?",
  "대출 이자 얼마나 나가?",
  "매출 1위 누구야?",
  "고금리 대출 뭐가 있어?",
]


type FinData = {
  incomeList: { date: string; biz: string; type: string; amount: number; counterparty: string; desc: string }[]
  expenseList: { date: string; category: string; amount: number; desc: string }[]
  debtList: { name: string; balance: number; rate: number; monthly: number; dueDate: string; type: string }[]
  pensionList: { guest_name: string; reservation_date: string; guest_count: number; stay_nights: number; total_revenue: number; status: string }[]
}

function loadLocalData(): Omit<FinData, 'pensionList'> {
  const parse = <T,>(key: string): T[] => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : [] } catch { return [] } }
  return {
    incomeList: parse('storyfarm_income_list'),
    expenseList: parse('storyfarm_expense_list'),
    debtList: parse('storyfarm_debt_list'),
  }
}

export default function AiInsight() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('claude_api_key') || '')
  const [showSettings, setShowSettings] = useState(false)
  const [pensionData, setPensionData] = useState<FinData['pensionList']>([])
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  // Supabase 펜션 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('reservations').select('guest_name,reservation_date,guest_count,stay_nights,status').order('created_at', { ascending: false })
        if (data) {
          setPensionData(data.map((r: Record<string, unknown>) => ({
            guest_name: (r.guest_name || '') as string,
            reservation_date: (r.reservation_date || '') as string,
            guest_count: (r.guest_count || 0) as number,
            stay_nights: (r.stay_nights || 1) as number,
            total_revenue: 700000 * ((r.stay_nights || 1) as number) + Math.max(((r.guest_count || 0) as number) - 15, 0) * 10000 * ((r.stay_nights || 1) as number),
            status: (r.status || '') as string,
          })))
        }
      } catch { /* ignore */ }
    })()
  }, [])

  const finData = useMemo((): FinData => ({ ...loadLocalData(), pensionList: pensionData }), [pensionData])

  const saveApiKey = (key: string) => {
    setApiKey(key)
    localStorage.setItem('claude_api_key', key)
    setShowSettings(false)
  }

  // 실제 데이터 기반 동적 시스템 프롬프트
  const buildContext = () => {
    const d = finData
    const totalIncome = d.incomeList.reduce((s, i) => s + i.amount, 0)
    const totalExpense = d.expenseList.reduce((s, i) => s + i.amount, 0)
    const totalDebt = d.debtList.reduce((s, i) => s + i.balance, 0)
    const totalMonthly = d.debtList.reduce((s, i) => s + i.monthly, 0)
    const pensionTotal = d.pensionList.filter(r => r.status !== 'cancelled').reduce((s, r) => s + r.total_revenue, 0)
    const pensionCount = d.pensionList.filter(r => r.status !== 'cancelled').length

    return `당신은 스토리팜의 AI 재무 관리사 SOL-CFO입니다. 친근하고 실용적인 조언을 한국어로 제공합니다.

현재 스토리팜 실시간 재무 현황:
- 수입 목록: ${d.incomeList.length}건, 합계 ${krw(totalIncome)}
- 지출 목록: ${d.expenseList.length}건, 합계 ${krw(totalExpense)}
- 영업이익: ${krw(totalIncome + pensionTotal - totalExpense)}
- 펜션 예약: ${pensionCount}건, 매출 ${krw(pensionTotal)}

채무 현황 (총 ${krw(totalDebt)}, 월 상환 ${krw(totalMonthly)}):
${d.debtList.map(dl => `- ${dl.name}: 잔액 ${krw(dl.balance)}, 연 ${dl.rate}%, 월 ${krw(dl.monthly)}${dl.dueDate ? `, 만기 ${dl.dueDate}` : ''}`).join('\n') || '- 등록된 채무 없음'}

수입 상세 (최근 10건):
${d.incomeList.slice(0, 10).map(i => `- ${i.date} ${i.counterparty || i.desc}: ${krw(i.amount)} (${i.biz}/${i.type})`).join('\n') || '- 등록된 수입 없음'}

지출 상세 (최근 10건):
${d.expenseList.slice(0, 10).map(e => `- ${e.date} ${e.desc}: ${krw(e.amount)} (${e.category})`).join('\n') || '- 등록된 지출 없음'}

펜션 예약 (최근 10건):
${d.pensionList.slice(0, 10).map(p => `- ${p.reservation_date} ${p.guest_name}: ${p.guest_count}명 ${p.stay_nights}박, ${krw(p.total_revenue)} [${p.status}]`).join('\n') || '- 예약 없음'}

답변은 간결하고 핵심 위주로 하되, 구체적인 숫자를 포함해주세요. 이모지는 쓰지 마세요.`
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const userMsg = { role: 'user' as const, text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    if (apiKey) {
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
            system: buildContext(),
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
        setMessages(prev => [...prev, { role: 'ai', text: `API 오류: ${errMsg}\n\n오프라인 모드로 답변합니다.\n\n${getSmartResponse(text, finData)}` }])
      }
    } else {
      await new Promise(r => setTimeout(r, 400))
      setMessages(prev => [...prev, { role: 'ai', text: getSmartResponse(text, finData) }])
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
            {!apiKey && <span className="text-[10px] text-[#f1c40f] font-normal ml-1">오프라인 모드 (실시간 데이터 분석)</span>}
          </h3>
        </div>

        <div ref={chatRef} className="h-72 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-[#8b8fa3] text-[12px] py-8">
              <Bot size={32} className="mx-auto mb-3 opacity-30" />
              <p>재무 관련 질문을 자유롭게 해보세요</p>
              {!apiKey && <p className="text-[10px] mt-1">API 키 없이도 실시간 데이터 기반 분석이 가능합니다</p>}
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

function getSmartResponse(q: string, d: FinData): string {
  const totalIncome = d.incomeList.reduce((s, i) => s + i.amount, 0)
  const totalExpense = d.expenseList.reduce((s, i) => s + i.amount, 0)
  const totalDebt = d.debtList.reduce((s, i) => s + i.balance, 0)
  const totalMonthlyDebt = d.debtList.reduce((s, i) => s + i.monthly, 0)
  const totalInterest = d.debtList.reduce((s, i) => s + Math.round(i.balance * i.rate / 100 / 12), 0)
  const activePension = d.pensionList.filter(r => r.status !== 'cancelled')
  const pensionTotal = activePension.reduce((s, r) => s + r.total_revenue, 0)
  const grandIncome = totalIncome + pensionTotal
  const profit = grandIncome - totalExpense

  // 매출 관련
  if (q.match(/매출|수입|수익|얼마/)) {
    const topIncome = [...d.incomeList].sort((a, b) => b.amount - a.amount).slice(0, 3)
    let res = `총 매출: ${krw(grandIncome)}\n- 수입(공방 등): ${krw(totalIncome)} (${d.incomeList.length}건)\n- 펜션 매출: ${krw(pensionTotal)} (${activePension.length}건)\n- 총 지출: ${krw(totalExpense)}\n- 순이익: ${krw(profit)}`
    if (q.match(/괜찮|어때/)) {
      res += profit >= 0 ? '\n\n현재 흑자 상태로 양호합니다.' : `\n\n현재 적자 ${krw(Math.abs(profit))}입니다. 지출 절감이나 매출 확대가 필요합니다.`
    }
    if (topIncome.length > 0) {
      res += '\n\n[매출 TOP 3]'
      topIncome.forEach((i, idx) => { res += `\n${idx + 1}위. ${i.counterparty || i.desc}: ${krw(i.amount)}` })
    }
    return res
  }

  // 매출 1위/누구
  if (q.match(/1위|누구|최대|가장.*많/)) {
    const rankMap = new Map<string, number>()
    d.incomeList.forEach(i => { const n = i.counterparty || i.desc || '기타'; rankMap.set(n, (rankMap.get(n) || 0) + i.amount) })
    activePension.forEach(r => { const n = r.guest_name || '미지정'; rankMap.set(n, (rankMap.get(n) || 0) + r.total_revenue) })
    const top = [...rankMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    if (top.length === 0) return '등록된 매출 데이터가 없습니다.'
    let res = '[매출 TOP 5]'
    top.forEach(([name, amt], i) => { res += `\n${i + 1}위. ${name}: ${krw(amt)}` })
    return res
  }

  // 채무/대출 관련
  if (q.match(/채무|대출|빚|상환|갚/)) {
    if (d.debtList.length === 0) return '등록된 채무가 없습니다.'
    let res = `총 채무 잔액: ${krw(totalDebt)}\n월 상환액: ${krw(totalMonthlyDebt)}\n월 이자: ${krw(totalInterest)}\n\n[채무 목록]`
    d.debtList.sort((a, b) => b.balance - a.balance).forEach(dl => {
      const mi = Math.round(dl.balance * dl.rate / 100 / 12)
      const principal = dl.monthly - mi
      const remainMonths = principal > 0 ? Math.ceil(dl.balance / principal) : 0
      res += `\n- ${dl.name}: ${krw(dl.balance)} (연 ${dl.rate}%, 월 ${krw(dl.monthly)})`
      if (remainMonths > 0) res += ` → 약 ${remainMonths}개월 후 완제`
      if (dl.dueDate) res += ` [만기 ${dl.dueDate}]`
    })
    const highRate = d.debtList.filter(dl => dl.rate >= 15).sort((a, b) => b.rate - a.rate)
    if (highRate.length > 0) {
      res += '\n\n[주의] 고금리 채무:'
      highRate.forEach(dl => { res += `\n- ${dl.name}: 연 ${dl.rate}% → 우선 상환 권장` })
    }
    return res
  }

  // 이자
  if (q.match(/이자/)) {
    if (d.debtList.length === 0) return '등록된 채무가 없어 이자 부담이 없습니다.'
    let res = `월 총 이자: ${krw(totalInterest)}\n연 총 이자: ${krw(totalInterest * 12)}\n\n[항목별]`
    d.debtList.sort((a, b) => (b.balance * b.rate) - (a.balance * a.rate)).forEach(dl => {
      const mi = Math.round(dl.balance * dl.rate / 100 / 12)
      res += `\n- ${dl.name}: 월 ${krw(mi)} (연 ${dl.rate}%)`
    })
    return res
  }

  // 고금리
  if (q.match(/고금리|높은.*이율|위험/)) {
    const sorted = [...d.debtList].sort((a, b) => b.rate - a.rate)
    if (sorted.length === 0) return '등록된 채무가 없습니다.'
    let res = '[금리 높은 순]'
    sorted.forEach(dl => { res += `\n- ${dl.name}: 연 ${dl.rate}%, 잔액 ${krw(dl.balance)}${dl.rate >= 15 ? ' ← 우선 상환 권장' : ''}` })
    return res
  }

  // 펜션 관련
  if (q.match(/펜션|예약|숙박|객실/)) {
    if (activePension.length === 0) return '현재 등록된 펜션 예약이 없습니다.'
    const totalGuests = activePension.reduce((s, r) => s + r.guest_count, 0)
    let res = `펜션 예약 현황: ${activePension.length}건\n총 매출: ${krw(pensionTotal)}\n총 인원: ${totalGuests}명\n\n[최근 예약]`
    activePension.slice(0, 10).forEach(r => {
      res += `\n- ${r.reservation_date} ${r.guest_name}: ${r.guest_count}명 ${r.stay_nights}박 → ${krw(r.total_revenue)}`
    })
    return res
  }

  // 지출 관련
  if (q.match(/지출|비용|경비|쓴|소비/)) {
    if (d.expenseList.length === 0) return '등록된 지출 내역이 없습니다.'
    const catMap = new Map<string, number>()
    d.expenseList.forEach(e => { catMap.set(e.category || '기타', (catMap.get(e.category || '기타') || 0) + e.amount) })
    const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1])
    let res = `총 지출: ${krw(totalExpense)} (${d.expenseList.length}건)\n\n[카테고리별]`
    sorted.forEach(([cat, amt]) => {
      const pct = totalExpense > 0 ? (amt / totalExpense * 100).toFixed(1) : '0'
      res += `\n- ${cat}: ${krw(amt)} (${pct}%)`
    })
    return res
  }

  // 급한/우선순위
  if (q.match(/급한|우선|중요|해야/)) {
    const items: string[] = []
    const highDebt = d.debtList.filter(dl => dl.rate >= 15).sort((a, b) => b.rate - a.rate)
    if (highDebt.length > 0) items.push(`고금리 채무 상환: ${highDebt.map(dl => `${dl.name} ${dl.rate}%`).join(', ')}`)
    if (profit < 0) items.push(`적자 해소: 현재 ${krw(Math.abs(profit))} 적자`)
    const upcoming = d.debtList.filter(dl => dl.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    if (upcoming.length > 0) items.push(`만기 임박: ${upcoming[0].name} (${upcoming[0].dueDate})`)
    if (activePension.length < 5) items.push('펜션 예약 확대: 현재 가동률 낮음')
    if (items.length === 0) return '현재 특별히 급한 사항은 없습니다. 재무 상태가 양호합니다.'
    let res = '[우선순위]'
    items.forEach((item, i) => { res += `\n${i + 1}. ${item}` })
    return res
  }

  // 요약/현황/전체
  if (q.match(/요약|현황|전체|알려|보여/)) {
    let res = `[스토리팜 재무 현황]\n\n총 매출: ${krw(grandIncome)}\n총 지출: ${krw(totalExpense)}\n순이익: ${krw(profit)}\n\n총 채무: ${krw(totalDebt)}\n월 상환: ${krw(totalMonthlyDebt)}\n월 이자: ${krw(totalInterest)}\n\n펜션 예약: ${activePension.length}건 (${krw(pensionTotal)})`
    if (profit >= 0) res += '\n\n현재 흑자 상태입니다.'
    else res += `\n\n현재 적자 상태입니다. 매출 확대 또는 지출 절감이 필요합니다.`
    return res
  }

  // 기본 응답 — 데이터 요약 제공
  return `질문을 이해하지 못했습니다. 아래와 같은 질문을 해보세요:\n\n- "이번달 매출 얼마야?"\n- "총 채무 알려줘"\n- "펜션 예약 현황"\n- "지출 가장 많은 항목은?"\n- "고금리 대출 뭐가 있어?"\n- "지금 제일 급한 게 뭐야?"\n- "전체 현황 알려줘"\n\n현재 데이터: 수입 ${d.incomeList.length}건, 지출 ${d.expenseList.length}건, 채무 ${d.debtList.length}건, 펜션 ${activePension.length}건`
}
