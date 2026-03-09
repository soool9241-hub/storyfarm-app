import Sidebar from './components/Sidebar'
import { useStore } from './store/useStore'
import Dashboard from './pages/Dashboard'
import Income from './pages/Income'
import Expense from './pages/Expense'
import Debt from './pages/Debt'
import Bep from './pages/Bep'
import Cashflow from './pages/Cashflow'
import Assets from './pages/Assets'
import Tax from './pages/Tax'
import Yearly from './pages/Yearly'
import Data from './pages/Data'
import AiInsight from './pages/AiInsight'

const pages = {
  dashboard: Dashboard,
  income: Income,
  expense: Expense,
  debt: Debt,
  bep: Bep,
  cashflow: Cashflow,
  assets: Assets,
  tax: Tax,
  yearly: Yearly,
  data: Data,
  ai: AiInsight,
}

export default function App() {
  const activeTab = useStore(s => s.activeTab)
  const Page = pages[activeTab]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-4 md:p-6 pt-14 md:pt-6">
          <Page />
        </div>
      </main>
    </div>
  )
}
