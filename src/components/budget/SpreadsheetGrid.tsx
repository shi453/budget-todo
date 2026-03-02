import React, { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import type { BudgetSheet, HighlightColor } from '../../types/budget'
import { formatCurrency } from '../../utils/formatCurrency'
import { Palette, Trash2, GripVertical, Check, Ban, Plus } from 'lucide-react'

interface SpreadsheetGridProps {
  sheet: BudgetSheet
  searchQuery: string
}

const HIGHLIGHT_COLORS: { color: HighlightColor; label: string }[] = [
  { color: 'none', label: 'None' },
  { color: 'red', label: 'Red' },
  { color: 'green', label: 'Green' },
  { color: 'yellow', label: 'Yellow' },
  { color: 'orange', label: 'Orange' },
]

const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  sheet,
  searchQuery,
}) => {
  const { addRow, deleteRow, updateRow, setRowHighlight, toggleRowExcluded, moveRow } =
    useBudgetStore()

  const [editingCell, setEditingCell] = useState<{
    rowId: string
    field: string
  } | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [colorPickerRowId, setColorPickerRowId] = useState<string | null>(null)

  const filteredRows = sheet.rows.filter(
    (row) =>
      !searchQuery ||
      row.expenseDetails.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCellClick = (rowId: string, field: string) => {
    setEditingCell({ rowId, field })
  }

  const handleCellChange = (
    rowId: string,
    field: string,
    value: string
  ) => {
    if (field === 'budgetPlanned' || field === 'whatIf') {
      const num = parseFloat(value) || 0
      updateRow(rowId, { [field]: num })
    } else {
      updateRow(rowId, { [field]: value })
    }
  }

  const handleCellBlur = () => {
    setEditingCell(null)
  }

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowId: string,
    field: string,
    rowIndex: number
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const fields = ['expenseDetails', 'budgetPlanned', 'whatIf']
      const idx = fields.indexOf(field)
      if (e.shiftKey) {
        if (idx > 0) {
          setEditingCell({ rowId, field: fields[idx - 1] })
        } else if (rowIndex > 0) {
          setEditingCell({
            rowId: filteredRows[rowIndex - 1].id,
            field: fields[fields.length - 1],
          })
        }
      } else {
        if (idx < fields.length - 1) {
          setEditingCell({ rowId, field: fields[idx + 1] })
        } else if (rowIndex < filteredRows.length - 1) {
          setEditingCell({
            rowId: filteredRows[rowIndex + 1].id,
            field: fields[0],
          })
        }
      }
    } else if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      moveRow(dragIndex, index)
      setDragIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDragIndex(null)
  }

  const getRowStyle = (color: HighlightColor, excluded?: boolean): React.CSSProperties => {
    const style: React.CSSProperties = {}
    if (color !== 'none') style.backgroundColor = `var(--highlight-${color})`
    if (excluded) {
      style.opacity = 0.5
      style.textDecoration = 'line-through'
    }
    return style
  }

  const renderCell = (
    rowId: string,
    field: string,
    value: string | number,
    rowIndex: number
  ) => {
    const isEditing =
      editingCell?.rowId === rowId && editingCell?.field === field
    const isNumber = field === 'budgetPlanned' || field === 'whatIf'

    if (isEditing) {
      return (
        <input
          type={isNumber ? 'number' : 'text'}
          value={value}
          onChange={(e) => handleCellChange(rowId, field, e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={(e) => handleKeyDown(e, rowId, field, rowIndex)}
          autoFocus
          className="cell-input"
        />
      )
    }

    return (
      <div
        className={`cell-display ${isNumber ? 'cell-number' : ''}`}
        onClick={() => handleCellClick(rowId, field)}
      >
        {isNumber
          ? formatCurrency(value as number)
          : (value as string) || '\u00A0'}
      </div>
    )
  }

  return (
    <div className="spreadsheet-wrapper">
      <table className="spreadsheet">
        <thead>
          <tr>
            <th className="col-drag"></th>
            <th className="col-num">#</th>
            <th className="col-expense">Expense Details</th>
            <th className="col-budget">Budget Planned (₹)</th>
            <th className="col-whatif">What-If (₹)</th>
            <th className="col-exclude" title="Exclude from totals"><Ban size={12} /></th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, index) => (
            <tr
              key={row.id}
              style={getRowStyle(row.highlightColor, row.excluded)}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`${dragIndex === index ? 'dragging' : ''} ${row.excluded ? 'row-excluded' : ''}`}
            >
              <td className="col-drag">
                <span className="drag-handle"><GripVertical size={14} /></span>
              </td>
              <td className="col-num">{index + 1}</td>
              <td className="col-expense">
                {renderCell(row.id, 'expenseDetails', row.expenseDetails, index)}
              </td>
              <td className="col-budget">
                {renderCell(row.id, 'budgetPlanned', row.budgetPlanned, index)}
              </td>
              <td className="col-whatif">
                {renderCell(row.id, 'whatIf', row.whatIf, index)}
              </td>
              <td className="col-exclude">
                <button
                  className={`btn-icon exclude-toggle ${row.excluded ? 'excluded' : ''}`}
                  onClick={() => toggleRowExcluded(row.id)}
                  title={row.excluded ? 'Include in totals' : 'Exclude from totals'}
                >
                  {row.excluded ? <Ban size={14} /> : <Check size={14} />}
                </button>
              </td>
              <td className="col-actions">
                <div className="row-actions">
                  <div className="color-picker-wrapper">
                    <button
                      className="btn-icon"
                      onClick={() =>
                        setColorPickerRowId(
                          colorPickerRowId === row.id ? null : row.id
                        )
                      }
                      title="Highlight row"
                    >
                      <Palette size={14} />
                    </button>
                    {colorPickerRowId === row.id && (
                      <div className="color-picker-dropdown">
                        {HIGHLIGHT_COLORS.map(({ color, label }) => (
                          <button
                            key={color}
                            className={`color-dot ${color} ${row.highlightColor === color ? 'active' : ''}`}
                            onClick={() => {
                              setRowHighlight(row.id, color)
                              setColorPickerRowId(null)
                            }}
                            title={label}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn-icon danger"
                    onClick={() => deleteRow(row.id)}
                    title="Delete row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="totals-row">
            <td></td>
            <td></td>
            <td className="totals-label">TOTAL</td>
            <td className="totals-value">
              {formatCurrency(
                sheet.rows.filter((r) => !r.excluded).reduce((sum, r) => sum + r.budgetPlanned, 0)
              )}
            </td>
            <td className="totals-value">
              {formatCurrency(
                sheet.rows.filter((r) => !r.excluded).reduce((sum, r) => sum + r.whatIf, 0)
              )}
            </td>
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      <button className="btn btn-primary add-row-btn" onClick={addRow}>
        <Plus size={14} /> Add Row
      </button>
    </div>
  )
}

export default SpreadsheetGrid
