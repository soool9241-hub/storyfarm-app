import { useState, useEffect, useRef } from 'react'
import { Plus, Camera, MessageSquare, Pencil, Trash2, Image, Search, Upload, Download, ChevronLeft, ChevronRight, ArrowUpDown, CheckSquare, Square, X, Link2 } from 'lucide-react'
import { krw } from '../lib/format'
import * as XLSX from 'xlsx'
import CrudModal from '../components/CrudModal'
import ConfirmDialog from '../components/ConfirmDialog'
import LinkImport from '../components/LinkImport'

type ExpenseItem = {
  id: string; date: string; category: string; desc: string; amount: number; method: string; biz: string
}

const DEFAULT_EXPENSES: ExpenseItem[] = [
  { id: '1', date: '2026-03-09', category: '대출상환', desc: 'OK저축은행 3월', amount: 721162, method: '계좌이체', biz: '공통' },
  { id: '2', date: '2026-03-07', category: '재료비', desc: 'SUS304 50kg', amount: 520000, method: '국민카드', biz: '공방' },
  { id: '3', date: '2026-03-05', category: '공과금', desc: '전기요금', amount: 185000, method: '계좌이체', biz: '공통' },
  { id: '4', date: '2026-03-04', category: '재료비', desc: 'AL6061 30kg', amount: 312000, method: '국민카드', biz: '공방' },
  { id: '5', date: '2026-03-03', category: '운영비', desc: '인터넷·전화', amount: 55000, method: '계좌이체', biz: '공통' },
  { id: '6', date: '2026-03-02', category: '식대', desc: '직원 회식', amount: 120000, method: '신한카드', biz: '공방' },
  { id: '7', date: '2026-03-01', category: '임대료', desc: '공방 월세', amount: 800000, method: '계좌이체', biz: '공방' },
]

function loadSaved(): ExpenseItem[] {
  try { const s = localStorage.getItem('storyfarm_expense_list'); if (s) return JSON.parse(s) } catch {} return DEFAULT_EXPENSES
}

const budgetData = [
  { category: '재료비', budget: 2000000, spent: 832000 },
  { category: '인건비', budget: 2000000, spent: 0 },
  { category: '임대료', budget: 800000, spent: 800000 },
  { category: '공과금', budget: 400000, spent: 185000 },
  { category: '식대·교통', budget: 300000, spent: 120000 },
]

const CATEGORIES = ['전체', '재료비', '인건비', '임대료', '공과금', '장비', '마케팅', '세금', '식대·교통', '대출상환', '운영비', '기타']
const METHODS = ['전체', '국민카드', '신한카드', '계좌이체', '현금']
const BIZ_TYPES = ['전체', '공방', '펜션', '개인', '공통']
const PAGE_SIZE = 20

const FIELDS = [
  { key: 'date', label: '날짜', type: 'date' as const },
  { key: 'category', label: '카테고리', type: 'select' as const, options: CATEGORIES.filter(c => c !== '전체') },
  { key: 'amount', label: '금액', type: 'number' as const, placeholder: '0' },
  { key: 'method', label: '결제수단', type: 'select' as const, options: METHODS.filter(c => c !== '전체') },
  { key: 'desc', label: '내용', type: 'textarea' as const, placeholder: '내용을 입력하세요' },
  { key: 'biz', label: '사업 구분', type: 'select' as const, options: BIZ_TYPES.filter(c => c !== '전체') },
]

export default function Expense() {
  const [list, setList] = useState(loadSaved)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanModal, setScanModal] = useState(false)
  const [smsModal, setSmsModal] = useState(false)
  const [smsText, setSmsText] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const csvRef = useRef<HTMLInputElement>(null)

  // 필터
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterCategory, setFilterCategory] = useState('전체')
  const [filterMethod, setFilterMethod] = useState('전체')
  const [filterBiz, setFilterBiz] = useState('전체')
  const [searchWord, setSearchWord] = useState('')
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => { localStorage.setItem('storyfarm_expense_list', JSON.stringify(list)) }, [list])

  // 필터링 + 정렬
  const filtered = list.filter(i => {
    if (dateFrom && i.date < dateFrom) return false
    if (dateTo && i.date > dateTo) return false
    if (filterCategory !== '전체' && i.category !== filterCategory) return false
    if (filterMethod !== '전체' && i.method !== filterMethod) return false
    if (filterBiz !== '전체' && i.biz !== filterBiz) return false
    if (searchWord && !i.desc.includes(searchWord) && !i.category.includes(searchWord) && !i.method.includes(searchWord)) return false
    return true
  }).sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'date') return mul * a.date.localeCompare(b.date)
    return mul * (a.amount - b.amount)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const filteredTotal = filtered.reduce((s, i) => s + i.amount, 0)

  const toggleSort = (key: 'date' | 'amount') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => { const ids = paged.map(i => i.id); setSelected(prev => ids.every(id => prev.has(id)) ? new Set() : new Set([...prev, ...ids])) }
  const deleteSelected = () => { setList(prev => prev.filter(i => !selected.has(i.id))); setSelected(new Set()) }

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setFilterCategory('전체'); setFilterMethod('전체'); setFilterBiz('전체'); setSearchWord(''); setPage(1) }

  const openAdd = () => { setEditId(null); setForm({ date: new Date().toISOString().slice(0, 10), category: '재료비', amount: 0, method: '국민카드', desc: '', biz: '공방' }); setModal(true) }
  const openEdit = (item: ExpenseItem) => { setEditId(item.id); setForm({ date: item.date, category: item.category, amount: item.amount, method: item.method, desc: item.desc, biz: item.biz }); setModal(true) }
  const save = () => {
    if (editId) setList(prev => prev.map(i => i.id === editId ? { ...i, ...form, amount: Number(form.amount) } as ExpenseItem : i))
    else setList(prev => [{ id: Date.now().toString(), ...form, amount: Number(form.amount) } as ExpenseItem, ...prev])
    setModal(false)
  }
  const confirmDelete = () => { if (deleteId) setList(prev => prev.filter(i => i.id !== deleteId)); setDeleteId(null) }

  const handleReceiptScan = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { setScanPreview(r.result as string); setScanModal(true) }; r.readAsDataURL(f); e.target.value = '' }
  const applyReceiptScan = () => { setEditId(null); setForm({ date: new Date().toISOString().slice(0, 10), category: '재료비', amount: 0, method: '국민카드', desc: '(영수증 스캔) ', biz: '공방' }); setScanModal(false); setScanPreview(null); setModal(true) }
  const parseSms = () => {
    const amtM = smsText.match(/([\d,]+)원/); const amt = amtM ? Number(amtM[1].replace(/,/g, '')) : 0
    const dtM = smsText.match(/(\d{2})\/(\d{2})/) || smsText.match(/(\d{2})월\s*(\d{2})일/)
    const now = new Date(); const dt = dtM ? `${now.getFullYear()}-${dtM[1].padStart(2, '0')}-${dtM[2].padStart(2, '0')}` : now.toISOString().slice(0, 10)
    const method = /국민|KB/.test(smsText) ? '국민카드' : /신한/.test(smsText) ? '신한카드' : '국민카드'
    const dM = smsText.match(/\]\s*(.+?)(?:\s|$)/) || smsText.match(/승인\s+(.+?)(?:\s|$)/)
    setEditId(null); setForm({ date: dt, category: '기타', amount: amt, method, desc: dM ? dM[1] : '(문자 파싱)', biz: '공방' }); setSmsModal(false); setSmsText(''); setModal(true)
  }

  // 링크 가져오기
  const handleLinkImport = (rows: Record<string, string>[]) => {
    const items: ExpenseItem[] = rows.map(row => {
      const vals = Object.values(row)
      const keys = Object.keys(row)
      const kv = Object.fromEntries(keys.map((k, i) => [k, vals[i]]))
      return {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        date: kv['날짜'] || kv['거래일'] || kv['date'] || vals[0] || new Date().toISOString().slice(0, 10),
        category: kv['카테고리'] || kv['분류'] || kv['category'] || vals[1] || '기타',
        desc: kv['내용'] || kv['설명'] || kv['desc'] || vals[2] || '',
        amount: Math.round(Number(String(kv['금액'] || kv['amount'] || vals[3] || '0').replace(/[^\d.-]/g, ''))) || 0,
        method: kv['결제수단'] || kv['method'] || vals[4] || '기타',
        biz: kv['사업구분'] || kv['biz'] || vals[5] || '공통',
      }
    }).filter(i => i.amount > 0)
    if (items.length > 0) {
      setList(prev => [...items, ...prev])
      alert(`${items.length}건 가져왔습니다.`)
    }
  }

  // CSV 업로드
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        const imported: ExpenseItem[] = rows.map(row => {
          const kv = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim(), String(v ?? '').trim()]))
          return { id: Date.now().toString() + Math.random().toString(36).slice(2, 6), date: kv['날짜'] || kv['date'] || '', category: kv['카테고리'] || kv['category'] || '기타', desc: kv['내용'] || kv['desc'] || '', amount: Math.round(Number(String(kv['금액'] || kv['amount'] || '0').replace(/[^\d.-]/g, ''))) || 0, method: kv['결제수단'] || kv['method'] || '현금', biz: kv['사업구분'] || kv['biz'] || '공방' }
        }).filter(i => i.date && i.amount > 0)
        if (imported.length > 0) { setList(prev => [...imported, ...prev]); alert(`${imported.length}건 가져왔습니다.`) }
        else alert('파싱 가능한 데이터가 없습니다.\n컬럼: 날짜, 카테고리, 금액, 결제수단, 내용, 사업구분')
      } catch { alert('파일 읽기 오류') }
    }
    reader.readAsArrayBuffer(file); e.target.value = ''
  }

  // 내보내기
  const handleExport = () => {
    const data = filtered.map(i => ({ '날짜': i.date, '카테고리': i.category, '내용': i.desc, '결제수단': i.method, '사업구분': i.biz, '금액': i.amount }))
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '지출내역')
    XLSX.writeFile(wb, `스토리팜_지출내역_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const selClass = "bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#2E7D32]"
  const hasFilters = dateFrom || dateTo || filterCategory !== '전체' || filterMethod !== '전체' || filterBiz !== '전체' || searchWord

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">지출 관리</h2>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptScan} />
          <input ref={csvRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCsvUpload} />
          <button onClick={() => setLinkOpen(true)} className="flex items-center gap-1 bg-[#1abc9c] text-white px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:bg-[#16a085]"><Link2 size={14} /> 링크</button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 bg-[#3498db] text-white px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:bg-[#2980b9]"><Camera size={14} /> 영수증</button>
          <button onClick={() => setSmsModal(true)} className="flex items-center gap-1 bg-[#9b59b6] text-white px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:bg-[#8e44ad]"><MessageSquare size={14} /> 문자</button>
          <button onClick={() => csvRef.current?.click()} className="flex items-center gap-1 bg-[#e67e22] text-white px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:bg-[#d35400]"><Upload size={14} /> 업로드</button>
          <button onClick={handleExport} className="flex items-center gap-1 bg-[#8b8fa3]/20 text-[#8b8fa3] px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:text-white"><Download size={14} /> 내보내기</button>
          <button onClick={openAdd} className="flex items-center gap-1 bg-[#2E7D32] text-white px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:bg-[#4CAF50]"><Plus size={14} /> 등록</button>
        </div>
      </div>

      {/* 검색 필터 바 (JOBIS 스타일) */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[#8b8fa3] shrink-0">기간</span>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className={selClass + ' w-[130px] [color-scheme:dark]'} />
            <span className="text-[#8b8fa3]">~</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className={selClass + ' w-[130px] [color-scheme:dark]'} />
          </div>
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1) }} className={selClass}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <select value={filterMethod} onChange={e => { setFilterMethod(e.target.value); setPage(1) }} className={selClass}>{METHODS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <select value={filterBiz} onChange={e => { setFilterBiz(e.target.value); setPage(1) }} className={selClass}>{BIZ_TYPES.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <div className="relative flex-1 min-w-[120px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b8fa3]" />
            <input value={searchWord} onChange={e => { setSearchWord(e.target.value); setPage(1) }} placeholder="검색어" className={selClass + ' w-full pl-7'} />
          </div>
          {hasFilters && <button onClick={clearFilters} className="text-[10px] text-[#e74c3c] hover:text-white flex items-center gap-0.5"><X size={12} /> 초기화</button>}
        </div>
      </div>

      {/* 합계 요약 바 */}
      <div className="flex items-center justify-between bg-[#1a1d27] border border-[#2a2d3a] rounded-xl px-4 py-2.5">
        <span className="text-[11px] text-[#8b8fa3]">
          검색결과 <span className="text-white font-medium">{filtered.length}</span>건
          {selected.size > 0 && <span className="ml-2 text-[#3498db]">({selected.size}건 선택)</span>}
        </span>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button onClick={deleteSelected} className="text-[11px] text-[#e74c3c] hover:text-white flex items-center gap-1"><Trash2 size={12} /> 선택 삭제</button>
          )}
          <span className="text-[12px] font-medium">합계 <span className="text-[#e74c3c]">{krw(filteredTotal)}</span></span>
        </div>
      </div>

      {/* 예산 관리 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">카테고리별 예산</h3>
        <div className="space-y-3">
          {budgetData.map(b => {
            const pct = (b.spent / b.budget) * 100; const over = pct > 100
            return (
              <div key={b.category}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span>{b.category}</span>
                  <span className={over ? 'text-[#e74c3c] font-medium' : 'text-[#8b8fa3]'}>{krw(b.spent)} / {krw(b.budget)} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-[#2a2d3a] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${over ? 'bg-[#e74c3c]' : pct > 80 ? 'bg-[#f1c40f]' : 'bg-[#2E7D32]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 지출 목록 테이블 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[650px]">
            <thead>
              <tr className="border-b-2 border-[#2a2d3a]">
                <th className="py-2 px-2 w-8">
                  <button onClick={toggleAll} className="text-[#8b8fa3] hover:text-white">
                    {paged.length > 0 && paged.every(i => selected.has(i.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <span className="flex items-center gap-1">날짜 <ArrowUpDown size={11} className={sortKey === 'date' ? 'text-[#4CAF50]' : ''} /></span>
                </th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">카테고리</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">내용</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">결제</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">구분</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <span className="flex items-center justify-end gap-1">금액 <ArrowUpDown size={11} className={sortKey === 'amount' ? 'text-[#4CAF50]' : ''} /></span>
                </th>
                <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(e => (
                <tr key={e.id} className={`border-b border-[#2a2d3a]/50 hover:bg-[#22252f] ${selected.has(e.id) ? 'bg-[#2E7D32]/5' : ''}`}>
                  <td className="py-2 px-2"><button onClick={() => toggleSelect(e.id)} className="text-[#8b8fa3] hover:text-white">{selected.has(e.id) ? <CheckSquare size={14} className="text-[#4CAF50]" /> : <Square size={14} />}</button></td>
                  <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{e.date}</td>
                  <td className="py-2 px-2"><span className="text-[10px] bg-[#2a2d3a] px-2 py-0.5 rounded-full">{e.category}</span></td>
                  <td className="py-2 px-2 max-w-[180px] truncate">{e.desc}</td>
                  <td className="py-2 px-2 text-[#8b8fa3]">{e.method}</td>
                  <td className="py-2 px-2"><span className="text-[10px] text-[#8b8fa3]">{e.biz}</span></td>
                  <td className="py-2 px-2 text-right text-[#e74c3c] tabular-nums font-medium">{krw(e.amount)}</td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(e)} className="p-1 text-[#8b8fa3] hover:text-[#3498db] transition-colors" title="수정"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(e.id)} className="p-1 text-[#8b8fa3] hover:text-[#e74c3c] transition-colors" title="삭제"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-[#8b8fa3] text-[12px]">검색 결과가 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-[#2a2d3a]">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 text-[#8b8fa3] hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded text-[11px] ${p === page ? 'bg-[#2E7D32] text-white' : 'text-[#8b8fa3] hover:text-white'}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 text-[#8b8fa3] hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* 영수증 스캔 모달 */}
      {scanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setScanModal(false); setScanPreview(null) }}>
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Image size={16} className="text-[#3498db]" /> 영수증 스캔</h3>
            {scanPreview && <img src={scanPreview} alt="영수증" className="w-full rounded-lg mb-3 max-h-60 object-contain bg-black" />}
            <p className="text-[11px] text-[#8b8fa3] mb-3">영수증 이미지가 인식되었습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => { setScanModal(false); setScanPreview(null) }} className="flex-1 border border-[#2a2d3a] text-[#8b8fa3] py-2 rounded-lg text-sm hover:text-white">취소</button>
              <button onClick={applyReceiptScan} className="flex-1 bg-[#3498db] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#2980b9]">입력하기</button>
            </div>
          </div>
        </div>
      )}
      {/* 문자 파싱 모달 */}
      {smsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSmsModal(false)}>
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare size={16} className="text-[#9b59b6]" /> 카드 결제 문자 파싱</h3>
            <p className="text-[11px] text-[#8b8fa3] mb-2">카드 결제 문자를 붙여넣기 하세요</p>
            <textarea value={smsText} onChange={e => setSmsText(e.target.value)} placeholder="예) [KB국민카드] 홍길동 123,000원 03/10 12:30 스타벅스 승인" className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#9b59b6] h-24 resize-none" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setSmsModal(false)} className="flex-1 border border-[#2a2d3a] text-[#8b8fa3] py-2 rounded-lg text-sm hover:text-white">취소</button>
              <button onClick={parseSms} disabled={!smsText.trim()} className="flex-1 bg-[#9b59b6] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#8e44ad] disabled:opacity-50">파싱하기</button>
            </div>
          </div>
        </div>
      )}

      <CrudModal open={modal} title={editId ? '지출 수정' : '지출 등록'} fields={FIELDS} values={form} onChange={(k, v) => setForm(p => ({ ...p, [k]: v }))} onSave={save} onClose={() => setModal(false)} />
      <ConfirmDialog open={!!deleteId} message="이 지출 내역을 삭제하시겠습니까?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
      <LinkImport open={linkOpen} onClose={() => setLinkOpen(false)} onImport={handleLinkImport} title="지출 데이터 링크 가져오기" />
    </div>
  )
}
