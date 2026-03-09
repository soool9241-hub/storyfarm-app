import { Bot, Cpu, BarChart3, Shield, Zap, Users } from 'lucide-react'

const agents = [
  {
    name: 'SOL-CFO',
    role: '재무 총괄 AI',
    desc: '스토리팜의 전체 재무 상태를 실시간 모니터링하고 의사결정을 지원합니다. 매일 브리핑을 제공하며, 자연어로 재무 질문에 답변합니다.',
    icon: <Bot size={24} />,
    color: '#4CAF50',
    skills: ['일일 브리핑', '자연어 재무 Q&A', '리스크 경보', '의사결정 지원'],
  },
  {
    name: 'SOL-Analyst',
    role: '데이터 분석 AI',
    desc: '수입·지출·채무 데이터를 분석하여 트렌드, 이상치, 최적화 포인트를 발견합니다.',
    icon: <BarChart3 size={24} />,
    color: '#3498db',
    skills: ['매출 트렌드 분석', '비용 구조 최적화', 'BEP 시뮬레이션', '수익성 비교'],
  },
  {
    name: 'SOL-Guard',
    role: '리스크 관리 AI',
    desc: '현금흐름 위험, 고금리 채무, 만기일 등을 모니터링하고 사전 경고합니다.',
    icon: <Shield size={24} />,
    color: '#e74c3c',
    skills: ['현금흐름 예측', '채무 리스크 경보', '만기일 알림', '비상 자금 관리'],
  },
  {
    name: 'SOL-Tax',
    role: '세무 도우미 AI',
    desc: 'VAT, 종합소득세 예상 세액을 계산하고 절세 전략을 제안합니다.',
    icon: <Cpu size={24} />,
    color: '#9b59b6',
    skills: ['세금 자동 계산', '절세 포인트 발굴', '신고 일정 관리', '세무 규정 안내'],
  },
  {
    name: 'SOL-Ops',
    role: '운영 효율화 AI',
    desc: '장비 가동률, 유지보수 일정, 재고 관리를 최적화합니다.',
    icon: <Zap size={24} />,
    color: '#f1c40f',
    skills: ['장비 상태 모니터링', '유지보수 예측', '가동률 최적화', '재고 관리'],
  },
]

export default function Team() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">AI 에이전트 팀</h2>
        <div className="flex items-center gap-2 text-[11px] text-[#8b8fa3]">
          <Users size={14} />
          {agents.length}개 에이전트 운영 중
        </div>
      </div>

      {/* 팀 소개 배너 */}
      <div className="bg-gradient-to-r from-[#2E7D32]/20 to-[#3498db]/10 border border-[#2E7D32]/30 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#4CAF50] mb-2">스토리팜 AI 에이전트 팀</h3>
        <p className="text-[12px] text-[#8b8fa3] leading-relaxed">
          5개의 전문 AI 에이전트가 협업하여 스토리팜의 재무를 24시간 관리합니다.
          각 에이전트는 Claude API 기반으로 자연어 소통이 가능하며, 실시간 데이터를 기반으로 인사이트를 제공합니다.
        </p>
      </div>

      {/* 에이전트 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <div key={agent.name} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 hover:border-[#2E7D32]/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${agent.color}20`, color: agent.color }}>
                {agent.icon}
              </div>
              <div>
                <h4 className="font-semibold text-sm">{agent.name}</h4>
                <span className="text-[10px] text-[#8b8fa3]">{agent.role}</span>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: agent.color }} />
            </div>
            <p className="text-[11px] text-[#8b8fa3] leading-relaxed mb-3">{agent.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {agent.skills.map(skill => (
                <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full border border-[#2a2d3a] text-[#8b8fa3]">{skill}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 시스템 아키텍처 */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4 pb-2 border-b border-[#2a2d3a]">시스템 아키텍처</h3>
        <div className="space-y-3 text-[12px]">
          <div className="flex items-center gap-3 p-3 bg-[#0f1117] rounded-lg">
            <div className="w-8 h-8 bg-[#4CAF50]/20 rounded-lg flex items-center justify-center text-[#4CAF50]"><Cpu size={16} /></div>
            <div className="flex-1">
              <span className="font-medium">AI 엔진</span>
              <span className="text-[#8b8fa3] ml-2">Claude API (Anthropic) — 자연어 이해 및 재무 분석</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#0f1117] rounded-lg">
            <div className="w-8 h-8 bg-[#3498db]/20 rounded-lg flex items-center justify-center text-[#3498db]"><Zap size={16} /></div>
            <div className="flex-1">
              <span className="font-medium">프론트엔드</span>
              <span className="text-[#8b8fa3] ml-2">React + TypeScript + Tailwind CSS + Recharts</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#0f1117] rounded-lg">
            <div className="w-8 h-8 bg-[#9b59b6]/20 rounded-lg flex items-center justify-center text-[#9b59b6]"><Shield size={16} /></div>
            <div className="flex-1">
              <span className="font-medium">백엔드</span>
              <span className="text-[#8b8fa3] ml-2">Supabase (PostgreSQL + Auth + Storage + Edge Functions)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
