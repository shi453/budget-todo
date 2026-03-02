export type HighlightColor = 'none' | 'red' | 'green' | 'yellow' | 'orange'

export interface BudgetRow {
  id: string
  expenseDetails: string
  budgetPlanned: number
  whatIf: number
  highlightColor: HighlightColor
  excluded?: boolean
}

export interface BudgetSheet {
  id: string
  name: string
  rows: BudgetRow[]
  createdAt: string
}
