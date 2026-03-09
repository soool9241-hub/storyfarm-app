import { Upload, Download, RefreshCw, Database, FileSpreadsheet } from 'lucide-react'

export default function Data() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">데이터 관리</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 임포트 */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a] flex items-center gap-2">
            <Upload size={16} className="text-[#3498db]" /> 데이터 임포트
          </h3>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-[#2a2d3a] rounded-xl p-6 text-center hover:border-[#2E7D32] transition-colors cursor-pointer">
              <FileSpreadsheet size={32} className="mx-auto mb-2 text-[#8b8fa3]" />
              <p className="text-[13px] text-[#8b8fa3]">엑셀/CSV 파일을 드래그하거나 클릭</p>
              <p className="text-[10px] text-[#8b8fa3] mt-1">.xlsx, .xls, .csv 지원</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 text-[12px] text-[#8b8fa3] hover:border-[#2E7D32] hover:text-white transition-colors text-left">
                <div className="font-medium">국민카드 양식</div>
                <div className="text-[10px] mt-0.5">카드사 엑셀 자동 인식</div>
              </button>
              <button className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 text-[12px] text-[#8b8fa3] hover:border-[#2E7D32] hover:text-white transition-colors text-left">
                <div className="font-medium">신한카드 양식</div>
                <div className="text-[10px] mt-0.5">카드사 엑셀 자동 인식</div>
              </button>
              <button className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 text-[12px] text-[#8b8fa3] hover:border-[#2E7D32] hover:text-white transition-colors text-left">
                <div className="font-medium">은행 거래내역</div>
                <div className="text-[10px] mt-0.5">국민·기업은행 양식</div>
              </button>
              <button className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 text-[12px] text-[#8b8fa3] hover:border-[#2E7D32] hover:text-white transition-colors text-left">
                <div className="font-medium">구글 시트</div>
                <div className="text-[10px] mt-0.5">URL로 가져오기</div>
              </button>
            </div>
          </div>
        </div>

        {/* 익스포트 */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a] flex items-center gap-2">
            <Download size={16} className="text-[#4CAF50]" /> 데이터 익스포트
          </h3>
          <div className="space-y-2">
            {[
              { label: '전체 데이터 (엑셀)', desc: '모든 탭 데이터 포함', icon: '📊' },
              { label: '기간별 거래내역 (CSV)', desc: '시작~종료일 선택', icon: '📅' },
              { label: '세무사용 PDF 패키지', desc: '세금계산서 합계표 + 신고서 초안', icon: '📄' },
              { label: 'JSON 전체 백업', desc: '전체 데이터 JSON 형식', icon: '💾' },
            ].map((item, i) => (
              <button key={i} className="w-full flex items-center gap-3 bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 text-left hover:border-[#2E7D32] transition-colors">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="text-[12px] font-medium">{item.label}</div>
                  <div className="text-[10px] text-[#8b8fa3]">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 백업 상태 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-[#2a2d3a] flex items-center gap-2">
          <Database size={16} /> 백업 및 동기화
        </h3>
        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#4CAF50] rounded-full animate-pulse" />
            <span>마지막 동기화: 2026-03-10 03:00:00</span>
          </div>
          <button className="flex items-center gap-1.5 text-[#8b8fa3] hover:text-[#4CAF50] transition-colors">
            <RefreshCw size={14} /> 수동 동기화
          </button>
        </div>
      </div>
    </div>
  )
}
