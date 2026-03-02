import type { BudgetSheet } from '../types/budget'

export function exportToCSV(sheet: BudgetSheet): void {
  const headers = ['#', 'Expense Details', 'Budget Planned (Rs)', 'What-If (Rs)']
  const rows = sheet.rows.map((r, i) => [
    (i + 1).toString(),
    `"${r.expenseDetails.replace(/"/g, '""')}"`,
    r.budgetPlanned.toString(),
    r.whatIf.toString(),
  ])

  const totals = sheet.rows.reduce(
    (acc, r) => ({
      budget: acc.budget + r.budgetPlanned,
      whatIf: acc.whatIf + r.whatIf,
    }),
    { budget: 0, whatIf: 0 }
  )

  rows.push(['', 'TOTAL', totals.budget.toString(), totals.whatIf.toString()])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sheet.name}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
