import { useState, useRef } from 'react'
import { FileSpreadsheet, Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { krw } from '../lib/format'

interface ParsedItem {
  date: string
  desc: string
  counterparty: string
  amount: number
  type: string // 세금계산서, 카드매출, 현금영수증
  biz: string
  selected: boolean
}

interface HometaxImportProps {
  open: boolean
  onClose: () => void
  onImport: (items: { date: string; desc: string; counterparty: string; amount: number; type: string; biz: string }[]) => void
}

// 홈택스 엑셀 컬럼 매핑 (다양한 포맷 대응)
function parseSheet(rows: Record<string, string>[], sourceType: string): ParsedItem[] {
  const items: ParsedItem[] = []

  for (const row of rows) {
    const vals = Object.values(row).map(v => String(v ?? '').trim())
    const keys = Object.keys(row).map(k => String(k).trim())
    const keyVals = Object.fromEntries(keys.map((k, i) => [k, vals[i]]))

    let date = ''
    let desc = ''
    let counterparty = ''
    let amount = 0

    if (sourceType === '세금계산서') {
      // 홈택스 전자세금계산서: 작성일자, 공급받는자(사업자), 품목, 공급가액
      date = findVal(keyVals, ['작성일자', '발급일', '일자', '날짜', '작성일']) || findDateInVals(vals)
      counterparty = findVal(keyVals, ['공급받는자', '거래처', '상호', '매출처', '공급자']) || ''
      desc = findVal(keyVals, ['품목', '품명', '내용', '적요', '비고']) || ''
      amount = parseAmount(findVal(keyVals, ['공급가액', '합계금액', '금액', '세액포함', '총금액']) || findAmountInVals(vals))
    } else if (sourceType === '카드매출') {
      // 홈택스 카드매출: 거래일시, 카드사, 승인금액
      date = findVal(keyVals, ['거래일시', '거래일', '매출일', '일자', '날짜', '승인일']) || findDateInVals(vals)
      counterparty = findVal(keyVals, ['카드사', '카드종류', '발급사']) || ''
      desc = findVal(keyVals, ['가맹점', '가맹점명', '내용', '적요', '비고']) || '카드매출'
      amount = parseAmount(findVal(keyVals, ['승인금액', '거래금액', '금액', '합계', '매출액']) || findAmountInVals(vals))
    } else if (sourceType === '현금영수증') {
      // 홈택스 현금영수증: 거래일시, 거래금액
      date = findVal(keyVals, ['거래일시', '거래일', '발급일', '일자', '날짜']) || findDateInVals(vals)
      counterparty = findVal(keyVals, ['거래처', '상호', '가맹점', '발급자']) || ''
      desc = findVal(keyVals, ['품목', '내용', '적요', '비고']) || '현금영수증'
      amount = parseAmount(findVal(keyVals, ['거래금액', '금액', '합계금액', '공급가액', '총금액']) || findAmountInVals(vals))
    }

    // 날짜 정규화
    date = normalizeDate(date)

    if (date && amount > 0) {
      items.push({
        date,
        desc: desc || sourceType,
        counterparty: counterparty || '-',
        amount,
        type: sourceType,
        biz: '공방',
        selected: true,
      })
    }
  }

  return items
}

function findVal(obj: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    for (const [k, v] of Object.entries(obj)) {
      if (k.includes(c)) return v
    }
  }
  return ''
}

function findDateInVals(vals: string[]): string {
  for (const v of vals) {
    if (/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(v)) return v
    if (/\d{8}/.test(v) && v.length === 8) return v
  }
  return ''
}

function findAmountInVals(vals: string[]): string {
  for (const v of vals) {
    const num = parseAmount(v)
    if (num >= 1000) return v // 1000원 이상인 숫자를 금액으로 간주
  }
  return '0'
}

function parseAmount(val: string): number {
  if (!val) return 0
  const cleaned = val.replace(/[^\d.-]/g, '')
  return Math.abs(Math.round(Number(cleaned))) || 0
}

function normalizeDate(d: string): string {
  if (!d) return ''
  // 20260310 → 2026-03-10
  const m1 = d.match(/^(\d{4})(\d{2})(\d{2})/)
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`
  // 2026/03/10 or 2026.03.10
  const m2 = d.match(/(\d{4})[/.](\d{1,2})[/.](\d{1,2})/)
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`
  // 2026-03-10 (already good)
  const m3 = d.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m3) return `${m3[1]}-${m3[2].padStart(2, '0')}-${m3[3].padStart(2, '0')}`
  // 날짜+시간 포맷에서 날짜만
  const m4 = d.match(/(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\s/)
  if (m4) return `${m4[1]}-${m4[2].padStart(2, '0')}-${m4[3].padStart(2, '0')}`
  return ''
}

export default function HometaxImport({ open, onClose, onImport }: HometaxImportProps) {
  const [sourceType, setSourceType] = useState<string>('세금계산서')
  const [parsed, setParsed] = useState<ParsedItem[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError('')

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

        if (rows.length === 0) {
          setError('데이터가 없습니다. 올바른 홈택스 엑셀 파일인지 확인해주세요.')
          return
        }

        const items = parseSheet(rows, sourceType)
        if (items.length === 0) {
          // 자동 파싱 실패 시 첫 줄 표시
          const cols = Object.keys(rows[0]).join(', ')
          setError(`파싱 결과 0건. 엑셀 컬럼: ${cols.slice(0, 100)}... — 포맷이 다를 수 있습니다.`)
          return
        }

        setParsed(items)
      } catch {
        setError('엑셀 파일 읽기 오류. .xlsx 또는 .xls 파일을 사용해주세요.')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const toggleItem = (idx: number) => {
    setParsed(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p))
  }

  const toggleAll = () => {
    const allSelected = parsed.every(p => p.selected)
    setParsed(prev => prev.map(p => ({ ...p, selected: !allSelected })))
  }

  const doImport = () => {
    const selected = parsed.filter(p => p.selected).map(({ selected: _, ...rest }) => rest)
    if (selected.length === 0) return
    onImport(selected)
    setParsed([])
    setFileName('')
    onClose()
  }

  const reset = () => {
    setParsed([])
    setFileName('')
    setError('')
  }

  if (!open) return null

  const selectedCount = parsed.filter(p => p.selected).length
  const selectedTotal = parsed.filter(p => p.selected).reduce((s, p) => s + p.amount, 0)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-[#3498db]" />
            홈택스 매출 자료 불러오기
          </h3>
          <button onClick={onClose} className="text-[#8b8fa3] hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* 자료 유형 선택 */}
          <div>
            <label className="text-[11px] text-[#8b8fa3] block mb-2">자료 유형</label>
            <div className="flex gap-2">
              {['세금계산서', '카드매출', '현금영수증'].map(t => (
                <button
                  key={t}
                  onClick={() => { setSourceType(t); reset() }}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                    sourceType === t
                      ? 'bg-[#3498db] text-white'
                      : 'bg-[#0f1117] border border-[#2a2d3a] text-[#8b8fa3] hover:text-white'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* 안내 */}
          <div className="bg-[#0f1117] rounded-lg p-3 text-[11px] text-[#8b8fa3] space-y-1">
            <p className="font-medium text-white">홈택스에서 다운로드 방법:</p>
            {sourceType === '세금계산서' && (
              <>
                <p>1. 홈택스 → 조회/발급 → 전자세금계산서 → 매출 목록 조회</p>
                <p>2. 기간 설정 → 조회 → <span className="text-[#3498db]">엑셀 다운로드</span></p>
              </>
            )}
            {sourceType === '카드매출' && (
              <>
                <p>1. 홈택스 → 조회/발급 → 신용카드매출 → 매출내역 조회</p>
                <p>2. 기간 설정 → 조회 → <span className="text-[#3498db]">엑셀 다운로드</span></p>
              </>
            )}
            {sourceType === '현금영수증' && (
              <>
                <p>1. 홈택스 → 조회/발급 → 현금영수증 → 매출내역 조회</p>
                <p>2. 기간 설정 → 조회 → <span className="text-[#3498db]">엑셀 다운로드</span></p>
              </>
            )}
          </div>

          {/* 파일 업로드 */}
          <div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-[#2a2d3a] rounded-xl p-6 text-center hover:border-[#3498db] transition-colors"
            >
              <Upload size={24} className="mx-auto mb-2 text-[#8b8fa3]" />
              <p className="text-[12px] text-[#8b8fa3]">
                {fileName ? <span className="text-white">{fileName}</span> : '엑셀 파일을 선택하세요 (.xlsx, .xls, .csv)'}
              </p>
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-[#e74c3c]/10 text-[#e74c3c] rounded-lg p-3 text-[11px]">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 파싱 결과 */}
          {parsed.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-[#8b8fa3]">
                  <CheckCircle size={12} className="inline mr-1 text-[#4CAF50]" />
                  {parsed.length}건 인식 — {selectedCount}건 선택 ({krw(selectedTotal)})
                </span>
                <button onClick={toggleAll} className="text-[10px] text-[#3498db] hover:underline">
                  {parsed.every(p => p.selected) ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-[#2a2d3a]">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-[#1a1d27]">
                    <tr className="border-b border-[#2a2d3a]">
                      <th className="py-1.5 px-2 text-left text-[#8b8fa3] w-8"></th>
                      <th className="py-1.5 px-2 text-left text-[#8b8fa3]">날짜</th>
                      <th className="py-1.5 px-2 text-left text-[#8b8fa3]">거래처</th>
                      <th className="py-1.5 px-2 text-left text-[#8b8fa3]">내용</th>
                      <th className="py-1.5 px-2 text-right text-[#8b8fa3]">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((p, i) => (
                      <tr
                        key={i}
                        onClick={() => toggleItem(i)}
                        className={`border-b border-[#2a2d3a]/30 cursor-pointer hover:bg-[#22252f] ${!p.selected ? 'opacity-40' : ''}`}
                      >
                        <td className="py-1.5 px-2">
                          <input type="checkbox" checked={p.selected} readOnly className="accent-[#4CAF50]" />
                        </td>
                        <td className="py-1.5 px-2 tabular-nums">{p.date}</td>
                        <td className="py-1.5 px-2 max-w-[120px] truncate">{p.counterparty}</td>
                        <td className="py-1.5 px-2 max-w-[150px] truncate">{p.desc}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-[#4CAF50]">{krw(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-[#2a2d3a]">
          <button onClick={onClose} className="flex-1 border border-[#2a2d3a] text-[#8b8fa3] py-2.5 rounded-lg text-sm hover:text-white transition-colors">취소</button>
          <button
            onClick={doImport}
            disabled={selectedCount === 0}
            className="flex-1 bg-[#3498db] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#2980b9] transition-colors disabled:opacity-30"
          >
            {selectedCount}건 가져오기 ({krw(selectedTotal)})
          </button>
        </div>
      </div>
    </div>
  )
}
