import React, { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import SpreadsheetGrid from './SpreadsheetGrid'
import BudgetSummary from './BudgetSummary'
import { exportToCSV } from '../../utils/csvExport'
import { exportBudgetData, importBudgetData } from '../../utils/dataExport'
import ConfirmDialog from '../common/ConfirmDialog'
import { toast } from '../../store/toastStore'
import { Copy, Pencil, Trash2, Download, Save, FolderOpen, Search } from 'lucide-react'

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingImport, setPendingImport] = useState<any>(null)

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
      setShowDeleteConfirm(true)
    }
  }

  const handleExport = () => {
    exportBudgetData(sheets)
  }

  const handleImport = async () => {
    const newSheets = await importBudgetData()
    if (newSheets) {
      setPendingImport(newSheets)
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
            <Copy size={14} /> Duplicate
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setSheetName(activeSheet?.name || '')
              setShowRename(true)
            }}
          >
            <Pencil size={14} /> Rename
          </button>
          {sheets.length > 1 && (
            <button
              className="btn btn-sm btn-danger"
              onClick={handleDeleteSheet}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          {activeSheet && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => exportToCSV(activeSheet)}
            >
              <Download size={14} /> Export CSV
            </button>
          )}
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleExport}
          >
            <Save size={14} /> Export Data
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleImport}
          >
            <FolderOpen size={14} /> Import Data
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {activeSheet && <BudgetSummary sheet={activeSheet} />}

      {/* Search bar */}
      <div className="toolbar">
        <div className="search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input search-has-icon"
          />
        </div>
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
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Sheet"
          message="Delete this sheet? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => {
            if (activeSheetId) deleteSheet(activeSheetId)
            setShowDeleteConfirm(false)
            toast.success('Sheet deleted.')
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {pendingImport && (
        <ConfirmDialog
          title="Import Sheets"
          message={`Import ${pendingImport.length} sheet${pendingImport.length > 1 ? 's' : ''}? They will be added alongside your existing sheets.`}
          confirmLabel="Import"
          variant="primary"
          onConfirm={() => {
            importSheets(pendingImport)
            toast.success(`${pendingImport.length} sheet(s) imported.`)
            setPendingImport(null)
          }}
          onCancel={() => setPendingImport(null)}
        />
      )}
    </div>
  )
}

export default BudgetDashboard
