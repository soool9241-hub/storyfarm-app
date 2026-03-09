import { create } from 'zustand'

export type TabId =
  | 'dashboard' | 'income' | 'expense' | 'debt'
  | 'bep' | 'cashflow' | 'assets' | 'tax'
  | 'yearly' | 'data' | 'ai'

interface AppState {
  activeTab: TabId
  setTab: (tab: TabId) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  setTab: (tab) => set({ activeTab: tab, sidebarOpen: false }),
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
