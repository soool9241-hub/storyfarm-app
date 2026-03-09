import { useState, useRef } from 'react'
import { Plus, Camera, MessageSquare, Pencil, Trash2, Image } from 'lucide-react'
import { krw } from '../lib/format'
import CrudModal from '../components/CrudModal'
import ConfirmDialog from '../components/ConfirmDialog'

const INIT_EXPENSES = [
  { id: '1', date: '2026-03-09', category: '대출상환', desc: 'OK저축은행 3월', amount: 721162, method: '계좌이체', biz: '공통' },
  { id: '2', date: '2026-03-07', category: '재료비', desc: 'SUS304 50kg', amount: 520000, method: '국민카드', biz: '공방' },
  { id: '3', date: '2026-03-05', category: '공과금', desc: '전기요금', amount: 185000, method: '계좌이체', biz: '공통' },
  { id: '4', date: '2026-03-04', category: '재료비', desc: 'AL6061 30kg', amount: 312000, method: '국민카드', biz: '공방' },
  { id: '5', date: '2026-03-03', category: '운영비', desc: '인터넷·전화', amount: 55000, method: '계좌이체', biz: '공통' },
  { id: '6', date: '2026-03-02', category: '식대', desc: '직원 회식', amount: 120000, method: '신한카드', biz: '공방' },
  { id: '7', date: '2026-03-01', category: '임대료', desc: '공방 월세', amount: 800000, method: '계좌이체', biz: '공방' },
]

const budgetData = [
  { category: '재료비', budget: 2000000, spent: 832000 },
  { category: '인건비', budget: 2000000, spent: 0 },
  { category: '임대료', budget: 800000, spent: 800000 },
  { category: '공과금', budget: 400000, spent: 185000 },
  { category: '식대·교통', budget: 300000, spent: 120000 },
]

const FIELDS = [
  { key: 'date', label: '날짜', type: 'date' as const },
  { key: 'category', label: '카테고리', type: 'select' as const, options: ['재료비', '인건비', '임대료', '공과금', '장비', '마케팅', '세금', '식대·교통', '대출상환', '운영비', '기타'] },
  { key: 'amount', label: '금액', type: 'number' as const, placeholder: '0' },
  { key: 'method', label: '결제수단', type: 'select' as const, options: ['국민카드', '신한카드', '계좌이체', '현금'] },
  { key: 'desc', label: '내용', type: 'textarea' as const, placeholder: '내용을 입력하세요' },
  { key: 'biz', label: '사업 구분', type: 'select' as const, options: ['공방', '펜션', '개인', '공통'] },
]

export default function Expense() {
  const [list, setList] = useState(INIT_EXPENSES)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanModal, setScanModal] = useState(false)
  const [smsModal, setSmsModal] = useState(false)
  const [smsText, setSmsText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const openAdd = () => {
    setEditId(null)
    setForm({ date: new Date().toISOString().slice(0, 10), category: '재료비', amount: 0, method: '국민카드', desc: '', biz: '공방' })
    setModal(true)
  }

  const handleReceiptScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setScanPreview(reader.result as string)
      setScanModal(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const applyReceiptScan = () => {
    // 영수증 이미지에서 OCR로 추출된 데이터를 시뮬레이션 (실제 구현 시 OCR API 연동)
    setEditId(null)
    setForm({ date: new Date().toISOString().slice(0, 10), category: '재료비', amount: 0, method: '국민카드', desc: '(영수증 스캔) ', biz: '공방' })
    setScanModal(false)
    setScanPreview(null)
    setModal(true)
  }

  const parseSms = () => {
    // 문자 내용에서 금액, 카드, 날짜 파싱
    const amountMatch = smsText.match(/([\d,]+)원/)
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0
    const dateMatch = smsText.match(/(\d{2})\/(\d{2})/) || smsText.match(/(\d{2})월\s*(\d{2})일/)
    const now = new Date()
    const date = dateMatch ? `${now.getFullYear()}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}` : now.toISOString().slice(0, 10)
    const isKB = /국민|KB/.test(smsText)
    const isShinhan = /신한/.test(smsText)
    const method = isKB ? '국민카드' : isShinhan ? '신한카드' : '국민카드'
    // 가맹점명 추출 시도
    const descMatch = smsText.match(/\]\s*(.+?)(?:\s|$)/) || smsText.match(/승인\s+(.+?)(?:\s|$)/)
    const desc = descMatch ? descMatch[1] : '(문자 파싱)'

    setEditId(null)
    setForm({ date, category: '기타', amount, method, desc, biz: '공방' })
    setSmsModal(false)
    setSmsText('')
    setModal(true)
  }

  const openEdit = (item: typeof INIT_EXPENSES[0]) => {
    setEditId(item.id)
    setForm({ date: item.date, category: item.category, amount: item.amount, method: item.method, desc: item.desc, biz: item.biz })
    setModal(true)
  }

  const save = () => {
    if (editId) {
      setList(prev => prev.map(i => i.id === editId ? { ...i, ...form, amount: Number(form.amount) } as typeof i : i))
    } else {
      setList(prev => [{ id: Date.now().toString(), ...form, amount: Number(form.amount) } as typeof INIT_EXPENSES[0], ...prev])
    }
    setModal(false)
  }

  const confirmDelete = () => {
    if (deleteId) setList(prev => prev.filter(i => i.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">지출 관리</h2>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptScan} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 bg-[#3498db] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#2980b9]">
            <Camera size={16} /> 영수증 스캔
          </button>
          <button onClick={() => setSmsModal(true)} className="flex items-center gap-1.5 bg-[#9b59b6] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#8e44ad]">
            <MessageSquare size={16} /> 문자 파싱
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50]">
            <Plus size={16} /> 직접 입력
          </button>
        </div>
      </div>

      {/* 예산 관리 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a]">카테고리별 예산</h3>
        <div className="space-y-3">
          {budgetData.map(b => {
            const pct = (b.spent / b.budget) * 100
            const over = pct > 100
            return (
              <div key={b.category}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span>{b.category}</span>
                  <span className={over ? 'text-[#e74c3c] font-medium' : 'text-[#8b8fa3]'}>
                    {krw(b.spent)} / {krw(b.budget)} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-[#2a2d3a] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${over ? 'bg-[#e74c3c]' : pct > 80 ? 'bg-[#f1c40f]' : 'bg-[#2E7D32]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 지출 목록 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold">지출 내역 <span className="text-[#8b8fa3] font-normal text-[11px]">({list.length}건)</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-[#2a2d3a]">
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">날짜</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">카테고리</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">내용</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3] font-medium">결제</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3] font-medium">금액</th>
                <th className="text-center py-2 px-2 text-[#8b8fa3] font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id} className="border-b border-[#2a2d3a]/50 hover:bg-[#22252f]">
                  <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{e.date}</td>
                  <td className="py-2 px-2"><span className="text-[10px] bg-[#2a2d3a] px-2 py-0.5 rounded-full">{e.category}</span></td>
                  <td className="py-2 px-2">{e.desc}</td>
                  <td className="py-2 px-2 text-[#8b8fa3]">{e.method}</td>
                  <td className="py-2 px-2 text-right text-[#e74c3c] tabular-nums font-medium">{krw(e.amount)}</td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(e)} className="p-1 text-[#8b8fa3] hover:text-[#3498db] transition-colors" title="수정"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(e.id)} className="p-1 text-[#8b8fa3] hover:text-[#e74c3c] transition-colors" title="삭제"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 영수증 스캔 미리보기 모달 */}
      {scanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setScanModal(false); setScanPreview(null) }}>
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Image size={16} className="text-[#3498db]" /> 영수증 스캔</h3>
            {scanPreview && <img src={scanPreview} alt="영수증" className="w-full rounded-lg mb-3 max-h-60 object-contain bg-black" />}
            <p className="text-[11px] text-[#8b8fa3] mb-3">영수증 이미지가 인식되었습니다. 자동 입력 폼으로 이동합니다.</p>
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
            <textarea
              value={smsText}
              onChange={e => setSmsText(e.target.value)}
              placeholder="예) [KB국민카드] 홍길동 123,000원 03/10 12:30 스타벅스 승인"
              className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#9b59b6] h-24 resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setSmsModal(false)} className="flex-1 border border-[#2a2d3a] text-[#8b8fa3] py-2 rounded-lg text-sm hover:text-white">취소</button>
              <button onClick={parseSms} disabled={!smsText.trim()} className="flex-1 bg-[#9b59b6] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#8e44ad] disabled:opacity-50">파싱하기</button>
            </div>
          </div>
        </div>
      )}

      <CrudModal open={modal} title={editId ? '지출 수정' : '지출 등록'} fields={FIELDS} values={form} onChange={(k, v) => setForm(p => ({ ...p, [k]: v }))} onSave={save} onClose={() => setModal(false)} />
      <ConfirmDialog open={!!deleteId} message="이 지출 내역을 삭제하시겠습니까?" onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  )
}
