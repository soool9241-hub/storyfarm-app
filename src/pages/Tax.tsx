import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, Calendar, Download } from 'lucide-react'
import { krw } from '../lib/format'

const defaultTaxCalendar = [
  { date: '2026-01-25', desc: '부가세 신고·납부 (2기 확정)', status: 'done' },
  { date: '2026-05-31', desc: '종합소득세 신고·납부', status: 'upcoming' },
  { date: '2026-07-25', desc: '부가세 신고·납부 (1기 확정)', status: 'upcoming' },
  { date: '2026-11-30', desc: '중간예납', status: 'upcoming' },
]

const defaultVat = { sales: 2790000, purchase: 1830000, due: 960000, note: '* 세금계산서 미수취 건 3건 — 매입세액 공제 누락 가능' }
const defaultIncomeTax = { income: 55800000, expense: 49140000, taxBase: 6660000, bracket: '6% (1,400만 이하)', tax: 399600 }

export default function Tax() {
  const [taxCalendar, setTaxCalendar] = useState(defaultTaxCalendar)
  const [vat, setVat] = useState(defaultVat)
  const [incomeTax, setIncomeTax] = useState(defaultIncomeTax)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase.from('tax_records').select('*').order('due_date')

        if (error) throw error

        if (data && data.length > 0) {
          // Build tax calendar from records
          const calendar = data.map((record: any) => ({
            date: record.due_date || '',
            desc: `${record.type || ''}${record.period ? ' ' + record.period : ''}`,
            status: record.status || 'upcoming',
          }))
          setTaxCalendar(calendar)

          // Find VAT record
          const vatRecord = data.find((r: any) => r.type === '부가세')
          if (vatRecord) {
            setVat({
              sales: vatRecord.sales_tax || vatRecord.매출세액 || defaultVat.sales,
              purchase: vatRecord.purchase_tax || vatRecord.매입세액 || defaultVat.purchase,
              due: vatRecord.due_amount || vatRecord.납부액 || defaultVat.due,
              note: vatRecord.note || defaultVat.note,
            })
          }

          // Find income tax record
          const incomeRecord = data.find((r: any) => r.type === '종합소득세')
          if (incomeRecord) {
            setIncomeTax({
              income: incomeRecord.business_income || incomeRecord.사업소득 || defaultIncomeTax.income,
              expense: incomeRecord.necessary_expense || incomeRecord.필요경비 || defaultIncomeTax.expense,
              taxBase: incomeRecord.tax_base || incomeRecord.과세표준 || defaultIncomeTax.taxBase,
              bracket: incomeRecord.tax_bracket || incomeRecord.세율구간 || defaultIncomeTax.bracket,
              tax: incomeRecord.estimated_tax || incomeRecord.예상세액 || defaultIncomeTax.tax,
            })
          }
        }
      } catch (err) {
        console.error('Tax fetch error, using defaults:', err)
        // Keep default values on error
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">세무 관리</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 부가세 */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a] flex items-center gap-2">
            <FileText size={16} className="text-[#3498db]" /> 부가세 예상 (2026년 1기)
          </h3>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-[#8b8fa3]">매출세액 (1~6월 예상)</span><span>{krw(vat.sales)}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8fa3]">매입세액</span><span>{krw(vat.purchase)}</span></div>
            <div className="flex justify-between border-t border-[#2a2d3a] pt-2 font-bold">
              <span>예상 납부액</span><span className="text-[#e74c3c]">{krw(vat.due)}</span>
            </div>
            <p className="text-[11px] text-[#8b8fa3] mt-2">{vat.note}</p>
          </div>
        </div>

        {/* 종소세 */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a] flex items-center gap-2">
            <FileText size={16} className="text-[#9b59b6]" /> 종합소득세 예상
          </h3>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-[#8b8fa3]">사업소득 (연간 예상)</span><span>{krw(incomeTax.income)}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8fa3]">필요경비</span><span>{krw(incomeTax.expense)}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8fa3]">과세표준</span><span>{krw(incomeTax.taxBase)}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8fa3]">세율 구간</span><span>{incomeTax.bracket}</span></div>
            <div className="flex justify-between border-t border-[#2a2d3a] pt-2 font-bold">
              <span>예상 세액</span><span className="text-[#e74c3c]">{krw(incomeTax.tax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 절세 항목 */}
      <div className="bg-gradient-to-r from-[#2E7D32]/10 to-[#1a1d27] border border-[#2E7D32]/30 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2 text-[#4CAF50]">절세 항목 발굴</h3>
        <div className="space-y-2 text-[12px]">
          <div className="flex items-start gap-2"><span className="text-[#4CAF50]">•</span><span>노란우산공제 가입 시 연 300만원 소득공제 가능</span></div>
          <div className="flex items-start gap-2"><span className="text-[#4CAF50]">•</span><span>업무용 차량 감가상각비 경비 처리 가능</span></div>
          <div className="flex items-start gap-2"><span className="text-[#4CAF50]">•</span><span>교육훈련비 (CNC 교육) 세액공제 대상</span></div>
          <div className="flex items-start gap-2"><span className="text-[#f1c40f]">!</span><span>국민카드 결제 중 세금계산서 미수취 3건 확인 필요</span></div>
        </div>
      </div>

      {/* 세무 캘린더 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a] flex items-center gap-2">
          <Calendar size={16} /> 세무 캘린더
        </h3>
        <div className="space-y-2">
          {taxCalendar.map((t, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[#2a2d3a]/50 last:border-0 text-[12px]">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${t.status === 'done' ? 'bg-[#4CAF50]' : 'bg-[#f1c40f]'}`} />
                <span className="text-[#8b8fa3] tabular-nums">{t.date}</span>
                <span>{t.desc}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.status === 'done' ? 'bg-[#4CAF50]/20 text-[#4CAF50]' : 'bg-[#f1c40f]/20 text-[#f1c40f]'}`}>
                {t.status === 'done' ? '완료' : '예정'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button className="flex items-center gap-2 bg-[#2E7D32] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4CAF50]">
        <Download size={16} /> 세무사 제출 패키지 다운로드
      </button>
    </div>
  )
}
