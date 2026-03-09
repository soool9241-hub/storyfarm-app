import { useStore, type TabId } from '../store/useStore'
import {
  LayoutDashboard, TrendingUp, TrendingDown, CreditCard,
  Target, Wallet, Wrench, FileText, BarChart3, Database, Bot, Users, Menu, X
} from 'lucide-react'

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={18} /> },
  { id: 'income', label: '수입 관리', icon: <TrendingUp size={18} /> },
  { id: 'expense', label: '지출 관리', icon: <TrendingDown size={18} /> },
  { id: 'debt', label: '대출·채무', icon: <CreditCard size={18} /> },
  { id: 'bep', label: '손익분기점', icon: <Target size={18} /> },
  { id: 'cashflow', label: '현금흐름', icon: <Wallet size={18} /> },
  { id: 'assets', label: '자산·장비', icon: <Wrench size={18} /> },
  { id: 'tax', label: '세무 관리', icon: <FileText size={18} /> },
  { id: 'yearly', label: '연도별 분석', icon: <BarChart3 size={18} /> },
  { id: 'data', label: '데이터 관리', icon: <Database size={18} /> },
  { id: 'ai', label: 'AI 인사이트', icon: <Bot size={18} /> },
  { id: 'team', label: 'AI 에이전트 팀', icon: <Users size={18} /> },
]

export default function Sidebar() {
  const { activeTab, setTab, sidebarOpen, toggleSidebar } = useStore()

  return (
    <>
      {/* 모바일 햄버거 */}
      <button
        onClick={toggleSidebar}
        className="fixed top-3 left-3 z-50 md:hidden bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-2 text-[#8b8fa3] hover:text-white transition-colors"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => toggleSidebar()}
        />
      )}

      {/* 사이드바 */}
      <aside className={`
        fixed top-0 left-0 h-full w-56 bg-[#1a1d27] border-r border-[#2a2d3a] z-40
        flex flex-col overflow-y-auto transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto
      `}>
        {/* 로고 */}
        <div className="px-4 py-5 border-b border-[#2a2d3a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#2E7D32] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(46,125,50,0.3)]">
              SF
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">스토리<span className="text-[#4CAF50]">팜</span></h1>
              <p className="text-[10px] text-[#8b8fa3]">통합 재무관리</p>
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-2 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium
                transition-all mb-0.5 text-left
                ${activeTab === tab.id
                  ? 'bg-[#2E7D32]/20 text-[#4CAF50] shadow-[inset_0_0_0_1px_rgba(46,125,50,0.3)]'
                  : 'text-[#8b8fa3] hover:text-white hover:bg-[#22252f]'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 하단 정보 */}
        <div className="px-4 py-3 border-t border-[#2a2d3a] text-[10px] text-[#8b8fa3]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#4CAF50] rounded-full animate-pulse" />
            2026-03 운영 중
          </div>
        </div>
      </aside>
    </>
  )
}
