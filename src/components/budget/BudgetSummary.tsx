import React from 'react'
import type { BudgetSheet } from '../../types/budget'
import { formatCurrency } from '../../utils/formatCurrency'

interface BudgetSummaryProps {
  sheet: BudgetSheet
}

const BudgetSummary: React.FC<BudgetSummaryProps> = ({ sheet }) => {
  const totalBudget = sheet.rows.reduce((sum, r) => sum + r.budgetPlanned, 0)
  const totalWhatIf = sheet.rows.reduce((sum, r) => sum + r.whatIf, 0)
  const difference = totalBudget - totalWhatIf

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
        <div className="summary-value">{sheet.rows.length}</div>
      </div>
    </div>
  )
}

export default BudgetSummary
