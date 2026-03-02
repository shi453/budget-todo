import React from 'react'
import type { BudgetSheet } from '../../types/budget'
import { formatCurrency } from '../../utils/formatCurrency'

interface BudgetSummaryProps {
  sheet: BudgetSheet
}

const BudgetSummary: React.FC<BudgetSummaryProps> = ({ sheet }) => {
  const includedRows = sheet.rows.filter((r) => !r.excluded)
  const totalBudget = includedRows.reduce((sum, r) => sum + r.budgetPlanned, 0)
  const totalWhatIf = includedRows.reduce((sum, r) => sum + r.whatIf, 0)
  const difference = totalBudget - totalWhatIf
  const excludedCount = sheet.rows.length - includedRows.length

  return (
    <div className="summary-bar">
      <div className="summary-item">
        <div className="summary-label">Total Budget</div>
        <div className="summary-value">{formatCurrency(totalBudget)}</div>
      </div>
      <div className="summary-item">
        <div className="summary-label">What-If Total</div>
        <div className="summary-value">{formatCurrency(totalWhatIf)}</div>
      </div>
      <div className="summary-item">
        <div className="summary-label">Difference</div>
        <div
          className="summary-value"
          style={{
            color: difference >= 0 ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {formatCurrency(difference)}
        </div>
      </div>
      <div className="summary-item">
        <div className="summary-label">Items</div>
        <div className="summary-value">
          {includedRows.length}
          {excludedCount > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
              ({excludedCount} excl.)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default BudgetSummary
