export interface Transaction {
  id: string
  date: string
  type: 'income' | 'expense'
  business_type: 'workshop' | 'pension' | 'personal' | 'shared'
  amount: number
  tax_amount?: number
  category: string
  subcategory?: string
  counterparty?: string
  payment_method?: string
  order_id?: string
  is_confirmed?: boolean
  has_tax_invoice?: boolean
  receipt_url?: string
  note?: string
}

export interface Debt {
  id: string
  name: string
  type: 'bank_loan' | 'card_loan' | 'personal' | 'other'
  original_amount: number
  current_balance: number
  interest_rate: number
  monthly_payment: number
  payment_day: number
  due_date?: string
  last_paid_at?: string
  last_paid_amount?: number
  memo?: string
  is_active: boolean
}

export interface Asset {
  id: string
  name: string
  model?: string
  acquired_date: string
  acquisition_cost: number
  useful_life_months: number
  depreciation_method: 'straight_line' | 'declining'
  residual_value_rate: number
  accumulated_depreciation: number
  is_active: boolean
}

export interface CashFlowItem {
  date: string
  weekday: string
  income: number
  expense: number
  balance: number
  status: 'OK' | 'WARNING' | 'DANGER'
  details: string[]
}

export interface Insight {
  id: string
  type: 'daily_brief' | 'alert' | 'suggestion'
  priority: 'critical' | 'warning' | 'info'
  title: string
  content: string
  is_read: boolean
  created_at: string
}
