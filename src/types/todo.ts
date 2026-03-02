export type Priority = 'high' | 'medium' | 'low'
export type FilterStatus = 'all' | 'active' | 'completed'

export interface TodoItem {
  id: string
  title: string
  group: string
  date: string
  time: string
  completed: boolean
  priority: Priority
  createdAt: string
}
