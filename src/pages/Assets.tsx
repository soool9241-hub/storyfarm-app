import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { krw } from '../lib/format'
import CrudModal from '../components/CrudModal'
import ConfirmDialog from '../components/ConfirmDialog'

const INIT_ASSETS = [
  { id: '1', name: 'CNC 머신 1호', model: 'DMG MORI', acquired: '2023-06-15', cost: 30000000, life: 60, method: '정액법', accDep: 14850000, bookValue: 15150000, lifePct: 55 },
  { id: '2', name: '레이저커터', model: 'Universal VLS6.60', acquired: '2024-01-10', cost: 15000000, life: 60, method: '정액법', accDep: 5850000, bookValue: 9150000, lifePct: 43.3 },
  { id: '3', name: 'CNC 라우터', model: 'ShopBot PRSalpha', acquired: '2024-06-01', cost: 8000000, life: 60, method: '정액법', accDep: 2880000, bookValue: 5120000, lifePct: 40 },
]

const INIT_MAINT = [
  { id: '1', date: '2026-02-15', asset: 'CNC 머신 1호', desc: '스핀들 베어링 교체', cost: 450000, vendor: '한국DMG' },
  { id: '2', date: '2026-01-20', asset: '레이저커터', desc: '레이저 튜브 교체', cost: 280000, vendor: '유니버설 서비스' },
  { id: '3', date: '2025-12-05', asset: 'CNC 라우터', desc: '정기 점검', cost: 80000, vendor: '자체 점검' },
]

const ASSET_FIELDS = [
  { key: 'name', label: '장비명', type: 'text' as const, placeholder: '장비명' },
  { key: 'model', label: '모델명', type: 'text' as const, placeholder: '모델명' },
  { key: 'acquired', label: '취득일', type: 'date' as const },
  { key: 'cost', label: '취득원가', type: 'number' as const, placeholder: '0' },
  { key: 'life', label: '내용연수 (개월)', type: 'number' as const, placeholder: '60' },
  { key: 'method', label: '상각방법', type: 'select' as const, options: ['정액법', '정률법'] },
]

const MAINT_FIELDS = [
  { key: 'date', label: '날짜', type: 'date' as const },
  { key: 'asset', label: '장비', type: 'text' as const, placeholder: '장비명' },
  { key: 'desc', label: '내용', type: 'text' as const, placeholder: '내용' },
  { key: 'cost', label: '비용', type: 'number' as const, placeholder: '0' },
  { key: 'vendor', label: '업체', type: 'text' as const, placeholder: '업체명' },
]

export default function Assets() {
  const [assets, setAssets] = useState(INIT_ASSETS)
  const [maint, setMaint] = useState(INIT_MAINT)

  // Asset CRUD
  const [assetModal, setAssetModal] = useState(false)
  const [assetEditId, setAssetEditId] = useState<string | null>(null)
  const [assetForm, setAssetForm] = useState<Record<string, string | number>>({})
  const [assetDeleteId, setAssetDeleteId] = useState<string | null>(null)

  // Maintenance CRUD
  const [maintModal, setMaintModal] = useState(false)
  const [maintEditId, setMaintEditId] = useState<string | null>(null)
  const [maintForm, setMaintForm] = useState<Record<string, string | number>>({})
  const [maintDeleteId, setMaintDeleteId] = useState<string | null>(null)

  const openAddAsset = () => { setAssetEditId(null); setAssetForm({ name: '', model: '', acquired: '', cost: 0, life: 60, method: '정액법' }); setAssetModal(true) }
  const openEditAsset = (a: typeof INIT_ASSETS[0]) => { setAssetEditId(a.id); setAssetForm({ name: a.name, model: a.model, acquired: a.acquired, cost: a.cost, life: a.life, method: a.method }); setAssetModal(true) }
  const saveAsset = () => {
    if (assetEditId) {
      setAssets(prev => prev.map(a => a.id === assetEditId ? { ...a, ...assetForm, cost: Number(assetForm.cost), life: Number(assetForm.life) } as typeof a : a))
    } else {
      const cost = Number(assetForm.cost)
      setAssets(prev => [...prev, { id: Date.now().toString(), ...assetForm, cost, life: Number(assetForm.life), accDep: 0, bookValue: cost, lifePct: 0 } as typeof INIT_ASSETS[0]])
    }
    setAssetModal(false)
  }
  const confirmDeleteAsset = () => { if (assetDeleteId) setAssets(prev => prev.filter(a => a.id !== assetDeleteId)); setAssetDeleteId(null) }

  const openAddMaint = () => { setMaintEditId(null); setMaintForm({ date: '', asset: '', desc: '', cost: 0, vendor: '' }); setMaintModal(true) }
  const openEditMaint = (m: typeof INIT_MAINT[0]) => { setMaintEditId(m.id); setMaintForm({ date: m.date, asset: m.asset, desc: m.desc, cost: m.cost, vendor: m.vendor }); setMaintModal(true) }
  const saveMaint = () => {
    if (maintEditId) {
      setMaint(prev => prev.map(m => m.id === maintEditId ? { ...m, ...maintForm, cost: Number(maintForm.cost) } as typeof m : m))
    } else {
      setMaint(prev => [{ id: Date.now().toString(), ...maintForm, cost: Number(maintForm.cost) } as typeof INIT_MAINT[0], ...prev])
    }
    setMaintModal(false)
  }
  const confirmDeleteMaint = () => { if (maintDeleteId) setMaint(prev => prev.filter(m => m.id !== maintDeleteId)); setMaintDeleteId(null) }

  const totalCost = assets.reduce((s, a) => s + a.cost, 0)
  const totalBook = assets.reduce((s, a) => s + a.bookValue, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">자산·장비 관리</h2>
        <button onClick={openAddAsset} className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4CAF50]">
          <Plus size={16} /> 장비 등록
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">총 취득원가</div>
          <div className="text-xl font-bold">{krw(totalCost)}</div>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <div className="text-[11px] text-[#8b8fa3] mb-1">현재 장부가</div>
          <div className="text-xl font-bold text-[#4CAF50]">{krw(totalBook)}</div>
        </div>
      </div>

      {/* 장비 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assets.map(a => (
          <div key={a.id} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-sm">{a.name}</h4>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditAsset(a)} className="p-1 text-[#8b8fa3] hover:text-[#3498db] transition-colors" title="수정"><Pencil size={13} /></button>
                <button onClick={() => setAssetDeleteId(a.id)} className="p-1 text-[#8b8fa3] hover:text-[#e74c3c] transition-colors" title="삭제"><Trash2 size={13} /></button>
              </div>
            </div>
            <p className="text-[11px] text-[#8b8fa3] mb-3">{a.model} · {a.method}</p>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-[#8b8fa3]">취득원가</span><span>{krw(a.cost)}</span></div>
              <div className="flex justify-between"><span className="text-[#8b8fa3]">장부가</span><span className="text-[#4CAF50]">{krw(a.bookValue)}</span></div>
              <div className="flex justify-between"><span className="text-[#8b8fa3]">감가상각 누계</span><span className="text-[#e67e22]">{krw(a.accDep)}</span></div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8b8fa3]">내용연수 소진</span>
                <span className={a.lifePct > 80 ? 'text-[#e74c3c]' : a.lifePct > 50 ? 'text-[#e67e22]' : 'text-[#4CAF50]'}>{a.lifePct}%</span>
              </div>
              <div className="h-2 bg-[#2a2d3a] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${a.lifePct > 80 ? 'bg-[#e74c3c]' : a.lifePct > 50 ? 'bg-[#e67e22]' : 'bg-[#2E7D32]'}`} style={{ width: `${a.lifePct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 유지보수 이력 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold">유지보수 이력</h3>
          <button onClick={openAddMaint} className="flex items-center gap-1.5 bg-[#3498db] text-white px-3 py-1.5 rounded-lg text-[11px] font-medium hover:bg-[#2980b9]">
            <Plus size={14} /> 이력 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[450px]">
            <thead>
              <tr className="border-b-2 border-[#2a2d3a]">
                <th className="text-left py-2 px-2 text-[#8b8fa3]">날짜</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3]">장비</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3]">내용</th>
                <th className="text-left py-2 px-2 text-[#8b8fa3]">업체</th>
                <th className="text-right py-2 px-2 text-[#8b8fa3]">비용</th>
                <th className="text-center py-2 px-2 text-[#8b8fa3]">관리</th>
              </tr>
            </thead>
            <tbody>
              {maint.map(m => (
                <tr key={m.id} className="border-b border-[#2a2d3a]/50 hover:bg-[#22252f]">
                  <td className="py-2 px-2 text-[#8b8fa3] tabular-nums">{m.date}</td>
                  <td className="py-2 px-2">{m.asset}</td>
                  <td className="py-2 px-2">{m.desc}</td>
                  <td className="py-2 px-2 text-[#8b8fa3]">{m.vendor}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-[#e67e22]">{krw(m.cost)}</td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEditMaint(m)} className="p-1 text-[#8b8fa3] hover:text-[#3498db] transition-colors" title="수정"><Pencil size={13} /></button>
                      <button onClick={() => setMaintDeleteId(m.id)} className="p-1 text-[#8b8fa3] hover:text-[#e74c3c] transition-colors" title="삭제"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CrudModal open={assetModal} title={assetEditId ? '장비 수정' : '장비 등록'} fields={ASSET_FIELDS} values={assetForm} onChange={(k, v) => setAssetForm(p => ({ ...p, [k]: v }))} onSave={saveAsset} onClose={() => setAssetModal(false)} />
      <ConfirmDialog open={!!assetDeleteId} message="이 장비를 삭제하시겠습니까?" onConfirm={confirmDeleteAsset} onCancel={() => setAssetDeleteId(null)} />
      <CrudModal open={maintModal} title={maintEditId ? '유지보수 수정' : '유지보수 등록'} fields={MAINT_FIELDS} values={maintForm} onChange={(k, v) => setMaintForm(p => ({ ...p, [k]: v }))} onSave={saveMaint} onClose={() => setMaintModal(false)} />
      <ConfirmDialog open={!!maintDeleteId} message="이 유지보수 이력을 삭제하시겠습니까?" onConfirm={confirmDeleteMaint} onCancel={() => setMaintDeleteId(null)} />
    </div>
  )
}
