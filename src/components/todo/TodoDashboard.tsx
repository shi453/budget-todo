import React, { useState } from 'react'
import { useTodoStore } from '../../store/todoStore'
import TodoForm from './TodoForm'
import TodoFilter from './TodoFilter'
import TodoList from './TodoList'
import type { TodoItem } from '../../types/todo'
import { exportTodoData, importTodoData } from '../../utils/dataExport'

const TodoDashboard: React.FC = () => {
  const { items, filterGroup, filterStatus, searchQuery } = useTodoStore()
  const { groups, groupReminders, importData } = useTodoStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Apply filters
  const filteredItems = items.filter((item) => {
    if (filterGroup !== 'all' && item.group !== filterGroup) return false
    if (filterStatus === 'active' && item.completed) return false
    if (filterStatus === 'completed' && !item.completed) return false
    if (
      searchQuery &&
      !item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    return true
  })

  // Group items by group name
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      const group = item.group || 'General'
      if (!acc[group]) acc[group] = []
      acc[group].push(item)
      return acc
    },
    {} as Record<string, TodoItem[]>
  )

  // Sort within each group: incomplete first, then by date
  Object.keys(groupedItems).forEach((group) => {
    groupedItems[group].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const dateA = a.date ? new Date(a.date).getTime() : Infinity
      const dateB = b.date ? new Date(b.date).getTime() : Infinity
      return dateA - dateB
    })
  })

  const editingItem = editingId
    ? items.find((i) => i.id === editingId) || null
    : null

  const handleExport = () => {
    exportTodoData(items, groups, groupReminders)
  }

  const handleImport = async () => {
    const data = await importTodoData()
    if (data) {
      const count = data.items.length
      if (confirm(`Import ${count} task${count > 1 ? 's' : ''}? They will be added alongside your existing tasks.`)) {
        importData(data.items, data.groups, data.groupReminders)
      }
    }
  }

  return (
    <div className="todo-dashboard">
      <div className="todo-header">
        <h2>📝 Todo List</h2>
        <div className="todo-header-actions">
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleExport}
          >
            💾 Export
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleImport}
          >
            📂 Import
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingId(null)
              setShowForm(true)
            }}
          >
            + Add Task
          </button>
        </div>
      </div>

      <TodoFilter />

      {Object.keys(groupedItems).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>No tasks found. Add your first task!</p>
        </div>
      ) : (
        Object.entries(groupedItems).map(([group, groupItems]) => (
          <TodoList
            key={group}
            group={group}
            items={groupItems}
            onEdit={(id) => {
              setEditingId(id)
              setShowForm(true)
            }}
          />
        ))
      )}

      {showForm && (
        <TodoForm
          editItem={editingItem}
          onClose={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

export default TodoDashboard
