import { useState, useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Plus, Pencil, Trash2, RefreshCw, Database, Lock, FileSpreadsheet, Upload, Download, Search, ArrowUpDown, CheckSquare, Square, ChevronLeft, ChevronRight, X, Calendar, CalendarDays, BarChart3 } from 'lucide-react'
import * as XLSX from 'xlsx'
import HometaxImport from '../components/HometaxImport'
import { krw } from '../lib/format'
import { supabase } from '../lib/supabase'
import CrudModal from '../components/CrudModal'
import ConfirmDialog from '../components/ConfirmDialog'

interface ReservationRevenue {
  id: number
  created_at: string
  guest_name: string
  reservation_date: string
  checkout_date: string
  stay_nights: number
  guest_count: number
  status: string
  base_fee: number
  extra_guest_fee: number
  bbq_fee: number
  dinner_fee: number
  bus_fee: number
  total_revenue: number
  bbq_count: number
  dinner_count: number
  bus_requested: boolean
  program_type: string
}

interface MonthlyRevenue {
  reservation_year: number
  reservation_month: number
  reservation_count: number
  total_guests: number
  total_base_fee: number
  total_extra_guest_fee: number
  total_bbq_fee: number
  total_dinner_fee: number
  total_bus_fee: number
  total_revenue: number
}

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULT_LIST = [
  { id: '1', createdAt: '2026-03-22', date: '2026-03-22', desc: 'SUS304 정밀부품 100EA', biz: '공방', type: 'CNC가공', amount: 5000000, confirmed: false, counterparty: '삼성전자 협력사' },
  { id: '2', createdAt: '2026-03-12', date: '2026-03-12', desc: 'MDF 레이저커팅 간판', biz: '공방', type: '레이저', amount: 500000, confirmed: true, counterparty: '로컬카페' },
  { id: '3', createdAt: '2026-03-07', date: '2026-03-07', desc: 'SUS304 브라켓 30EA', biz: '공방', type: 'CNC가공', amount: 1800000, confirmed: true, counterparty: '현대모비스' },
  { id: '4', createdAt: '2026-03-03', date: '2026-03-03', desc: 'AL6061 정밀가공 50EA', biz: '공방', type: 'CNC가공', amount: 2500000, confirmed: true, counterparty: '(주)테크원' },
]

type IncomeItem = typeof DEFAULT_LIST[number]

function loadSavedList(): IncomeItem[] {
  try {
    const saved = localStorage.getItem('storyfarm_income_list')
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, unknown>[]
      return parsed.map(i => ({ ...i, createdAt: (i.createdAt as string) || (i.date as string) || today() })) as IncomeItem[]
    }
  } catch { /* ignore */ }
  return DEFAULT_LIST
}

const FIELDS = [
  { key: 'date', label: '거래일', type: 'date' as const },
  { key: 'biz', label: '사업 구분', type: 'select' as const, options: ['공방', '펜션', '기타'] },
  { key: 'type', label: '수입 유형', type: 'selectOrText' as const, options: ['CNC가공', '레이저', '수업·강의', '장비대여', '객실', '공간대여'] },
  { key: 'amount', label: '금액', type: 'number' as const, placeholder: '0' },
  { key: 'counterparty', label: '거래처', type: 'text' as const, placeholder: '거래처명' },
  { key: 'desc', label: '내용', type: 'textarea' as const, placeholder: '내용을 입력하세요' },
]

export default function Income() {
  const [list, setList] = useState(loadSavedList)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [hometaxOpen, setHometaxOpen] = useState(false)

  // 보기 모드: 월별 / 연도별 / 총누적
  type ViewMode = 'monthly' | 'yearly' | 'total'
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const nowDate = new Date()
  const [viewYear, setViewYear] = useState(nowDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(nowDate.getMonth() + 1)

  // 필터 & 정렬 & 페이지네이션 & 선택
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterBiz, setFilterBiz] = useState('전체')
  const [filterType, setFilterType] = useState('전체')
  const [searchWord, setSearchWord] = useState('')
  const [sortKey, setSortKey] = useState<'createdAt' | 'date' | 'amount'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [incPage, setIncPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const INC_PAGE_SIZE = 20

  // Supabase 펜션 매출 데이터
  const [pensionRevenue, setPensionRevenue] = useState<ReservationRevenue[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [loading, setLoading] = useState(false)
  const [sbError, setSbError] = useState<string | null>(null)

  // 수기 등록 데이터 localStorage 저장
  useEffect(() => {
    localStorage.setItem('storyfarm_income_list', JSON.stringify(list))
  }, [list])

  const fetchPensionData = async () => {
    setLoading(true)
    setSbError(null)
    try {
      const [revRes, monthRes] = await Promise.all([
        supabase.from('v_reservation_revenue').select('*').order('created_at', { ascending: false }),
        supabase.from('v_monthly_revenue').select('*').order('reservation_year', { ascending: false }),
      ])

      if (revRes.error) throw revRes.error
      if (monthRes.error) throw monthRes.error

      setPensionRevenue(revRes.data || [])
      setMonthlyRevenue(monthRes.data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setSbError(msg)
      // 뷰가 아직 없으면 reservations 테이블 직접 시도
      try {
        const { data, error } = await supabase.from('reservations').select('*').order('created_at', { ascending: false })
        if (!error && data && data.length > 0) {
          // 클라이언트에서 매출 계산
          const calculated = data.map((r: Record<string, unknown>) => ({
            id: r.id as number,
            created_at: (r.created_at || '') as string,
            guest_name: (r.guest_name || '') as string,
            reservation_date: (r.reservation_date || '') as string,
            checkout_date: (r.checkout_date || '') as string,
            stay_nights: (r.stay_nights || 1) as number,
            guest_count: (r.guest_count || 0) as number,
            status: (r.status || '') as string,
            bbq_count: (r.bbq_count || 0) as number,
            dinner_count: (r.dinner_count || 0) as number,
            bus_requested: (r.bus_requested || false) as boolean,
            bus_fee: ((r as Record<string, unknown>).bus_fee || 0) as number,
            program_type: (r.program_type || '') as string,
            base_fee: 700000 * ((r.stay_nights || 1) as number),
            extra_guest_fee: Math.max(((r.guest_count || 0) as number) - 15, 0) * 10000 * ((r.stay_nights || 1) as number),
            bbq_fee: ((r.bbq_count || 0) as number) * 30000,
            dinner_fee: ((r.dinner_count || 0) as number) * 10000,
            total_revenue: 0,
          }))
          calculated.forEach(c => { c.total_revenue = c.base_fee + c.extra_guest_fee + c.bbq_fee + c.dinner_fee + c.bus_fee })
          setPensionRevenue(calculated)
          setSbError(null)
        }
      } catch { /* fallback failed */ }
    }
    setLoading(false)
  }

  useEffect(() => { fetchPensionData() }, [])

  const openAdd = () => {
    setEditId(null)
    setForm({ date: new Date().toISOString().slice(0, 10), biz: '공방', type: 'CNC가공', amount: 0, counterparty: '', desc: '' })
    setModal(true)
  }

  const openEdit = (item: typeof DEFAULT_LIST[0]) => {
    setEditId(item.id)
    setForm({ date: item.date, biz: item.biz, type: item.type, amount: item.amount, counterparty: item.counterparty, desc: item.desc })
    setModal(true)
  }

  const save = () => {
    if (editId) {
      setList(prev => prev.map(i => i.id === editId ? { ...i, ...form, amount: Number(form.amount) } as typeof i : i))
    } else {
      setList(prev => [{ id: Date.now().toString(), createdAt: today(), ...form, amount: Number(form.amount), confirmed: false } as typeof DEFAULT_LIST[0], ...prev])
    }
    setModal(false)
  }

  const confirmDelete = () => {
    if (deleteId) setList(prev => prev.filter(i => i.id !== deleteId))
    setDeleteId(null)
  }

  const handleHometaxImport = (items: { date: string; desc: string; counterparty: string; amount: number; type: string; biz: string }[]) => {
    const newItems = items.map(item => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      createdAt: today(),
      date: item.date,
      desc: item.desc,
      biz: item.biz,
      type: item.type,
      amount: item.amount,
      confirmed: true,
      counterparty: item.counterparty,
    }))
    setList(prev => [...newItems, ...prev])
  }

  // CSV 업로드
  const csvRef = useRef<HTMLInputElement>(null)
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        const imported: IncomeItem[] = rows.map(row => {
          const vals = Object.values(row).map(v => String(v ?? '').trim())
          const keys = Object.keys(row).map(k => String(k).trim())
          const kv = Object.fromEntries(keys.map((k, i) => [k, vals[i]]))
          return {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            createdAt: today(),
            date: kv['날짜'] || kv['date'] || vals[0] || '',
            biz: kv['사업구분'] || kv['biz'] || vals[1] || '공방',
            type: kv['유형'] || kv['type'] || vals[2] || '기타',
            amount: Math.round(Number(String(kv['금액'] || kv['amount'] || vals[3] || '0').replace(/[^\d.-]/g, ''))) || 0,
            counterparty: kv['거래처'] || kv['counterparty'] || vals[4] || '',
            desc: kv['내용'] || kv['desc'] || vals[5] || '',
            confirmed: false,
          }
        }).filter(i => i.date && i.amount > 0)
        if (imported.length > 0) {
          setList(prev => [...imported, ...prev])
          alert(`${imported.length}건 가져왔습니다.`)
        } else {
          alert('파싱 가능한 데이터가 없습니다.\n컬럼: 날짜, 사업구분, 유형, 금액, 거래처, 내용')
        }
      } catch {
        alert('파일 읽기 오류')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // 엑셀/CSV 내보내기
  const handleExport = (format: 'xlsx' | 'csv') => {
    const exportData = list.map(i => ({
      '작성일': i.createdAt,
      '거래일': i.date,
      '사업구분': i.biz,
      '유형': i.type,
      '금액': i.amount,
      '거래처': i.counterparty,
      '내용': i.desc,
      '입금확인': i.confirmed ? 'Y' : 'N',
    }))
    // 펜션 매출도 포함
    pensionRevenue.filter(r => r.status !== 'cancelled').forEach(r => {
      exportData.push({
        '작성일': r.created_at ? r.created_at.slice(0, 10) : r.reservation_date,
        '거래일': r.reservation_date,
        '사업구분': '펜션',
        '유형': '객실',
        '금액': r.total_revenue,
        '거래처': r.guest_name || '-',
        '내용': `${r.guest_count}명 ${r.stay_nights}박`,
        '입금확인': r.status === 'confirmed' ? 'Y' : 'N',
      })
    })
    exportData.sort((a, b) => b['작성일'].localeCompare(a['작성일']))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '수입내역')
    const filename = `스토리팜_수입내역_${new Date().toISOString().slice(0, 10)}.${format}`
    XLSX.writeFile(wb, filename)
  }

  // 보기 모드에 따른 기간 필터
  const matchViewMode = (dateStr: string) => {
    if (viewMode === 'total') return true
    const d = new Date(dateStr)
    if (viewMode === 'yearly') return d.getFullYear() === viewYear
    return d.getFullYear() === viewYear && d.getMonth() + 1 === viewMonth
  }

  // 펜션 매출도 보기 모드 필터 적용
  const filteredPension = pensionRevenue.filter(r => r.status !== 'cancelled' && matchViewMode(r.reservation_date))
  const filteredPensionTotal = filteredPension.reduce((s, r) => s + r.total_revenue, 0)

  // 필터링 + 정렬
  const BIZ_OPTS = ['전체', '공방', '펜션', '기타']
  const TYPE_OPTS = ['전체', ...new Set(list.map(i => i.type))]
  const filteredList = list.filter(i => {
    if (!matchViewMode(i.date)) return false
    if (dateFrom && i.date < dateFrom) return false
    if (dateTo && i.date > dateTo) return false
    if (filterBiz !== '전체' && i.biz !== filterBiz) return false
    if (filterType !== '전체' && i.type !== filterType) return false
    if (searchWord && !i.desc.includes(searchWord) && !i.counterparty.includes(searchWord) && !i.type.includes(searchWord)) return false
    return true
  }).sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'createdAt') return mul * a.createdAt.localeCompare(b.createdAt)
    if (sortKey === 'date') return mul * a.date.localeCompare(b.date)
    return mul * (a.amount - b.amount)
  })
  const incTotalPages = Math.max(1, Math.ceil(filteredList.length / INC_PAGE_SIZE))
  const incPaged = filteredList.slice((incPage - 1) * INC_PAGE_SIZE, incPage * INC_PAGE_SIZE)
  const filteredTotal = filteredList.reduce((s, i) => s + i.amount, 0)

  const toggleSort = (key: 'createdAt' | 'date' | 'amount') => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('desc') } }
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => { const ids = incPaged.map(i => i.id); setSelected(prev => ids.every(id => prev.has(id)) ? new Set() : new Set([...prev, ...ids])) }
  const deleteSelected = () => { setList(prev => prev.filter(i => !selected.has(i.id))); setSelected(new Set()) }
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setFilterBiz('전체'); setFilterType('전체'); setSearchWord(''); setIncPage(1) }
  const hasFilters = dateFrom || dateTo || filterBiz !== '전체' || filterType !== '전체' || searchWord

  // 차트 데이터 계산 (보기 모드 적용)
  const pensionTotal = filteredPensionTotal
  const workshopTotal = filteredList.reduce((s, i) => s + i.amount, 0)

  // 연도 목록 (데이터에서 추출)
  const yearSet = new Set<number>()
  list.forEach(i => yearSet.add(new Date(i.date).getFullYear()))
  pensionRevenue.forEach(r => yearSet.add(new Date(r.reservation_date).getFullYear()))
  yearSet.add(nowDate.getFullYear())
  const availableYears = [...yearSet].sort((a, b) => b - a)

  const channelData = [
    { name: 'CNC 가공', value: filteredList.filter(i => i.type === 'CNC가공').reduce((s, i) => s + i.amount, 0), color: '#2E7D32' },
    { name: '레이저', value: filteredList.filter(i => i.type === '레이저').reduce((s, i) => s + i.amount, 0), color: '#4CAF50' },
    { name: '펜션 매출', value: pensionTotal, color: '#9b59b6' },
    ...(filteredList.filter(i => !['CNC가공', '레이저'].includes(i.type)).length > 0
      ? [{ name: '기타', value: filteredList.filter(i => !['CNC가공', '레이저'].includes(i.type)).reduce((s, i) => s + i.amount, 0), color: '#f1c40f' }]
      : []),
  ].filter(d => d.value > 0)

  const monthlyData = monthlyRevenue.slice(0, 6).reverse().map(m => ({
    month: `${m.reservation_month}월`,
    펜션: m.total_revenue,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">수입 관리</h2>
        <div className="flex gap-2 flex-wrap">
          <input ref={csvRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCsvUpload} />
          <button onClick={() => setHometaxOpen(true)} className="flex items-center gap-1.5 bg-[#3498db] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#2980b9] transition-colors">
            <FileSpreadsheet size={16} /> 홈택스
          </button>
          <button onClick={() => csvRef.current?.click()} className="flex items-center gap-1.5 bg-[#e67e22] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#d35400] transition-colors">
            <Upload size={16} /> CSV
          </button>
          <button onClick={() => handleExport('xlsx')} className="flex items-center gap-1.5 bg-[#9b59b6] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#8e44ad] transition-colors">
            <Download size={16} /> 내보내기
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50] transition-colors">
            <Plus size={16} /> 수입 등록
          </button>
        </div>
      </div>

      {/* 보기 모드 선택 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-[#0f1117] rounded-lg p-0.5 border border-[#2a2d3a]">
            {([['monthly', '월별', <Calendar key="m" size={13} />], ['yearly', '연도별', <CalendarDays key="y" size={13} />], ['total', '총누적', <BarChart3 key="t" size={13} />]] as [ViewMode, string, React.ReactNode][]).map(([mode, label, icon]) => (
              <button key={mode} onClick={() => { setViewMode(mode); setIncPage(1) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${viewMode === mode ? 'bg-[#2E7D32] text-white shadow-sm' : 'text-[#8b8fa3] hover:text-white'}`}>
                {icon} {label}
              </button>
            ))}
          </div>
          {viewMode !== 'total' && (
            <div className="flex items-center gap-2">
              <select value={viewYear} onChange={e => { setViewYear(Number(e.target.value)); setIncPage(1) }}
                className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#2E7D32]">
                {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              {viewMode === 'monthly' && (
                <select value={viewMonth} onChange={e => { setViewMonth(Number(e.target.value)); setIncPage(1) }}
                  className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#2E7D32]">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              )}
            </div>
          )}
          <span className="text-[11px] text-[#8b8fa3] ml-auto">
            {viewMode === 'monthly' && `${viewYear}년 ${viewMonth}월`}
            {viewMode === 'yearly' && `${viewYear}년 전체`}
            {viewMode === 'total' && '전체 누적'}
          </span>
        </div>
      </div>

      {/* 매출 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">공방 매출{viewMode === 'monthly' ? ` (${viewMonth}월)` : viewMode === 'yearly' ? ` (${viewYear}년)` : ' (누적)'}</div>
          <div className="text-xl font-bold text-[#4CAF50]">{krw(workshopTotal)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#9b59b6]/30 rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1 flex items-center justify-center gap-1">
            <Database size={11} className="text-[#9b59b6]" /> 펜션 매출{viewMode === 'monthly' ? ` (${viewMonth}월)` : viewMode === 'yearly' ? ` (${viewYear}년)` : ' (누적)'}
          </div>
          <div className="text-xl font-bold text-[#9b59b6]">{krw(pensionTotal)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">총 매출{viewMode === 'monthly' ? ` (${viewMonth}월)` : viewMode === 'yearly' ? ` (${viewYear}년)` : ' (누적)'}</div>
          <div className="text-xl font-bold text-white">{krw(workshopTotal + pensionTotal)}</div>
        </div>
      </div>

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
        {monthlyData.length > 0 && (
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">펜션 월별 매출</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                  <XAxis dataKey="month" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={(v) => `${(v/10000).toFixed(0)}만`} />
                  <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }} formatter={(v) => krw(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="펜션" fill="#9b59b6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 펜션 예약 매출 (Supabase) */}
      <div className="bg-[#1a1d27] border border-[#9b59b6]/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Database size={14} className="text-[#9b59b6]" />
            달팽이아지트 펜션 매출
            <span className="text-[#8b8fa3] font-normal text-[11px]">({filteredPension.length}건)</span>
            <span className="flex items-center gap-0.5 text-[10px] text-[#8b8fa3] font-normal ml-2"><Lock size={10} /> 읽기전용</span>
          </h3>
          <button onClick={fetchPensionData} disabled={loading} className="flex items-center gap-1 text-[11px] text-[#8b8fa3] hover:text-[#9b59b6] transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
        </div>

        {sbError && (
          <div className="text-[11px] text-[#f1c40f] bg-[#f1c40f]/10 rounded-lg p-2 mb-3">
            Supabase: {sbError} — SQL을 먼저 실행해주세요
          </div>
        )}

        {filteredPension.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-[#2a2d3a]">
                  <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">생성일</th>
                  <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">예약일</th>
                  <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">고객명</th>
                  <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">인원</th>
                  <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">박수</th>
                  <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">기본</th>
                  <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">추가인원</th>
                  <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">BBQ</th>
                  <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">식사</th>
                  <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">버스</th>
                  <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">합계</th>
                  <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredPension.map(r => (
                  <tr key={r.id} className={`border-b border-[#2a2d3a]/50 hover:bg-[#22252f] ${r.status === 'cancelled' ? 'opacity-40 line-through' : ''}`}>
                    <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{r.created_at ? r.created_at.slice(0, 10) : '-'}</td>
                    <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{r.reservation_date}</td>
                    <td className="py-2 px-2">{r.guest_name || '-'}</td>
                    <td className="py-2 px-2 text-center">{r.guest_count}명</td>
                    <td className="py-2 px-2 text-center">{r.stay_nights}박</td>
                    <td className="py-2 px-2 text-right tabular-nums">{krw(r.base_fee)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-[#e67e22]">{r.extra_guest_fee > 0 ? krw(r.extra_guest_fee) : '-'}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.bbq_fee > 0 ? krw(r.bbq_fee) : '-'}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.dinner_fee > 0 ? krw(r.dinner_fee) : '-'}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.bus_fee > 0 ? krw(r.bus_fee) : '-'}</td>
                    <td className="py-2 px-2 text-right tabular-nums font-medium text-[#9b59b6]">{krw(r.total_revenue)}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        r.status === 'confirmed' ? 'bg-[#4CAF50]/20 text-[#4CAF50]' :
                        r.status === 'cancelled' ? 'bg-[#e74c3c]/20 text-[#e74c3c]' :
                        'bg-[#f1c40f]/20 text-[#f1c40f]'
                      }`}>{r.status === 'confirmed' ? '확정' : r.status === 'cancelled' ? '취소' : r.status || '대기'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading && !sbError ? (
          <div className="text-center py-8 text-[#8b8fa3] text-[12px]">
            <Database size={24} className="mx-auto mb-2 opacity-30" />
            <p>예약 데이터가 없습니다</p>
            <p className="text-[10px] mt-1">Supabase에 예약이 등록되면 자동으로 매출이 계산됩니다</p>
          </div>
        ) : loading ? (
          <div className="text-center py-8 text-[#8b8fa3] text-[12px]">
            <RefreshCw size={20} className="mx-auto mb-2 animate-spin opacity-50" />
            불러오는 중...
          </div>
        ) : null}
      </div>

      {/* 검색 필터 바 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[#8b8fa3] shrink-0">기간</span>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setIncPage(1) }} className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#2E7D32] w-[130px] [color-scheme:dark]" />
            <span className="text-[#8b8fa3]">~</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setIncPage(1) }} className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#2E7D32] w-[130px] [color-scheme:dark]" />
          </div>
          <select value={filterBiz} onChange={e => { setFilterBiz(e.target.value); setIncPage(1) }} className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#2E7D32]">{BIZ_OPTS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setIncPage(1) }} className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#2E7D32]">{TYPE_OPTS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <div className="relative flex-1 min-w-[120px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b8fa3]" />
            <input value={searchWord} onChange={e => { setSearchWord(e.target.value); setIncPage(1) }} placeholder="검색어" className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#2E7D32] w-full pl-7" />
          </div>
          {hasFilters && <button onClick={clearFilters} className="text-[10px] text-[#e74c3c] hover:text-white flex items-center gap-0.5"><X size={12} /> 초기화</button>}
        </div>
      </div>

      {/* 합계 요약 바 */}
      <div className="flex items-center justify-between bg-[#1a1d27] border border-[#2a2d3a] rounded-xl px-4 py-2.5">
        <span className="text-[11px] text-[#8b8fa3]">
          검색결과 <span className="text-white font-medium">{filteredList.length}</span>건
          {selected.size > 0 && <span className="ml-2 text-[#3498db]">({selected.size}건 선택)</span>}
        </span>
        <div className="flex items-center gap-3">
          {selected.size > 0 && <button onClick={deleteSelected} className="text-[11px] text-[#e74c3c] hover:text-white flex items-center gap-1"><Trash2 size={12} /> 선택 삭제</button>}
          <span className="text-[12px] font-medium">합계 <span className="text-[#4CAF50]">{krw(filteredTotal)}</span></span>
        </div>
      </div>

      {/* 수입 목록 테이블 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-[#2a2d3a]">
                <th className="py-2 px-2 w-8"><button onClick={toggleAll} className="text-[#8b8fa3] hover:text-white">{incPaged.length > 0 && incPaged.every(i => selected.has(i.id)) ? <CheckSquare size={14} /> : <Square size={14} />}</button></th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium cursor-pointer select-none" onClick={() => toggleSort('createdAt')}><span className="flex items-center gap-1">작성일 <ArrowUpDown size={11} className={sortKey === 'createdAt' ? 'text-[#4CAF50]' : ''} /></span></th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium cursor-pointer select-none" onClick={() => toggleSort('date')}><span className="flex items-center gap-1">거래일 <ArrowUpDown size={11} className={sortKey === 'date' ? 'text-[#4CAF50]' : ''} /></span></th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">구분</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">유형</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">내용</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">거래처</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium cursor-pointer select-none" onClick={() => toggleSort('amount')}><span className="flex items-center justify-end gap-1">금액 <ArrowUpDown size={11} className={sortKey === 'amount' ? 'text-[#4CAF50]' : ''} /></span></th>
                <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">입금</th>
                <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {incPaged.map(item => (
                <tr key={item.id} className={`border-b border-[#2a2d3a]/50 hover:bg-[#22252f] ${selected.has(item.id) ? 'bg-[#2E7D32]/5' : ''}`}>
                  <td className="py-2 px-2"><button onClick={() => toggleSelect(item.id)} className="text-[#8b8fa3] hover:text-white">{selected.has(item.id) ? <CheckSquare size={14} className="text-[#4CAF50]" /> : <Square size={14} />}</button></td>
                  <td className="py-2 px-2 text-white tabular-nums">{item.createdAt}</td>
                  <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{item.date}</td>
                  <td className="py-2 px-2"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2E7D32]/20 text-[#4CAF50]">{item.biz}</span></td>
                  <td className="py-2 px-2"><span className="text-[10px] text-[#8b8fa3]">{item.type}</span></td>
                  <td className="py-2 px-2 max-w-[160px] truncate">{item.desc}</td>
                  <td className="py-2 px-2 text-[#8b8fa3] max-w-[100px] truncate">{item.counterparty}</td>
                  <td className="py-2 px-2 text-right text-[#4CAF50] tabular-nums font-medium">{krw(item.amount)}</td>
                  <td className="py-2 px-2 text-center">{item.confirmed ? <span className="text-[#4CAF50]">✓</span> : <span className="text-[#f1c40f]">미수</span>}</td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1 text-[#8b8fa3] hover:text-[#3498db] transition-colors" title="수정"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(item.id)} className="p-1 text-[#8b8fa3] hover:text-[#e74c3c] transition-colors" title="삭제"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {incPaged.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-[#8b8fa3] text-[12px]">검색 결과가 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
        {incTotalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-[#2a2d3a]">
            <button onClick={() => setIncPage(p => Math.max(1, p - 1))} disabled={incPage === 1} className="p-1 text-[#8b8fa3] hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: incTotalPages }, (_, i) => i + 1).slice(Math.max(0, incPage - 3), incPage + 2).map(p => (
              <button key={p} onClick={() => setIncPage(p)} className={`w-7 h-7 rounded text-[11px] ${p === incPage ? 'bg-[#2E7D32] text-white' : 'text-[#8b8fa3] hover:text-white'}`}>{p}</button>
            ))}
            <button onClick={() => setIncPage(p => Math.min(incTotalPages, p + 1))} disabled={incPage === incTotalPages} className="p-1 text-[#8b8fa3] hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      <CrudModal open={modal} title={editId ? '수입 수정' : '수입 등록'} fields={FIELDS} values={form} onChange={(k, v) => setForm(p => ({ ...p, [k]: v }))} onSave={save} onClose={() => setModal(false)} />
      <ConfirmDialog open={!!deleteId} message="이 수입 내역을 삭제하시겠습니까?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
      <HometaxImport open={hometaxOpen} onClose={() => setHometaxOpen(false)} onImport={handleHometaxImport} />
    </div>
  )
}
