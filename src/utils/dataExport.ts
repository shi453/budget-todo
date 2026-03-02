/**
 * Export/Import utility for full app data (Budget + Todo).
 * Exports a JSON file that can be imported on another device.
 */

import type { BudgetSheet } from '../types/budget'
import type { TodoItem } from '../types/todo'
import type { GroupReminder } from '../store/todoStore'

// ---- Types ----

interface BudgetExportData {
  version: 1
  type: 'budget'
  exportedAt: string
  sheets: BudgetSheet[]
  activeSheetId: string
}

interface TodoExportData {
  version: 1
  type: 'todo'
  exportedAt: string
  items: TodoItem[]
  groups: string[]
  groupReminders: Record<string, GroupReminder>
}

interface FullExportData {
  version: 1
  type: 'full'
  exportedAt: string
  budget: {
    sheets: BudgetSheet[]
    activeSheetId: string
  }
  todo: {
    items: TodoItem[]
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

// ---- Budget Export/Import ----

export function exportBudgetData(sheets: BudgetSheet[], activeSheetId: string) {
  const data: BudgetExportData = {
    version: 1,
    type: 'budget',
    exportedAt: new Date().toISOString(),
    sheets,
    activeSheetId,
  }
  const date = new Date().toISOString().split('T')[0]
  downloadJson(data, `budget-backup-${date}.json`)
}

export async function importBudgetData(): Promise<{
  sheets: BudgetSheet[]
  activeSheetId: string
} | null> {
  try {
    const data = await readJsonFile()
    // Accept either a budget-only export or the budget part of a full export
    if (data.type === 'budget' && Array.isArray(data.sheets)) {
      return { sheets: data.sheets, activeSheetId: data.activeSheetId }
    }
    if (data.type === 'full' && data.budget && Array.isArray(data.budget.sheets)) {
      return { sheets: data.budget.sheets, activeSheetId: data.budget.activeSheetId }
    }
    alert('This file does not contain budget data. Please select a valid budget or full backup file.')
    return null
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
    items,
    groups,
    groupReminders,
  }
  const date = new Date().toISOString().split('T')[0]
  downloadJson(data, `todo-backup-${date}.json`)
}

export async function importTodoData(): Promise<{
  items: TodoItem[]
  groups: string[]
  groupReminders: Record<string, GroupReminder>
} | null> {
  try {
    const data = await readJsonFile()
    if (data.type === 'todo' && Array.isArray(data.items)) {
      return {
        items: data.items,
        groups: data.groups || ['General'],
        groupReminders: data.groupReminders || {},
      }
    }
    if (data.type === 'full' && data.todo && Array.isArray(data.todo.items)) {
      return {
        items: data.todo.items,
        groups: data.todo.groups || ['General'],
        groupReminders: data.todo.groupReminders || {},
      }
    }
    alert('This file does not contain todo data. Please select a valid todo or full backup file.')
    return null
  } catch (err: any) {
    alert(err.message || 'Import failed')
    return null
  }
}

// ---- Full Export (both budget + todo) ----

export function exportFullData(
  budgetSheets: BudgetSheet[],
  activeSheetId: string,
  todoItems: TodoItem[],
  todoGroups: string[],
  groupReminders: Record<string, GroupReminder>
) {
  const data: FullExportData = {
    version: 1,
    type: 'full',
    exportedAt: new Date().toISOString(),
    budget: { sheets: budgetSheets, activeSheetId },
    todo: { items: todoItems, groups: todoGroups, groupReminders },
  }
  const date = new Date().toISOString().split('T')[0]
  downloadJson(data, `app-full-backup-${date}.json`)
}
