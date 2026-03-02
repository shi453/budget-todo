/**
 * Export/Import utility for full app data (Budget + Todo).
 * 
 * KEY DESIGN:
 * - Export strips IDs — only raw data is saved.
 * - Import generates fresh IDs and ADDS data alongside existing data
 *   (budget → new sheets, todo → new tasks merged into groups).
 */

import type { BudgetSheet, BudgetRow, HighlightColor } from '../types/budget'
import type { TodoItem, Priority } from '../types/todo'
import type { GroupReminder } from '../store/todoStore'

// ---- ID helper ----

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// ---- Stripped types for export (no IDs) ----

interface ExportedRow {
  expenseDetails: string
  budgetPlanned: number
  whatIf: number
  highlightColor: HighlightColor
  excluded?: boolean
}

interface ExportedSheet {
  name: string
  rows: ExportedRow[]
  createdAt: string
}

interface ExportedTodoItem {
  title: string
  group: string
  date: string
  time: string
  completed: boolean
  priority: Priority
  notes?: string
  createdAt: string
}

// ---- Export envelopes ----

interface BudgetExportData {
  version: 1
  type: 'budget'
  exportedAt: string
  sheets: ExportedSheet[]
}

interface TodoExportData {
  version: 1
  type: 'todo'
  exportedAt: string
  items: ExportedTodoItem[]
  groups: string[]
  groupReminders: Record<string, GroupReminder>
}

interface FullExportData {
  version: 1
  type: 'full'
  exportedAt: string
  budget: { sheets: ExportedSheet[] }
  todo: {
    items: ExportedTodoItem[]
    groups: string[]
    groupReminders: Record<string, GroupReminder>
  }
}

type ExportData = BudgetExportData | TodoExportData | FullExportData

// ---- Helpers ----

function downloadJson(data: ExportData, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function readJsonFile(): Promise<any> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return reject(new Error('No file selected'))
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string)
          resolve(data)
        } catch {
          reject(new Error('Invalid JSON file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    }
    input.click()
  })
}

// ---- Strip IDs on export ----

function stripSheetIds(sheets: BudgetSheet[]): ExportedSheet[] {
  return sheets.map((s) => ({
    name: s.name,
    createdAt: s.createdAt,
    rows: s.rows.map((r) => ({
      expenseDetails: r.expenseDetails,
      budgetPlanned: r.budgetPlanned,
      whatIf: r.whatIf,
      highlightColor: r.highlightColor,
      ...(r.excluded ? { excluded: true } : {}),
    })),
  }))
}

function stripTodoIds(items: TodoItem[]): ExportedTodoItem[] {
  return items.map((i) => ({
    title: i.title,
    group: i.group,
    date: i.date,
    time: i.time,
    completed: i.completed,
    priority: i.priority,
    notes: i.notes,
    createdAt: i.createdAt,
  }))
}

// ---- Rehydrate with fresh IDs on import ----

function rehydrateSheets(exported: ExportedSheet[]): BudgetSheet[] {
  return exported.map((s) => ({
    id: generateId(),
    name: s.name,
    createdAt: s.createdAt || new Date().toISOString(),
    rows: s.rows.map((r) => ({
      id: generateId(),
      expenseDetails: r.expenseDetails || '',
      budgetPlanned: r.budgetPlanned || 0,
      whatIf: r.whatIf || 0,
      highlightColor: r.highlightColor || 'none',
      excluded: r.excluded || false,
    })) as BudgetRow[],
  }))
}

function rehydrateTodoItems(exported: ExportedTodoItem[]): TodoItem[] {
  return exported.map((i) => ({
    id: generateId(),
    title: i.title || '',
    group: i.group || 'General',
    date: i.date || '',
    time: i.time || '',
    completed: !!i.completed,
    priority: i.priority || 'medium',
    notes: i.notes || '',
    createdAt: i.createdAt || new Date().toISOString(),
  }))
}

// ---- Budget Export/Import ----

export function exportBudgetData(sheets: BudgetSheet[]) {
  const data: BudgetExportData = {
    version: 1,
    type: 'budget',
    exportedAt: new Date().toISOString(),
    sheets: stripSheetIds(sheets),
  }
  const date = new Date().toISOString().split('T')[0]
  downloadJson(data, `budget-backup-${date}.json`)
}

/** Returns new sheets with fresh IDs ready to be ADDED to existing data. */
export async function importBudgetData(): Promise<BudgetSheet[] | null> {
  try {
    const data = await readJsonFile()
    let rawSheets: ExportedSheet[] | null = null

    if (data.type === 'budget' && Array.isArray(data.sheets)) {
      rawSheets = data.sheets
    } else if (data.type === 'full' && data.budget && Array.isArray(data.budget.sheets)) {
      rawSheets = data.budget.sheets
    }

    if (!rawSheets || rawSheets.length === 0) {
      alert('This file does not contain budget data.')
      return null
    }

    return rehydrateSheets(rawSheets)
  } catch (err: any) {
    alert(err.message || 'Import failed')
    return null
  }
}

// ---- Todo Export/Import ----

export function exportTodoData(
  items: TodoItem[],
  groups: string[],
  groupReminders: Record<string, GroupReminder>
) {
  const data: TodoExportData = {
    version: 1,
    type: 'todo',
    exportedAt: new Date().toISOString(),
    items: stripTodoIds(items),
    groups,
    groupReminders,
  }
  const date = new Date().toISOString().split('T')[0]
  downloadJson(data, `todo-backup-${date}.json`)
}

/** Returns new items with fresh IDs + groups ready to be MERGED into existing data. */
export async function importTodoData(): Promise<{
  items: TodoItem[]
  groups: string[]
  groupReminders: Record<string, GroupReminder>
} | null> {
  try {
    const data = await readJsonFile()
    let rawItems: ExportedTodoItem[] | null = null
    let rawGroups: string[] = ['General']
    let rawReminders: Record<string, GroupReminder> = {}

    if (data.type === 'todo' && Array.isArray(data.items)) {
      rawItems = data.items
      rawGroups = data.groups || ['General']
      rawReminders = data.groupReminders || {}
    } else if (data.type === 'full' && data.todo && Array.isArray(data.todo.items)) {
      rawItems = data.todo.items
      rawGroups = data.todo.groups || ['General']
      rawReminders = data.todo.groupReminders || {}
    }

    if (!rawItems || rawItems.length === 0) {
      alert('This file does not contain todo data.')
      return null
    }

    return {
      items: rehydrateTodoItems(rawItems),
      groups: rawGroups,
      groupReminders: rawReminders,
    }
  } catch (err: any) {
    alert(err.message || 'Import failed')
    return null
  }
}

// ---- Full Export (both budget + todo) ----

export function exportFullData(
  budgetSheets: BudgetSheet[],
  todoItems: TodoItem[],
  todoGroups: string[],
  groupReminders: Record<string, GroupReminder>
) {
  const data: FullExportData = {
    version: 1,
    type: 'full',
    exportedAt: new Date().toISOString(),
    budget: { sheets: stripSheetIds(budgetSheets) },
    todo: { items: stripTodoIds(todoItems), groups: todoGroups, groupReminders },
  }
  const date = new Date().toISOString().split('T')[0]
  downloadJson(data, `app-full-backup-${date}.json`)
}
