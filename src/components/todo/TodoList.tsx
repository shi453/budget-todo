import React from 'react'
import type { TodoItem as TodoItemType } from '../../types/todo'
import TodoItem from './TodoItem'
import { useTodoStore } from '../../store/todoStore'
import { formatDate, isToday } from '../../utils/dateHelpers'
import { requestNotificationPermission } from '../../hooks/useNotifications'

interface TodoListProps {
  group: string
  items: TodoItemType[]
  onEdit: (id: string) => void
}

function getDateLabel(dateStr: string): string {
  if (!dateStr) return 'No Date'
  if (isToday(dateStr)) return `📌 Today — ${formatDate(dateStr)}`
  const taskDate = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (taskDate.getTime() === tomorrow.getTime()) return `🔜 Tomorrow — ${formatDate(dateStr)}`
  if (taskDate < today) return `⚠️ Overdue — ${formatDate(dateStr)}`
  return `📅 ${formatDate(dateStr)}`
}

const TodoList: React.FC<TodoListProps> = ({ group, items, onEdit }) => {
  const { deleteGroup, groupReminders, toggleGroupReminder } = useTodoStore()
  const reminderOn = !!groupReminders[group]

  const handleToggleReminder = async () => {
    if (!reminderOn) {
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        alert('Please allow notifications in your browser settings to enable reminders.')
        return
      }
    }
    toggleGroupReminder(group)
  }

  // Sub-group items by date
  const dateGroups: Record<string, TodoItemType[]> = {}
  items.forEach((item) => {
    const key = item.date || '__no_date__'
    if (!dateGroups[key]) dateGroups[key] = []
    dateGroups[key].push(item)
  })

  // Sort date keys: overdue first, then today, then future, then no-date
  const sortedDateKeys = Object.keys(dateGroups).sort((a, b) => {
    if (a === '__no_date__') return 1
    if (b === '__no_date__') return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  return (
    <div className="todo-group">
      <div className="todo-group-header">
        <h3 className="todo-group-name">📁 {group}</h3>
        <span className="todo-group-count">
          {items.length} task{items.length !== 1 ? 's' : ''}
        </span>
        <button
          className={`btn-icon reminder-toggle ${reminderOn ? 'reminder-on' : ''}`}
          onClick={handleToggleReminder}
          title={reminderOn ? 'Reminders ON — click to disable' : 'Enable reminders for this group'}
        >
          {reminderOn ? '🔔' : '🔕'}
        </button>
        {group !== 'General' && (
          <button
            className="btn-icon danger btn-sm"
            onClick={() => {
              if (
                confirm(
                  `Delete group "${group}"? Tasks will move to General.`
                )
              )
                deleteGroup(group)
            }}
            title="Delete group"
          >
            ✕
          </button>
        )}
      </div>

      {sortedDateKeys.map((dateKey) => (
        <div key={dateKey} className="todo-date-group">
          <div className="todo-date-header">
            {dateKey === '__no_date__' ? '📋 No Date' : getDateLabel(dateKey)}
          </div>
          <div className="todo-items">
            {dateGroups[dateKey].map((item) => (
              <TodoItem key={item.id} item={item} onEdit={onEdit} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default TodoList
