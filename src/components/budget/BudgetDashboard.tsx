import React, { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import SpreadsheetGrid from './SpreadsheetGrid'
import BudgetSummary from './BudgetSummary'
import { exportToCSV } from '../../utils/csvExport'
import { exportBudgetData, importBudgetData } from '../../utils/dataExport'

const BudgetDashboard: React.FC = () => {
  const {
    sheets,
    activeSheetId,
    setActiveSheet,
    addSheet,
    deleteSheet,
    duplicateSheet,
    renameSheet,
    importSheets,
  } = useBudgetStore()

  const activeSheet = sheets.find((s) => s.id === activeSheetId)

  const [showNewSheet, setShowNewSheet] = useState(false)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [sheetName, setSheetName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleAddSheet = () => {
    if (sheetName.trim()) {
      addSheet(sheetName.trim())
      setSheetName('')
      setShowNewSheet(false)
    }
  }

  const handleDuplicate = () => {
    if (sheetName.trim() && activeSheetId) {
      duplicateSheet(activeSheetId, sheetName.trim())
      setSheetName('')
      setShowDuplicate(false)
    }
  }

  const handleRename = () => {
    if (sheetName.trim() && activeSheetId) {
      renameSheet(activeSheetId, sheetName.trim())
      setSheetName('')
      setShowRename(false)
    }
  }

  const handleDeleteSheet = () => {
    if (sheets.length > 1 && activeSheetId) {
      if (confirm('Delete this sheet? This cannot be undone.')) {
        deleteSheet(activeSheetId)
      }
    }
  }

  const handleExport = () => {
    exportBudgetData(sheets)
  }

  const handleImport = async () => {
    const newSheets = await importBudgetData()
    if (newSheets) {
      const count = newSheets.length
      if (confirm(`Import ${count} sheet${count > 1 ? 's' : ''}? They will be added alongside your existing sheets.`)) {
        importSheets(newSheets)
      }
    }
  }

  const closeModals = () => {
    setShowNewSheet(false)
    setShowDuplicate(false)
    setShowRename(false)
  }

  const handleModalSubmit = () => {
    if (showNewSheet) handleAddSheet()
    else if (showDuplicate) handleDuplicate()
    else if (showRename) handleRename()
  }

  return (
    <div className="budget-dashboard">
      {/* Sheet tabs */}
      <div className="sheet-tabs-container">
        <div className="sheet-tabs">
          {sheets.map((sheet) => (
            <button
              key={sheet.id}
              className={`sheet-tab ${sheet.id === activeSheetId ? 'active' : ''}`}
              onClick={() => setActiveSheet(sheet.id)}
            >
              {sheet.name}
            </button>
          ))}
          <button
            className="sheet-tab add-tab"
            onClick={() => {
              setSheetName('')
              setShowNewSheet(true)
            }}
          >
            + New
          </button>
        </div>
        <div className="sheet-actions">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setSheetName((activeSheet?.name || '') + ' (Copy)')
              setShowDuplicate(true)
            }}
          >
            📋 Duplicate
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setSheetName(activeSheet?.name || '')
              setShowRename(true)
            }}
          >
            ✏️ Rename
          </button>
          {sheets.length > 1 && (
            <button
              className="btn btn-sm btn-danger"
              onClick={handleDeleteSheet}
            >
              🗑️ Delete
            </button>
          )}
          {activeSheet && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => exportToCSV(activeSheet)}
            >
              📥 Export CSV
            </button>
          )}
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleExport}
          >
            💾 Export Data
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleImport}
          >
            📂 Import Data
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {activeSheet && <BudgetSummary sheet={activeSheet} />}

      {/* Search bar */}
      <div className="toolbar">
        <input
          type="text"
          placeholder="🔍 Search expenses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Spreadsheet grid */}
      {activeSheet && (
        <SpreadsheetGrid sheet={activeSheet} searchQuery={searchQuery} />
      )}

      {/* Modals */}
      {(showNewSheet || showDuplicate || showRename) && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {showNewSheet
                ? 'New Sheet'
                : showDuplicate
                  ? 'Duplicate Sheet'
                  : 'Rename Sheet'}
            </h3>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleModalSubmit()
                if (e.key === 'Escape') closeModals()
              }}
              style={{ width: '100%' }}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeModals}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleModalSubmit}>
                {showNewSheet
                  ? 'Create'
                  : showDuplicate
                    ? 'Duplicate'
                    : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BudgetDashboard
