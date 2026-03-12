import { X, CalendarDays } from 'lucide-react'
import { useRef, useState } from 'react'

interface Field {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'select' | 'selectOrText' | 'textarea'
  options?: string[]
  placeholder?: string
  readOnly?: boolean
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

function formatNumber(n: number | string): string {
  const num = typeof n === 'string' ? Number(n.replace(/[^\d.-]/g, '')) : n
  if (isNaN(num) || num === 0) return ''
  return Math.abs(Math.round(num)).toLocaleString('ko-KR')
}

export default function CrudModal({ open, title, fields, values, onChange, onSave, onClose }: CrudModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[#2a2d3a] sticky top-0 bg-[#1a1d27] z-10 rounded-t-xl">
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
              ) : f.type === 'selectOrText' ? (
                <SelectOrText value={String(values[f.key] ?? '')} options={f.options || []} onChange={v => onChange(f.key, v)} placeholder={f.placeholder} />
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
              ) : f.type === 'number' ? (
                <NumberField
                  value={values[f.key] ?? ''}
                  onChange={v => onChange(f.key, v)}
                  placeholder={f.placeholder}
                  readOnly={f.readOnly}
                />
              ) : (
                <input
                  type="text"
                  value={values[f.key] ?? ''}
                  onChange={e => onChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  readOnly={f.readOnly}
                  className={`w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#2E7D32] ${f.readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-4 border-t border-[#2a2d3a] sticky bottom-0 bg-[#1a1d27] rounded-b-xl">
          <button onClick={onClose} className="flex-1 border border-[#2a2d3a] text-[#8b8fa3] py-2.5 rounded-lg text-sm hover:text-white transition-colors">취소</button>
          <button onClick={onSave} className="flex-1 bg-[#2E7D32] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#4CAF50] transition-colors">저장</button>
        </div>
      </div>
    </div>
  )
}

function NumberField({ value, onChange, placeholder, readOnly }: { value: string | number; onChange: (v: number) => void; placeholder?: string; readOnly?: boolean }) {
  const [display, setDisplay] = useState(() => {
    const num = typeof value === 'string' ? Number(value) : value
    return num ? formatNumber(num) : ''
  })
  const [focused, setFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    const num = Number(raw) || 0
    setDisplay(raw ? Number(raw).toLocaleString('ko-KR') : '')
    onChange(num)
  }

  const handleFocus = () => {
    setFocused(true)
    const num = typeof value === 'string' ? Number(value) : value
    if (num) setDisplay(formatNumber(num))
  }

  const handleBlur = () => {
    setFocused(false)
    const num = typeof value === 'string' ? Number(value) : value
    setDisplay(num ? formatNumber(num) : '')
  }

  // value가 외부에서 바뀔때 동기화
  const numVal = typeof value === 'string' ? Number(value) : value
  const displayVal = focused ? display : (numVal ? formatNumber(numVal) : '')

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={displayVal}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || '0'}
        readOnly={readOnly}
        className={`w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#2E7D32] tabular-nums ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
      {numVal > 0 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#8b8fa3] pointer-events-none">
          원
        </span>
      )}
    </div>
  )
}

function SelectOrText({ value, options, onChange, placeholder }: { value: string; options: string[]; onChange: (v: string) => void; placeholder?: string }) {
  const [custom, setCustom] = useState(!options.includes(value) && value !== '')
  const inputClass = "w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#2E7D32]"

  if (custom) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '직접 입력'}
          className={inputClass + ' flex-1'}
        />
        <button type="button" onClick={() => { setCustom(false); onChange('') }} className="text-[10px] text-[#8b8fa3] hover:text-white border border-[#2a2d3a] rounded-lg px-2 shrink-0">목록</button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <select value={value} onChange={e => { if (e.target.value === '__custom__') { setCustom(true); onChange('') } else onChange(e.target.value) }} className={inputClass + ' flex-1'}>
        <option value="">선택</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__custom__">직접 작성</option>
      </select>
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
