import React, { useState } from 'react'
import type { TodoItem as TodoItemType } from '../../types/todo'
import TodoItem from './TodoItem'
import { useTodoStore } from '../../store/todoStore'
import { formatDate, formatTime, isToday } from '../../utils/dateHelpers'
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
  const { deleteGroup, groupReminders, setGroupReminder } = useTodoStore()
  const reminder = groupReminders[group] || { enabled: false, time: '09:00' }
  const [showReminderSettings, setShowReminderSettings] = useState(false)

  const handleToggleReminder = async () => {
    if (!reminder.enabled) {
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        alert('Please allow notifications in your browser settings to enable reminders.')
        return
      }
    }
    setGroupReminder(group, { enabled: !reminder.enabled })
  }

  const handleTimeChange = (time: string) => {
    setGroupReminder(group, { time })
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
          className={`btn-icon reminder-toggle ${reminder.enabled ? 'reminder-on' : ''}`}
          onClick={() => setShowReminderSettings(!showReminderSettings)}
          title={reminder.enabled ? `Reminder at ${formatTime(reminder.time)} — click to configure` : 'Set up daily reminder'}
        >
          {reminder.enabled ? '🔔' : '🔕'}
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

      {/* Group Reminder Settings Panel */}
      {showReminderSettings && (
        <div className="reminder-panel">
          <div className="reminder-panel-row">
            <label className="reminder-switch-label">
              <span>Daily reminder</span>
              <button
                className={`reminder-switch ${reminder.enabled ? 'on' : ''}`}
                onClick={handleToggleReminder}
              >
                <span className="reminder-switch-thumb" />
              </button>
            </label>
          </div>
          {reminder.enabled && (
            <div className="reminder-panel-row">
              <label className="reminder-time-label">
                <span>⏰ Notify at:</span>
                <input
                  type="time"
                  value={reminder.time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="reminder-time-input"
                />
              </label>
              <span className="reminder-hint">
                You'll get a notification with all pending tasks in "{group}" at this time daily.
              </span>
            </div>
          )}
        </div>
      )}

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
