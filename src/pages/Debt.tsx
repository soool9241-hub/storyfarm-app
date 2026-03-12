import { useState, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AlertTriangle, Calculator, Plus, Pencil, Trash2, Upload, Download, Camera, Loader2, Image, X } from 'lucide-react'
import { krw } from '../lib/format'
import * as XLSX from 'xlsx'
import CrudModal from '../components/CrudModal'
import ConfirmDialog from '../components/ConfirmDialog'

type DebtItem = {
  id: string; name: string; totalLoan: number; paidAmount: number; balance: number; rate: number; monthly: number;
  payDay: number; dueDate: string; lastPaid: string; lastAmount: number; type: string
}

const DEFAULT_DEBTS: DebtItem[] = [
  { id: '1', name: 'OK저축은행', totalLoan: 15000000, paidAmount: 5949465, balance: 9050535, rate: 17.2, monthly: 721162, payDay: 9, dueDate: '2027-03-09', lastPaid: '2026-03-09', lastAmount: 721162, type: '대출' },
  { id: '2', name: '카드론', totalLoan: 3000000, paidAmount: 0, balance: 3000000, rate: 19.5, monthly: 250000, payDay: 25, dueDate: '', lastPaid: '', lastAmount: 0, type: '카드론' },
  { id: '3', name: '국민은행 일시상환', totalLoan: 10000000, paidAmount: 0, balance: 10000000, rate: 4.5, monthly: 37500, payDay: 15, dueDate: '2026-09-15', lastPaid: '2026-03-15', lastAmount: 37500, type: '대출' },
]

function loadSavedDebts(): DebtItem[] {
  try {
    const saved = localStorage.getItem('storyfarm_debt_list')
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, unknown>[]
      return parsed.map(d => ({
        ...d,
        totalLoan: (d.totalLoan as number) || (d.balance as number) || 0,
        paidAmount: (d.paidAmount as number) || 0,
      })) as DebtItem[]
    }
  } catch { /* ignore */ }
  return DEFAULT_DEBTS
}

const DEBT_FIELDS = [
  { key: 'name', label: '채무명', type: 'text' as const, placeholder: '예: OK저축은행' },
  { key: 'type', label: '유형', type: 'select' as const, options: ['대출', '카드론', '개인', '기타'] },
  { key: 'totalLoan', label: '총 대출금', type: 'number' as const, placeholder: '0' },
  { key: 'rate', label: '연이율 (%)', type: 'number' as const, placeholder: '0' },
  { key: 'paidAmount', label: '갚은 금액', type: 'number' as const, placeholder: '0' },
  { key: 'balance', label: '잔액 (자동계산)', type: 'number' as const, placeholder: '자동계산', readOnly: true },
  { key: 'monthly', label: '월 상환액', type: 'number' as const, placeholder: '0' },
  { key: 'payDay', label: '납부일 (1~31)', type: 'number' as const, placeholder: '1' },
  { key: 'dueDate', label: '만기일', type: 'date' as const },
]

const simData = [
  { month: '3월', 최소납부: 22050535, 추가50만: 22050535, 추가100만: 22050535 },
  { month: '6월', 최소납부: 20500000, 추가50만: 19000000, 추가100만: 17500000 },
  { month: '9월', 최소납부: 19000000, 추가50만: 16000000, 추가100만: 13000000 },
  { month: '12월', 최소납부: 17500000, 추가50만: 13000000, 추가100만: 8500000 },
  { month: '25/3월', 최소납부: 16000000, 추가50만: 10000000, 추가100만: 4000000 },
  { month: '25/6월', 최소납부: 14500000, 추가50만: 7000000, 추가100만: 0 },
]

function dDay(dateStr: string | null): string {
  if (!dateStr) return '-'
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`
}

function dDayColor(dateStr: string | null): string {
  if (!dateStr) return 'text-[#8b8fa3]'
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff <= 7) return 'text-[#e74c3c]'
  if (diff <= 30) return 'text-[#f1c40f]'
  if (diff <= 90) return 'text-[#e67e22]'
  return 'text-[#8b8fa3]'
}

export default function Debt() {
  const [debts, setDebts] = useState(loadSavedDebts)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scanRef = useRef<HTMLInputElement>(null)
  const [scanModal, setScanModal] = useState(false)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState<Record<string, string | number> | null>(null)
  const [scanError, setScanError] = useState('')

  // localStorage 저장
  useEffect(() => {
    localStorage.setItem('storyfarm_debt_list', JSON.stringify(debts))
  }, [debts])

  const openAdd = () => { setEditId(null); setForm({ name: '', type: '대출', totalLoan: 0, rate: 0, paidAmount: 0, balance: 0, monthly: 0, payDay: 1, dueDate: '' }); setModal(true) }
  const openEdit = (d: DebtItem) => { setEditId(d.id); setForm({ name: d.name, type: d.type, totalLoan: d.totalLoan, rate: d.rate, paidAmount: d.paidAmount, balance: d.balance, monthly: d.monthly, payDay: d.payDay, dueDate: d.dueDate || '' }); setModal(true) }

  // 총 대출금/갚은돈 변경시 잔액 자동 계산
  const handleFormChange = (key: string, value: string | number) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'totalLoan' || key === 'paidAmount') {
        const total = Number(next.totalLoan) || 0
        const paid = Number(next.paidAmount) || 0
        next.balance = Math.max(0, total - paid)
      }
      return next
    })
  }

  const save = () => {
    const totalLoan = Number(form.totalLoan) || 0
    const paidAmount = Number(form.paidAmount) || 0
    const balance = Math.max(0, totalLoan - paidAmount)
    if (editId) { setDebts(prev => prev.map(d => d.id === editId ? { ...d, ...form, totalLoan, paidAmount, balance, rate: Number(form.rate), monthly: Number(form.monthly), payDay: Number(form.payDay) } as DebtItem : d)) }
    else { setDebts(prev => [...prev, { id: Date.now().toString(), ...form, totalLoan, paidAmount, balance, rate: Number(form.rate), monthly: Number(form.monthly), payDay: Number(form.payDay), lastPaid: '', lastAmount: 0 } as DebtItem]) }
    setModal(false)
  }
  const confirmDelete = () => { if (deleteId) setDebts(prev => prev.filter(d => d.id !== deleteId)); setDeleteId(null) }

  // 사진 OCR 스캔
  const handleScanPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string
      setScanPreview(dataUrl)
      setScanModal(true)
      setScanResult(null)
      setScanError('')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const runOcr = async () => {
    if (!scanPreview) return
    const apiKey = localStorage.getItem('claude_api_key')
    if (!apiKey) {
      setScanError('Claude API 키가 필요합니다. AI 인사이트 탭에서 API 키를 먼저 설정해주세요.')
      return
    }
    setScanLoading(true)
    setScanError('')
    try {
      const base64 = scanPreview.split(',')[1]
      const mediaType = scanPreview.match(/data:(.*?);/)?.[1] || 'image/jpeg'
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
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: `이 이미지에서 대출/채무 관련 정보를 추출해주세요. 반드시 아래 JSON 형식으로만 응답하세요. 값을 찾을 수 없으면 빈 문자열이나 0으로 넣어주세요.

{"name":"채무명/대출기관명","type":"대출/카드론/개인/기타","totalLoan":총대출금(숫자만),"rate":연이율(숫자만),"paidAmount":상환금액(숫자만),"monthly":월상환액(숫자만),"payDay":납부일(숫자만),"dueDate":"만기일(YYYY-MM-DD)"}

JSON만 응답하세요. 다른 텍스트 없이.` }
            ]
          }]
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `API 오류 (${res.status})`)
      }
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      // JSON 추출
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('인식 결과에서 데이터를 추출할 수 없습니다.')
      const parsed = JSON.parse(jsonMatch[0])
      const totalLoan = Number(String(parsed.totalLoan).replace(/[^\d]/g, '')) || 0
      const paidAmount = Number(String(parsed.paidAmount).replace(/[^\d]/g, '')) || 0
      setScanResult({
        name: parsed.name || '',
        type: parsed.type || '대출',
        totalLoan,
        rate: Number(parsed.rate) || 0,
        paidAmount,
        balance: Math.max(0, totalLoan - paidAmount),
        monthly: Number(String(parsed.monthly).replace(/[^\d]/g, '')) || 0,
        payDay: Number(parsed.payDay) || 1,
        dueDate: parsed.dueDate || '',
      })
    } catch (err) {
      setScanError(err instanceof Error ? err.message : '인식 오류')
    }
    setScanLoading(false)
  }

  const applyScanResult = () => {
    if (!scanResult) return
    setEditId(null)
    setForm(scanResult)
    setScanModal(false)
    setScanPreview(null)
    setScanResult(null)
    setModal(true)
  }

  // 엑셀 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        const imported: DebtItem[] = rows.map(row => {
          const kv = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim(), String(v ?? '').trim()]))
          const balance = parseNum(kv['잔액'] || kv['balance'] || kv['대출잔액'] || '0')
          const totalLoan = parseNum(kv['총대출금'] || kv['대출금'] || kv['totalLoan'] || '0') || balance
          const paidAmount = parseNum(kv['갚은금액'] || kv['상환액'] || kv['paidAmount'] || '0')
          return {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            name: kv['채무명'] || kv['name'] || kv['대출명'] || '',
            type: kv['유형'] || kv['type'] || '대출',
            totalLoan,
            paidAmount,
            balance,
            rate: parseFloat(kv['연이율'] || kv['이율'] || kv['rate'] || '0') || 0,
            monthly: parseNum(kv['월상환액'] || kv['월상환'] || kv['monthly'] || '0'),
            payDay: parseInt(kv['납부일'] || kv['payDay'] || '1') || 1,
            dueDate: kv['만기일'] || kv['dueDate'] || '',
            lastPaid: '',
            lastAmount: 0,
          }
        }).filter(d => d.name && d.balance > 0)
        if (imported.length > 0) {
          setDebts(prev => [...prev, ...imported])
          alert(`${imported.length}건 가져왔습니다.`)
        } else {
          alert('파싱 가능한 데이터가 없습니다.\n컬럼: 채무명, 유형, 잔액, 연이율, 월상환액, 납부일, 만기일')
        }
      } catch {
        alert('파일 읽기 오류')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // 내보내기
  const handleExport = () => {
    const exportData = debts.map(d => ({
      '채무명': d.name,
      '유형': d.type,
      '잔액': d.balance,
      '연이율(%)': d.rate,
      '월상환액': d.monthly,
      '납부일': d.payDay,
      '만기일': d.dueDate || '',
      '월이자': Math.round(d.balance * d.rate / 100 / 12),
      '최근납부일': d.lastPaid || '',
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '채무내역')
    XLSX.writeFile(wb, `스토리팜_채무내역_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0)
  const totalMonthly = debts.reduce((s, d) => s + d.monthly, 0)
  const totalInterest = debts.reduce((s, d) => s + Math.round(d.balance * d.rate / 100 / 12), 0)
  // 상환율 = 상환된 금액 / (상환된 금액 + 잔액) 추정
  const totalPaidEstimate = debts.reduce((s, d) => {
    if (!d.dueDate) return s
    const dueMs = new Date(d.dueDate).getTime()
    const nowMs = Date.now()
    // 만기까지 남은 개월
    const remainMonths = Math.max(0, (dueMs - nowMs) / (30.44 * 86400000))
    // 전체 대출 기간 추정: 잔액 / (월상환 - 월이자) 로 역산
    const monthlyInt = d.balance * d.rate / 100 / 12
    const principal = d.monthly - monthlyInt
    if (principal <= 0) return s
    const totalMonths = d.balance / principal + remainMonths
    const paidMonths = totalMonths - remainMonths
    return s + d.monthly * Math.max(0, paidMonths)
  }, 0)
  const repaymentRate = totalDebt > 0 ? Math.min(100, Math.max(0, (totalPaidEstimate / (totalPaidEstimate + totalDebt)) * 100)) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">대출·채무 관리</h2>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          <input ref={scanRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanPhoto} />
          <button onClick={() => scanRef.current?.click()} className="flex items-center gap-1.5 bg-[#3498db] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#2980b9] transition-colors">
            <Camera size={16} /> 사진 인식
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 bg-[#e67e22] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#d35400] transition-colors">
            <Upload size={16} /> 엑셀
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 bg-[#9b59b6] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#8e44ad] transition-colors">
            <Download size={16} /> 내보내기
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50] transition-colors">
            <Plus size={16} /> 수기 등록
          </button>
        </div>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">총 채무 잔액</div>
          <div className="text-xl font-bold text-[#e74c3c]">{krw(totalDebt)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">월 상환액</div>
          <div className="text-xl font-bold text-[#f1c40f]">{krw(totalMonthly)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">월 이자 부담</div>
          <div className="text-xl font-bold text-[#e67e22]">{krw(totalInterest)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">상환율</div>
          <div className="text-xl font-bold text-[#4CAF50]">{repaymentRate.toFixed(1)}%</div>
          <div className="mt-2 h-2 bg-[#0f1117] rounded-full overflow-hidden">
            <div className="h-full bg-[#4CAF50] rounded-full transition-all duration-500" style={{ width: `${repaymentRate}%` }} />
          </div>
        </div>
      </div>

      {/* 채무 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {debts.map(d => {
          const monthlyInterest = Math.round(d.balance * d.rate / 100 / 12)
          const principal = d.monthly - monthlyInterest
          // 개별 상환율 계산
          let debtRepayRate = 0
          if (d.dueDate && principal > 0) {
            const remainMonths = Math.max(0, (new Date(d.dueDate).getTime() - Date.now()) / (30.44 * 86400000))
            const totalMonths = d.balance / principal + remainMonths
            const paidMonths = totalMonths - remainMonths
            const paidAmount = d.monthly * Math.max(0, paidMonths)
            debtRepayRate = Math.min(100, Math.max(0, (paidAmount / (paidAmount + d.balance)) * 100))
          }
          return (
            <div key={d.id} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 hover:border-[#2E7D32] transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-sm">{d.name}</h4>
                  <span className="text-[10px] text-[#8b8fa3]">{d.type} · 연 {d.rate}%</span>
                </div>
                <div className="flex items-center gap-1">
                  {d.rate >= 15 && <AlertTriangle size={16} className="text-[#e74c3c]" />}
                  <button onClick={() => openEdit(d)} className="p-1 text-[#8b8fa3] hover:text-[#3498db] transition-colors" title="수정"><Pencil size={13} /></button>
                  <button onClick={() => setDeleteId(d.id)} className="p-1 text-[#8b8fa3] hover:text-[#e74c3c] transition-colors" title="삭제"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="text-2xl font-bold text-[#e74c3c] mb-1 tabular-nums">{krw(d.balance)}</div>
              {d.dueDate && (
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#8b8fa3]">상환율</span>
                    <span className="text-[#4CAF50] font-medium">{debtRepayRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${debtRepayRate}%`, backgroundColor: debtRepayRate >= 70 ? '#4CAF50' : debtRepayRate >= 40 ? '#f1c40f' : '#e74c3c' }} />
                  </div>
                </div>
              )}
              <div className="space-y-1.5 text-[12px]">
                {d.totalLoan > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#8b8fa3]">총 대출금</span>
                    <span className="tabular-nums">{krw(d.totalLoan)}</span>
                  </div>
                )}
                {d.paidAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#8b8fa3]">갚은 금액</span>
                    <span className="text-[#4CAF50] tabular-nums">{krw(d.paidAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#8b8fa3]">월 상환</span>
                  <span className="tabular-nums">{krw(d.monthly)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b8fa3]">월 이자</span>
                  <span className="text-[#e67e22] tabular-nums">{krw(monthlyInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b8fa3]">납부일</span>
                  <span>매월 {d.payDay}일</span>
                </div>
                {d.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-[#8b8fa3]">만기</span>
                    <span className={`font-medium ${dDayColor(d.dueDate)}`}>{d.dueDate} ({dDay(d.dueDate)})</span>
                  </div>
                )}
                {d.lastPaid && (
                  <div className="flex justify-between">
                    <span className="text-[#8b8fa3]">최근 납부</span>
                    <span className="text-[#4CAF50]">{d.lastPaid} ✓</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 상환 시뮬레이션 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a] flex items-center gap-2">
          <Calculator size={16} className="text-[#4CAF50]" />
          고금리 우선 상환 시뮬레이션
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-[#0f1117] rounded-lg p-3 text-center">
            <div className="text-[10px] text-[#8b8fa3] mb-1">시나리오 A: 최소납부</div>
            <div className="text-sm font-bold text-[#e74c3c]">완제 2027년 5월</div>
            <div className="text-[11px] text-[#8b8fa3]">총이자 806,327원</div>
          </div>
          <div className="bg-[#0f1117] rounded-lg p-3 text-center border border-[#f1c40f]/30">
            <div className="text-[10px] text-[#f1c40f] mb-1">시나리오 B: +50만원</div>
            <div className="text-sm font-bold text-[#f1c40f]">완제 2026년 10월</div>
            <div className="text-[11px] text-[#8b8fa3]">이자절감 242,513원</div>
          </div>
          <div className="bg-[#0f1117] rounded-lg p-3 text-center border border-[#4CAF50]/30">
            <div className="text-[10px] text-[#4CAF50] mb-1">시나리오 C: +100만원</div>
            <div className="text-sm font-bold text-[#4CAF50]">완제 2026년 10월</div>
            <div className="text-[11px] text-[#8b8fa3]">이자절감 310,580원</div>
          </div>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="month" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }} formatter={(v) => krw(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="최소납부" stroke="#e74c3c" fill="#e74c3c" fillOpacity={0.1} />
              <Area type="monotone" dataKey="추가50만" stroke="#f1c40f" fill="#f1c40f" fillOpacity={0.1} />
              <Area type="monotone" dataKey="추가100만" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* 사진 OCR 스캔 모달 */}
      {scanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#2a2d3a]">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Image size={16} className="text-[#3498db]" /> 대출 서류 인식</h3>
              <button onClick={() => { setScanModal(false); setScanPreview(null); setScanResult(null); setScanError('') }} className="text-[#8b8fa3] hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              {scanPreview && <img src={scanPreview} alt="스캔" className="w-full rounded-lg max-h-48 object-contain bg-black" />}

              {!scanResult && !scanLoading && (
                <button onClick={runOcr} className="w-full flex items-center justify-center gap-2 bg-[#3498db] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#2980b9]">
                  <Camera size={16} /> AI 인식 시작
                </button>
              )}

              {scanLoading && (
                <div className="flex items-center justify-center gap-2 py-4 text-[#8b8fa3] text-[12px]">
                  <Loader2 size={16} className="animate-spin" /> Claude AI가 서류를 분석 중...
                </div>
              )}

              {scanError && (
                <div className="text-[11px] text-[#e74c3c] bg-[#e74c3c]/10 rounded-lg p-3">{scanError}</div>
              )}

              {scanResult && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#4CAF50] font-medium mb-2">인식 완료! 아래 내용을 확인하세요.</div>
                  <div className="bg-[#0f1117] rounded-lg p-3 space-y-1.5 text-[12px]">
                    <div className="flex justify-between"><span className="text-[#8b8fa3]">채무명</span><span>{scanResult.name || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-[#8b8fa3]">유형</span><span>{scanResult.type || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-[#8b8fa3]">총 대출금</span><span className="tabular-nums">{krw(Number(scanResult.totalLoan))}</span></div>
                    <div className="flex justify-between"><span className="text-[#8b8fa3]">연이율</span><span>{scanResult.rate}%</span></div>
                    <div className="flex justify-between"><span className="text-[#8b8fa3]">갚은 금액</span><span className="text-[#4CAF50] tabular-nums">{krw(Number(scanResult.paidAmount))}</span></div>
                    <div className="flex justify-between"><span className="text-[#8b8fa3]">잔액</span><span className="text-[#e74c3c] tabular-nums">{krw(Number(scanResult.balance))}</span></div>
                    <div className="flex justify-between"><span className="text-[#8b8fa3]">월 상환</span><span className="tabular-nums">{krw(Number(scanResult.monthly))}</span></div>
                    <div className="flex justify-between"><span className="text-[#8b8fa3]">납부일</span><span>매월 {scanResult.payDay}일</span></div>
                    {scanResult.dueDate && <div className="flex justify-between"><span className="text-[#8b8fa3]">만기일</span><span>{scanResult.dueDate}</span></div>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setScanResult(null); setScanError('') }} className="flex-1 border border-[#2a2d3a] text-[#8b8fa3] py-2 rounded-lg text-[12px] hover:text-white">다시 인식</button>
                    <button onClick={applyScanResult} className="flex-1 bg-[#2E7D32] text-white py-2 rounded-lg text-[12px] font-medium hover:bg-[#4CAF50]">등록하기</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CrudModal open={modal} title={editId ? '채무 수정' : '채무 등록'} fields={DEBT_FIELDS} values={form} onChange={handleFormChange} onSave={save} onClose={() => setModal(false)} />
      <ConfirmDialog open={!!deleteId} message="이 채무를 삭제하시겠습니까?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  )
}

function parseNum(val: string): number {
  return Math.abs(Math.round(Number(String(val).replace(/[^\d.-]/g, '')))) || 0
}
