import { X, CalendarDays } from 'lucide-react'
import { useRef } from 'react'

interface Field {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea'
  options?: string[]
  placeholder?: string
}

interface CrudModalProps {
  open: boolean
  title: string
  fields: Field[]
  values: Record<string, string | number>
  onChange: (key: string, value: string | number) => void
  onSave: () => void
  onClose: () => void
}

export default function CrudModal({ open, title, fields, values, onChange, onSave, onClose }: CrudModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[#8b8fa3] hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-[11px] text-[#8b8fa3] block mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={values[f.key] ?? ''}
                  onChange={e => onChange(f.key, e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#2E7D32]"
                >
                  <option value="">선택</option>
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'date' ? (
                <DateField value={String(values[f.key] ?? '')} onChange={v => onChange(f.key, v)} />
              ) : f.type === 'textarea' ? (
                <textarea
                  value={values[f.key] ?? ''}
                  onChange={e => onChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#2E7D32] resize-none"
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  value={values[f.key] ?? ''}
                  onChange={e => onChange(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#2E7D32]"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-4 border-t border-[#2a2d3a]">
          <button onClick={onClose} className="flex-1 border border-[#2a2d3a] text-[#8b8fa3] py-2.5 rounded-lg text-sm hover:text-white transition-colors">취소</button>
          <button onClick={onSave} className="flex-1 bg-[#2E7D32] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#4CAF50] transition-colors">저장</button>
        </div>
      </div>
    </div>
  )
}

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#2E7D32] [color-scheme:dark] cursor-pointer"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker()}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8fa3] hover:text-[#4CAF50] transition-colors"
      >
        <CalendarDays size={16} />
      </button>
    </div>
  )
}
