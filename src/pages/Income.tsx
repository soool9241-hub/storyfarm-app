import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { krw } from '../lib/format'
import CrudModal from '../components/CrudModal'
import ConfirmDialog from '../components/ConfirmDialog'

const channelData = [
  { name: 'CNC 가공', value: 2500000, color: '#2E7D32' },
  { name: '레이저', value: 500000, color: '#4CAF50' },
  { name: '수업·강의', value: 350000, color: '#3498db' },
  { name: '장비 대여', value: 500000, color: '#f1c40f' },
  { name: '펜션 객실', value: 800000, color: '#9b59b6' },
]

const monthlyData = [
  { month: '1월', 공방: 2900000, 펜션: 400000 },
  { month: '2월', 공방: 3500000, 펜션: 500000 },
  { month: '3월', 공방: 3850000, 펜션: 800000 },
]

const INIT_LIST = [
  { id: '1', date: '2026-03-22', desc: 'SUS304 정밀부품 100EA', biz: '공방', type: 'CNC가공', amount: 5000000, confirmed: false, counterparty: '삼성전자 협력사' },
  { id: '2', date: '2026-03-12', desc: 'MDF 레이저커팅 간판', biz: '공방', type: '레이저', amount: 500000, confirmed: true, counterparty: '로컬카페' },
  { id: '3', date: '2026-03-07', desc: 'SUS304 브라켓 30EA', biz: '공방', type: 'CNC가공', amount: 1800000, confirmed: true, counterparty: '현대모비스' },
  { id: '4', date: '2026-03-03', desc: 'AL6061 정밀가공 50EA', biz: '공방', type: 'CNC가공', amount: 2500000, confirmed: true, counterparty: '(주)테크원' },
  { id: '5', date: '2026-03-01', desc: '달팽이아지트 객실 2박', biz: '펜션', type: '객실', amount: 320000, confirmed: true, counterparty: '에어비앤비' },
]

const FIELDS = [
  { key: 'date', label: '날짜', type: 'date' as const },
  { key: 'biz', label: '사업 구분', type: 'select' as const, options: ['공방', '펜션', '기타'] },
  { key: 'type', label: '수입 유형', type: 'select' as const, options: ['CNC가공', '레이저', '수업·강의', '장비대여', '객실', '공간대여'] },
  { key: 'amount', label: '금액', type: 'number' as const, placeholder: '0' },
  { key: 'counterparty', label: '거래처', type: 'text' as const, placeholder: '거래처명' },
  { key: 'desc', label: '내용', type: 'textarea' as const, placeholder: '내용을 입력하세요' },
]

export default function Income() {
  const [list, setList] = useState(INIT_LIST)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openAdd = () => {
    setEditId(null)
    setForm({ date: '2026-03-10', biz: '공방', type: 'CNC가공', amount: 0, counterparty: '', desc: '' })
    setModal(true)
  }

  const openEdit = (item: typeof INIT_LIST[0]) => {
    setEditId(item.id)
    setForm({ date: item.date, biz: item.biz, type: item.type, amount: item.amount, counterparty: item.counterparty, desc: item.desc })
    setModal(true)
  }

  const save = () => {
    if (editId) {
      setList(prev => prev.map(i => i.id === editId ? { ...i, ...form, amount: Number(form.amount) } as typeof i : i))
    } else {
      setList(prev => [{ id: Date.now().toString(), ...form, amount: Number(form.amount), confirmed: false } as typeof INIT_LIST[0], ...prev])
    }
    setModal(false)
  }

  const confirmDelete = () => {
    if (deleteId) setList(prev => prev.filter(i => i.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">수입 관리</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50] transition-colors">
          <Plus size={16} /> 수입 등록
        </button>
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
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">월별 매출 비교</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="month" tick={{ fill: '#8b8fa3', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8b8fa3', fontSize: 11 }} tickFormatter={(v) => `${(v/10000).toFixed(0)}만`} />
                <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }} formatter={(v) => krw(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="공방" fill="#2E7D32" radius={[4,4,0,0]} />
                <Bar dataKey="펜션" fill="#3498db" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 수입 목록 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold">수입 내역 <span className="text-[#8b8fa3] font-normal text-[11px]">({list.length}건)</span></h3>
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.biz === '공방' ? 'bg-[#2E7D32]/20 text-[#4CAF50]' : 'bg-[#3498db]/20 text-[#3498db]'}`}>{item.biz}</span>
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
    </div>
  )
}
