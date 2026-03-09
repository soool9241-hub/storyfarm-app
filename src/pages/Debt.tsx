import { useState, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AlertTriangle, Calculator, Plus, Pencil, Trash2, Upload, Download } from 'lucide-react'
import { krw } from '../lib/format'
import * as XLSX from 'xlsx'
import CrudModal from '../components/CrudModal'
import ConfirmDialog from '../components/ConfirmDialog'

type DebtItem = {
  id: string; name: string; balance: number; rate: number; monthly: number;
  payDay: number; dueDate: string; lastPaid: string; lastAmount: number; type: string
}

const DEFAULT_DEBTS: DebtItem[] = [
  { id: '1', name: 'OK저축은행', balance: 9050535, rate: 17.2, monthly: 721162, payDay: 9, dueDate: '2027-03-09', lastPaid: '2026-03-09', lastAmount: 721162, type: '대출' },
  { id: '2', name: '카드론', balance: 3000000, rate: 19.5, monthly: 250000, payDay: 25, dueDate: '', lastPaid: '', lastAmount: 0, type: '카드론' },
  { id: '3', name: '국민은행 일시상환', balance: 10000000, rate: 4.5, monthly: 37500, payDay: 15, dueDate: '2026-09-15', lastPaid: '2026-03-15', lastAmount: 37500, type: '대출' },
]

function loadSavedDebts(): DebtItem[] {
  try {
    const saved = localStorage.getItem('storyfarm_debt_list')
    if (saved) return JSON.parse(saved) as DebtItem[]
  } catch { /* ignore */ }
  return DEFAULT_DEBTS
}

const DEBT_FIELDS = [
  { key: 'name', label: '채무명', type: 'text' as const, placeholder: '예: OK저축은행' },
  { key: 'type', label: '유형', type: 'select' as const, options: ['대출', '카드론', '개인', '기타'] },
  { key: 'balance', label: '잔액', type: 'number' as const, placeholder: '0' },
  { key: 'rate', label: '연이율 (%)', type: 'number' as const, placeholder: '0' },
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

  // localStorage 저장
  useEffect(() => {
    localStorage.setItem('storyfarm_debt_list', JSON.stringify(debts))
  }, [debts])

  const openAdd = () => { setEditId(null); setForm({ name: '', type: '대출', balance: 0, rate: 0, monthly: 0, payDay: 1, dueDate: '' }); setModal(true) }
  const openEdit = (d: DebtItem) => { setEditId(d.id); setForm({ name: d.name, type: d.type, balance: d.balance, rate: d.rate, monthly: d.monthly, payDay: d.payDay, dueDate: d.dueDate || '' }); setModal(true) }
  const save = () => {
    if (editId) { setDebts(prev => prev.map(d => d.id === editId ? { ...d, ...form, balance: Number(form.balance), rate: Number(form.rate), monthly: Number(form.monthly), payDay: Number(form.payDay) } as DebtItem : d)) }
    else { setDebts(prev => [...prev, { id: Date.now().toString(), ...form, balance: Number(form.balance), rate: Number(form.rate), monthly: Number(form.monthly), payDay: Number(form.payDay), lastPaid: '', lastAmount: 0 } as DebtItem]) }
    setModal(false)
  }
  const confirmDelete = () => { if (deleteId) setDebts(prev => prev.filter(d => d.id !== deleteId)); setDeleteId(null) }

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
          return {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            name: kv['채무명'] || kv['name'] || kv['대출명'] || '',
            type: kv['유형'] || kv['type'] || '대출',
            balance: parseNum(kv['잔액'] || kv['balance'] || kv['대출잔액'] || '0'),
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">대출·채무 관리</h2>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 bg-[#e67e22] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#d35400] transition-colors">
            <Upload size={16} /> 엑셀 업로드
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      </div>

      {/* 채무 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {debts.map(d => {
          const monthlyInterest = Math.round(d.balance * d.rate / 100 / 12)
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
              <div className="text-2xl font-bold text-[#e74c3c] mb-3 tabular-nums">{krw(d.balance)}</div>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#8b8fa3]">월 상환</span>
                  <span>{krw(d.monthly)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b8fa3]">월 이자</span>
                  <span className="text-[#e67e22]">{krw(monthlyInterest)}</span>
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
      <CrudModal open={modal} title={editId ? '채무 수정' : '채무 등록'} fields={DEBT_FIELDS} values={form} onChange={(k, v) => setForm(p => ({ ...p, [k]: v }))} onSave={save} onClose={() => setModal(false)} />
      <ConfirmDialog open={!!deleteId} message="이 채무를 삭제하시겠습니까?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  )
}

function parseNum(val: string): number {
  return Math.abs(Math.round(Number(String(val).replace(/[^\d.-]/g, '')))) || 0
}
