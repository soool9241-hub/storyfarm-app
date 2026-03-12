import { useState } from 'react'
import { Link2, Loader2, X, FileSpreadsheet, ClipboardPaste, CheckSquare, Square } from 'lucide-react'
import * as XLSX from 'xlsx'

interface LinkImportProps {
  open: boolean
  onClose: () => void
  onImport: (rows: Record<string, string>[]) => void
  title?: string
}

export default function LinkImport({ open, onClose, onImport, title = '링크/텍스트 데이터 가져오기' }: LinkImportProps) {
  const [mode, setMode] = useState<'link' | 'paste'>('link')
  const [url, setUrl] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<Record<string, string>[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  if (!open) return null

  const reset = () => { setUrl(''); setPasteText(''); setParsed([]); setSelected(new Set()); setError(''); setLoading(false) }
  const handleClose = () => { reset(); onClose() }

  // URL에서 데이터 가져오기
  const fetchFromUrl = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setParsed([])

    try {
      // Google Sheets → CSV 변환
      let fetchUrl = url.trim()
      if (fetchUrl.includes('docs.google.com/spreadsheets')) {
        const match = fetchUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)
        if (match) {
          const gid = fetchUrl.match(/gid=(\d+)/)?.[1] || '0'
          fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`
        }
      }

      // CORS 프록시 시도
      const proxies = [
        fetchUrl, // 직접 시도
        `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`,
      ]

      let data: string | ArrayBuffer | null = null
      let isExcel = fetchUrl.match(/\.(xlsx|xls)(\?|$)/i)

      for (const proxyUrl of proxies) {
        try {
          const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
          if (!res.ok) continue
          if (isExcel) {
            data = await res.arrayBuffer()
          } else {
            data = await res.text()
          }
          break
        } catch { continue }
      }

      if (!data) throw new Error('URL에서 데이터를 가져올 수 없습니다. 텍스트 붙여넣기를 사용해주세요.')

      if (isExcel && data instanceof ArrayBuffer) {
        const wb = XLSX.read(new Uint8Array(data), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        if (rows.length === 0) throw new Error('데이터가 비어있습니다.')
        setParsed(rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), String(v ?? '').trim()]))))
        setSelected(new Set(rows.map((_, i) => i)))
      } else if (typeof data === 'string') {
        parseTextData(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    }
    setLoading(false)
  }

  // 텍스트 데이터 파싱
  const parseTextData = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) { setError('데이터가 비어있습니다.'); return }

    // JSON 시도
    try {
      const json = JSON.parse(trimmed)
      if (Array.isArray(json) && json.length > 0) {
        setParsed(json.map((r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))))
        setSelected(new Set(json.map((_: unknown, i: number) => i)))
        return
      }
    } catch { /* not JSON */ }

    // CSV/TSV 시도
    const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l)
    if (lines.length < 2) { setError('최소 2줄 이상의 데이터가 필요합니다 (헤더 + 데이터).'); return }

    // 구분자 감지
    const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : lines[0].includes('|') ? '|' : null
    if (!sep) {
      // 공백 구분 시도
      const headers = lines[0].split(/\s{2,}/).map(h => h.trim())
      if (headers.length >= 2) {
        const rows = lines.slice(1).map(l => {
          const vals = l.split(/\s{2,}/).map(v => v.trim())
          return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
        })
        setParsed(rows)
        setSelected(new Set(rows.map((_, i) => i)))
        return
      }
      setError('데이터 형식을 인식할 수 없습니다. CSV, TSV, JSON 형식을 지원합니다.')
      return
    }

    const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''))
    const rows = lines.slice(1).map(line => {
      const vals = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''))
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
    })

    if (rows.length === 0) { setError('파싱된 데이터가 없습니다.'); return }
    setParsed(rows)
    setSelected(new Set(rows.map((_, i) => i)))
  }

  const handlePaste = () => {
    setError('')
    setParsed([])
    parseTextData(pasteText)
  }

  const toggleSelect = (idx: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }
  const toggleAll = () => {
    setSelected(prev => prev.size === parsed.length ? new Set() : new Set(parsed.map((_, i) => i)))
  }

  const handleImport = () => {
    const items = parsed.filter((_, i) => selected.has(i))
    if (items.length === 0) return
    onImport(items)
    handleClose()
  }

  const headers = parsed.length > 0 ? Object.keys(parsed[0]) : []

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Link2 size={16} className="text-[#3498db]" /> {title}
          </h3>
          <button onClick={handleClose} className="text-[#8b8fa3] hover:text-white"><X size={18} /></button>
        </div>

        {/* 모드 선택 */}
        <div className="p-4 border-b border-[#2a2d3a]">
          <div className="flex gap-2 mb-3">
            <button onClick={() => { setMode('link'); setParsed([]); setError('') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${mode === 'link' ? 'bg-[#3498db] text-white' : 'bg-[#0f1117] text-[#8b8fa3] hover:text-white border border-[#2a2d3a]'}`}>
              <Link2 size={13} /> URL 링크
            </button>
            <button onClick={() => { setMode('paste'); setParsed([]); setError('') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${mode === 'paste' ? 'bg-[#3498db] text-white' : 'bg-[#0f1117] text-[#8b8fa3] hover:text-white border border-[#2a2d3a]'}`}>
              <ClipboardPaste size={13} /> 텍스트 붙여넣기
            </button>
          </div>

          {mode === 'link' ? (
            <div className="flex gap-2">
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://... (CSV, Excel, Google Sheets 링크)"
                onKeyDown={e => e.key === 'Enter' && fetchFromUrl()}
                className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#3498db]" />
              <button onClick={fetchFromUrl} disabled={loading || !url.trim()}
                className="flex items-center gap-1.5 bg-[#3498db] text-white px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-[#2980b9] disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                {loading ? '로딩...' : '가져오기'}
              </button>
            </div>
          ) : (
            <div>
              <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder={"웹에서 복사한 표 데이터를 붙여넣으세요.\n\nCSV, TSV, JSON 형식 지원\n\n예시:\n날짜,내용,금액\n2026-03-01,재료비,50000\n2026-03-02,교통비,15000"}
                className="w-full h-32 bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-[#3498db] resize-none font-mono" />
              <button onClick={handlePaste} disabled={!pasteText.trim()}
                className="mt-2 flex items-center gap-1.5 bg-[#3498db] text-white px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-[#2980b9] disabled:opacity-50">
                <FileSpreadsheet size={14} /> 파싱하기
              </button>
            </div>
          )}

          {error && <div className="mt-2 text-[11px] text-[#e74c3c] bg-[#e74c3c]/10 rounded-lg p-2">{error}</div>}
          <p className="mt-2 text-[10px] text-[#8b8fa3]">
            지원 형식: CSV, TSV, Excel(xlsx), JSON, Google Sheets 링크
          </p>
        </div>

        {/* 파싱 결과 미리보기 */}
        {parsed.length > 0 && (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2d3a]">
              <span className="text-[11px] text-[#8b8fa3]">
                총 <span className="text-white font-medium">{parsed.length}</span>건 파싱됨
                {selected.size > 0 && <span className="text-[#3498db] ml-2">({selected.size}건 선택)</span>}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={toggleAll} className="text-[10px] text-[#8b8fa3] hover:text-white">
                  {selected.size === parsed.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b-2 border-[#2a2d3a]">
                    <th className="py-1.5 px-2 w-8">
                      <button onClick={toggleAll} className="text-[#8b8fa3] hover:text-white">
                        {selected.size === parsed.length ? <CheckSquare size={13} /> : <Square size={13} />}
                      </button>
                    </th>
                    {headers.map(h => (
                      <th key={h} className="text-left py-1.5 px-2 text-[#8b8fa3] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((row, i) => (
                    <tr key={i} className={`border-b border-[#2a2d3a]/50 hover:bg-[#22252f] ${selected.has(i) ? 'bg-[#3498db]/5' : ''}`}>
                      <td className="py-1.5 px-2">
                        <button onClick={() => toggleSelect(i)} className="text-[#8b8fa3] hover:text-white">
                          {selected.has(i) ? <CheckSquare size={13} className="text-[#3498db]" /> : <Square size={13} />}
                        </button>
                      </td>
                      {headers.map(h => (
                        <td key={h} className="py-1.5 px-2 max-w-[150px] truncate">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 50 && <p className="text-[10px] text-[#8b8fa3] mt-2 text-center">외 {parsed.length - 50}건 더 있음</p>}
            </div>
          </>
        )}

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[#2a2d3a]">
          <button onClick={handleClose} className="px-4 py-2 text-[12px] text-[#8b8fa3] hover:text-white">취소</button>
          {parsed.length > 0 && (
            <button onClick={handleImport} disabled={selected.size === 0}
              className="flex items-center gap-1.5 bg-[#2E7D32] text-white px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-[#4CAF50] disabled:opacity-50">
              {selected.size}건 가져오기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
