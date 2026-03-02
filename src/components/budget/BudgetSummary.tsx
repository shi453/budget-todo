import React from 'react'
import type { BudgetSheet } from '../../types/budget'
import { formatCurrency } from '../../utils/formatCurrency'
import { Wallet, FlaskConical, TrendingUp, Hash } from 'lucide-react'

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
        <div className="summary-label"><Wallet size={12} /> Total Budget</div>
        <div className="summary-value" style={{ color: 'var(--color-budget)' }}>{formatCurrency(totalBudget)}</div>
      </div>
      <div className="summary-item">
        <div className="summary-label"><FlaskConical size={12} /> What-If Total</div>
        <div className="summary-value" style={{ color: 'var(--color-whatif)' }}>{formatCurrency(totalWhatIf)}</div>
      </div>
      <div className="summary-item">
        <div className="summary-label"><TrendingUp size={12} /> Difference</div>
        <div className="summary-value" style={{ color: 'var(--color-diff)' }}>
          {formatCurrency(difference)}
        </div>
      </div>
      <div className="summary-item">
        <div className="summary-label"><Hash size={12} /> Items</div>
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
