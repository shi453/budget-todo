import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TodoItem, Priority, FilterStatus } from '../types/todo'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

interface TodoStore {
  items: TodoItem[]
  groups: string[]
  filterGroup: string
  filterStatus: FilterStatus
  searchQuery: string

  addItem: (item: Omit<TodoItem, 'id' | 'createdAt'>) => void
  deleteItem: (id: string) => void
  updateItem: (id: string, updates: Partial<TodoItem>) => void
  toggleComplete: (id: string) => void
  addGroup: (name: string) => void
  deleteGroup: (name: string) => void
  setFilterGroup: (group: string) => void
  setFilterStatus: (status: FilterStatus) => void
  setSearchQuery: (query: string) => void
}

export const useTodoStore = create<TodoStore>()(
  persist(
    (set) => ({
      items: [],
      groups: ['General'],
      filterGroup: 'all',
      filterStatus: 'all' as FilterStatus,
      searchQuery: '',

      addItem: (item) => {
        const newItem: TodoItem = {
          ...item,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ items: [...state.items, newItem] }))
      },

      deleteItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        }))
      },

      toggleComplete: (id) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, completed: !i.completed } : i
          ),
        }))
      },

      addGroup: (name) => {
        set((state) => ({
          groups: state.groups.includes(name)
            ? state.groups
            : [...state.groups, name],
        }))
      },

      deleteGroup: (name) => {
        if (name === 'General') return
        set((state) => ({
          groups: state.groups.filter((g) => g !== name),
          items: state.items.map((i) =>
            i.group === name ? { ...i, group: 'General' } : i
          ),
        }))
      },

      setFilterGroup: (group) => set({ filterGroup: group }),
      setFilterStatus: (status) => set({ filterStatus: status }),
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    { name: 'todo-storage' }
  )
)
