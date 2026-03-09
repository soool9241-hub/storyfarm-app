import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Plus, Pencil, Trash2, RefreshCw, Database, Lock, FileSpreadsheet } from 'lucide-react'
import HometaxImport from '../components/HometaxImport'
import { krw } from '../lib/format'
import { supabase } from '../lib/supabase'
import CrudModal from '../components/CrudModal'
import ConfirmDialog from '../components/ConfirmDialog'

interface ReservationRevenue {
  id: number
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

const DEFAULT_LIST = [
  { id: '1', date: '2026-03-22', desc: 'SUS304 정밀부품 100EA', biz: '공방', type: 'CNC가공', amount: 5000000, confirmed: false, counterparty: '삼성전자 협력사' },
  { id: '2', date: '2026-03-12', desc: 'MDF 레이저커팅 간판', biz: '공방', type: '레이저', amount: 500000, confirmed: true, counterparty: '로컬카페' },
  { id: '3', date: '2026-03-07', desc: 'SUS304 브라켓 30EA', biz: '공방', type: 'CNC가공', amount: 1800000, confirmed: true, counterparty: '현대모비스' },
  { id: '4', date: '2026-03-03', desc: 'AL6061 정밀가공 50EA', biz: '공방', type: 'CNC가공', amount: 2500000, confirmed: true, counterparty: '(주)테크원' },
]

type IncomeItem = typeof DEFAULT_LIST[number]

function loadSavedList(): IncomeItem[] {
  try {
    const saved = localStorage.getItem('storyfarm_income_list')
    if (saved) return JSON.parse(saved) as IncomeItem[]
  } catch { /* ignore */ }
  return DEFAULT_LIST
}

const FIELDS = [
  { key: 'date', label: '날짜', type: 'date' as const },
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
        supabase.from('v_reservation_revenue').select('*').order('reservation_date', { ascending: false }),
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
        const { data, error } = await supabase.from('reservations').select('*').order('reservation_date', { ascending: false })
        if (!error && data && data.length > 0) {
          // 클라이언트에서 매출 계산
          const calculated = data.map((r: Record<string, unknown>) => ({
            id: r.id as number,
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
      setList(prev => [{ id: Date.now().toString(), ...form, amount: Number(form.amount), confirmed: false } as typeof DEFAULT_LIST[0], ...prev])
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

  // 차트 데이터 계산
  const pensionTotal = pensionRevenue
    .filter(r => r.status !== 'cancelled')
    .reduce((s, r) => s + r.total_revenue, 0)
  const workshopTotal = list.reduce((s, i) => s + i.amount, 0)

  const channelData = [
    { name: 'CNC 가공', value: list.filter(i => i.type === 'CNC가공').reduce((s, i) => s + i.amount, 0), color: '#2E7D32' },
    { name: '레이저', value: list.filter(i => i.type === '레이저').reduce((s, i) => s + i.amount, 0), color: '#4CAF50' },
    { name: '펜션 매출', value: pensionTotal, color: '#9b59b6' },
    ...(list.filter(i => !['CNC가공', '레이저'].includes(i.type)).length > 0
      ? [{ name: '기타', value: list.filter(i => !['CNC가공', '레이저'].includes(i.type)).reduce((s, i) => s + i.amount, 0), color: '#f1c40f' }]
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
        <div className="flex gap-2">
          <button onClick={() => setHometaxOpen(true)} className="flex items-center gap-1.5 bg-[#3498db] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#2980b9] transition-colors">
            <FileSpreadsheet size={16} /> 홈택스
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50] transition-colors">
            <Plus size={16} /> 수입 등록
          </button>
        </div>
      </div>

      {/* 총 매출 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">공방 매출</div>
          <div className="text-xl font-bold text-[#4CAF50]">{krw(workshopTotal)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#9b59b6]/30 rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1 flex items-center justify-center gap-1">
            <Database size={11} className="text-[#9b59b6]" /> 펜션 매출 (Supabase)
          </div>
          <div className="text-xl font-bold text-[#9b59b6]">{krw(pensionTotal)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">총 매출</div>
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
            <span className="text-[#8b8fa3] font-normal text-[11px]">({pensionRevenue.filter(r => r.status !== 'cancelled').length}건)</span>
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

        {pensionRevenue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-[#2a2d3a]">
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
                {pensionRevenue.map(r => (
                  <tr key={r.id} className={`border-b border-[#2a2d3a]/50 hover:bg-[#22252f] ${r.status === 'cancelled' ? 'opacity-40 line-through' : ''}`}>
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

      {/* 공방 수입 목록 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold">공방 수입 내역 <span className="text-[#8b8fa3] font-normal text-[11px]">({list.length}건)</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[650px]">
            <thead>
              <tr className="border-b-2 border-[#2a2d3a]">
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">날짜</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">구분</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">내용</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">거래처</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">금액</th>
                <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">입금</th>
                <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id} className="border-b border-[#2a2d3a]/50 hover:bg-[#22252f]">
                  <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{item.date}</td>
                  <td className="py-2 px-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2E7D32]/20 text-[#4CAF50]">{item.biz}</span>
                  </td>
                  <td className="py-2 px-2">{item.desc}</td>
                  <td className="py-2 px-2 text-[#8b8fa3]">{item.counterparty}</td>
                  <td className="py-2 px-2 text-right text-[#4CAF50] tabular-nums font-medium">{krw(item.amount)}</td>
                  <td className="py-2 px-2 text-center">
                    {item.confirmed ? <span className="text-[#4CAF50]">✓</span> : <span className="text-[#f1c40f]">미수</span>}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1 text-[#8b8fa3] hover:text-[#3498db] transition-colors" title="수정"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(item.id)} className="p-1 text-[#8b8fa3] hover:text-[#e74c3c] transition-colors" title="삭제"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CrudModal open={modal} title={editId ? '수입 수정' : '수입 등록'} fields={FIELDS} values={form} onChange={(k, v) => setForm(p => ({ ...p, [k]: v }))} onSave={save} onClose={() => setModal(false)} />
      <ConfirmDialog open={!!deleteId} message="이 수입 내역을 삭제하시겠습니까?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
      <HometaxImport open={hometaxOpen} onClose={() => setHometaxOpen(false)} onImport={handleHometaxImport} />
    </div>
  )
}
