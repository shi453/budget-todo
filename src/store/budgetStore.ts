import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BudgetRow, BudgetSheet, HighlightColor } from '../types/budget'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function createDefaultSheet(): BudgetSheet {
  return {
    id: generateId(),
    name: 'Budget Sheet 1',
    rows: [
      {
        id: generateId(),
        expenseDetails: '',
        budgetPlanned: 0,
        whatIf: 0,
        highlightColor: 'none',
      },
    ],
    createdAt: new Date().toISOString(),
  }
}

interface BudgetStore {
  sheets: BudgetSheet[]
  activeSheetId: string

  // Sheet actions
  addSheet: (name: string) => void
  deleteSheet: (id: string) => void
  duplicateSheet: (id: string, newName: string) => void
  renameSheet: (id: string, name: string) => void
  setActiveSheet: (id: string) => void

  // Row actions
  addRow: () => void
  deleteRow: (rowId: string) => void
  updateRow: (rowId: string, updates: Partial<BudgetRow>) => void
  setRowHighlight: (rowId: string, color: HighlightColor) => void
  toggleRowExcluded: (rowId: string) => void
  moveRow: (fromIndex: number, toIndex: number) => void
  importSheets: (newSheets: BudgetSheet[]) => void
}

const defaultSheet = createDefaultSheet()

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      sheets: [defaultSheet],
      activeSheetId: defaultSheet.id,

      addSheet: (name: string) => {
        const newSheet: BudgetSheet = {
          id: generateId(),
          name,
          rows: [
            {
              id: generateId(),
              expenseDetails: '',
              budgetPlanned: 0,
              whatIf: 0,
              highlightColor: 'none',
            },
          ],
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          sheets: [...state.sheets, newSheet],
          activeSheetId: newSheet.id,
        }))
      },

      deleteSheet: (id: string) => {
        const { sheets, activeSheetId } = get()
        if (sheets.length <= 1) return
        const filtered = sheets.filter((s) => s.id !== id)
        set({
          sheets: filtered,
          activeSheetId:
            activeSheetId === id ? filtered[0].id : activeSheetId,
        })
      },

      duplicateSheet: (id: string, newName: string) => {
        const { sheets } = get()
        const source = sheets.find((s) => s.id === id)
        if (!source) return
        const newSheet: BudgetSheet = {
          id: generateId(),
          name: newName,
          rows: source.rows.map((r) => ({ ...r, id: generateId() })),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          sheets: [...state.sheets, newSheet],
          activeSheetId: newSheet.id,
        }))
      },

      renameSheet: (id: string, name: string) => {
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === id ? { ...s, name } : s
          ),
        }))
      },

      setActiveSheet: (id: string) => set({ activeSheetId: id }),

      addRow: () => {
        const { activeSheetId } = get()
        const newRow: BudgetRow = {
          id: generateId(),
          expenseDetails: '',
          budgetPlanned: 0,
          whatIf: 0,
          highlightColor: 'none',
        }
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === activeSheetId
              ? { ...s, rows: [...s.rows, newRow] }
              : s
          ),
        }))
      },

      deleteRow: (rowId: string) => {
        const { activeSheetId } = get()
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === activeSheetId
              ? { ...s, rows: s.rows.filter((r) => r.id !== rowId) }
              : s
          ),
        }))
      },

      updateRow: (rowId: string, updates: Partial<BudgetRow>) => {
        const { activeSheetId } = get()
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === activeSheetId
              ? {
                  ...s,
                  rows: s.rows.map((r) =>
                    r.id === rowId ? { ...r, ...updates } : r
                  ),
                }
              : s
          ),
        }))
      },

      setRowHighlight: (rowId: string, color: HighlightColor) => {
        const { activeSheetId } = get()
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === activeSheetId
              ? {
                  ...s,
                  rows: s.rows.map((r) =>
                    r.id === rowId ? { ...r, highlightColor: color } : r
                  ),
                }
              : s
          ),
        }))
      },

      toggleRowExcluded: (rowId: string) => {
        const { activeSheetId } = get()
        set((state) => ({
          sheets: state.sheets.map((s) =>
            s.id === activeSheetId
              ? {
                  ...s,
                  rows: s.rows.map((r) =>
                    r.id === rowId ? { ...r, excluded: !r.excluded } : r
                  ),
                }
              : s
          ),
        }))
      },

      moveRow: (fromIndex: number, toIndex: number) => {
        const { activeSheetId } = get()
        set((state) => ({
          sheets: state.sheets.map((s) => {
            if (s.id !== activeSheetId) return s
            const rows = [...s.rows]
            const [moved] = rows.splice(fromIndex, 1)
            rows.splice(toIndex, 0, moved)
            return { ...s, rows }
          }),
        }))
      },

      importSheets: (newSheets: BudgetSheet[]) => {
        if (newSheets.length === 0) return
        set((state) => ({
          sheets: [...state.sheets, ...newSheets],
          activeSheetId: newSheets[0].id,
        }))
      },
    }),
    { name: 'budget-storage' }
  )
)
