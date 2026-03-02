import React, { useState } from 'react'
import type { TodoItem as TodoItemType } from '../../types/todo'
import TodoItem from './TodoItem'
import { useTodoStore } from '../../store/todoStore'
import { formatDate, formatTime, isToday } from '../../utils/dateHelpers'
import { requestNotificationPermission } from '../../hooks/useNotifications'
import { toast } from '../../store/toastStore'
import ConfirmDialog from '../common/ConfirmDialog'
import {
  ChevronRight, ChevronDown, FolderOpen,
  Bell, BellOff, Pin, ArrowRight, AlertTriangle,
  Calendar, Clock, AlarmClock, CheckCircle,
  Moon as MoonSnooze, Trash2
} from 'lucide-react'

interface TodoListProps {
  group: string
  items: TodoItemType[]
  onEdit: (id: string) => void
}

function getDateLabel(dateStr: string): React.ReactNode {
  if (!dateStr) return <><Calendar size={12} /> No Date</>
  if (isToday(dateStr)) return <><Pin size={12} /> Today — {formatDate(dateStr)}</>
  const taskDate = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (taskDate.getTime() === tomorrow.getTime()) return <><ArrowRight size={12} /> Tomorrow — {formatDate(dateStr)}</>
  if (taskDate < today) return <><AlertTriangle size={12} /> Overdue — {formatDate(dateStr)}</>
  return <><Calendar size={12} /> {formatDate(dateStr)}</>
}

const SNOOZE_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hr', minutes: 120 },
  { label: '3 hr', minutes: 180 },
  { label: '4 hr', minutes: 240 },
  { label: '5 hr', minutes: 300 },
]

const TodoList: React.FC<TodoListProps> = ({ group, items, onEdit }) => {
  const { deleteGroup, groupReminders, setGroupReminder, snoozeGroupReminder, dismissGroupReminder } = useTodoStore()
  const reminder = groupReminders[group] || { enabled: false, date: '', time: '09:00' }
  const [showReminderSettings, setShowReminderSettings] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Determine if reminder has fired (time has passed, not snoozed, not dismissed)
  const isReminderFired = (() => {
    if (!reminder.enabled || !reminder.date || !reminder.time || reminder.dismissed) return false
    const target = new Date(`${reminder.date}T${reminder.time}:00`)
    if (isNaN(target.getTime())) return false
    const now = new Date()

    if (reminder.snoozedUntil) {
      const snoozeEnd = new Date(reminder.snoozedUntil)
      return now >= snoozeEnd
    }
    return now >= target
  })()

  const handleToggleReminder = async () => {
    if (!reminder.enabled) {
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        toast.warning('Please allow notifications in your browser settings to enable reminders.')
        return
      }
    }
    setGroupReminder(group, {
      enabled: !reminder.enabled,
      dismissed: false,
      snoozedUntil: undefined,
    })
  }

  const handleDateChange = (date: string) => {
    setGroupReminder(group, { date })
  }

  const handleTimeChange = (time: string) => {
    setGroupReminder(group, { time })
  }

  const handleSnooze = (minutes: number) => {
    snoozeGroupReminder(group, minutes)
  }

  const handleDismiss = () => {
    dismissGroupReminder(group)
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
        <button
          className="btn-icon group-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand group' : 'Collapse group'}
          aria-label={collapsed ? 'Expand group' : 'Collapse group'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <h3 className="todo-group-name"><FolderOpen size={16} /> {group}</h3>
        <span className="todo-group-count">
          {items.length} task{items.length !== 1 ? 's' : ''}
        </span>
        <button
          className={`btn-icon reminder-toggle ${reminder.enabled ? 'reminder-on' : ''}`}
          onClick={() => setShowReminderSettings(!showReminderSettings)}
          title={reminder.enabled ? `Reminder set for ${reminder.date || 'no date'} at ${reminder.time} — click to configure` : 'Set reminder'}
          aria-label="Toggle reminder settings"
        >
          {reminder.enabled ? <Bell size={16} /> : <BellOff size={16} />}
        </button>
        {group !== 'General' && (
          <button
            className="btn-icon danger btn-sm"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete group"
            aria-label="Delete group"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Group"
          message={`Delete group "${group}"? Tasks will move to General.`}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteGroup(group)
            setShowDeleteConfirm(false)
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Group Reminder Settings Panel */}
      {!collapsed && showReminderSettings && (
        <div className="reminder-panel">
          <div className="reminder-panel-row">
            <label className="reminder-switch-label">
              <span>Reminder</span>
              <button
                className={`reminder-switch ${reminder.enabled ? 'on' : ''}`}
                onClick={handleToggleReminder}
              >
                <span className="reminder-switch-thumb" />
              </button>
            </label>
          </div>
          {reminder.enabled && (
            <>
              <div className="reminder-panel-row">
                <label className="reminder-time-label">
                  <span><Calendar size={14} /> Date:</span>
                  <input
                    type="date"
                    value={reminder.date || ''}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="reminder-date-input"
                  />
                </label>
              </div>
              <div className="reminder-panel-row">
                <label className="reminder-time-label">
                  <span><AlarmClock size={14} /> Time:</span>
                  <input
                    type="time"
                    value={reminder.time}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="reminder-time-input"
                  />
                </label>
              </div>
              {reminder.date && reminder.time && (
                <div className="reminder-panel-row">
                  <span className="reminder-hint">
                    {reminder.dismissed
                      ? <><CheckCircle size={12} /> Reminder was dismissed.</>
                      : reminder.snoozedUntil && new Date(reminder.snoozedUntil) > new Date()
                        ? <><MoonSnooze size={12} /> Snoozed until {new Date(reminder.snoozedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                        : `Notification will fire on ${formatDate(reminder.date)} at ${formatTime(reminder.time)} for all pending tasks in "${group}".`}
                  </span>
                </div>
              )}
              {/* Snooze & Dismiss controls — visible when reminder has fired */}
              {isReminderFired && !reminder.dismissed && (
                <div className="reminder-panel-row snooze-row">
                  <span className="snooze-label"><Bell size={14} /> Reminder fired!</span>
                  <div className="snooze-buttons">
                    {SNOOZE_OPTIONS.map((opt) => (
                      <button
                        key={opt.minutes}
                        className="btn btn-sm snooze-btn"
                        onClick={() => handleSnooze(opt.minutes)}
                      >
                        <MoonSnooze size={12} /> {opt.label}
                      </button>
                    ))}
                    <button
                      className="btn btn-sm dismiss-btn"
                      onClick={handleDismiss}
                    >
                      <CheckCircle size={12} /> Dismiss
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!collapsed && sortedDateKeys.map((dateKey) => (
        <div key={dateKey} className="todo-date-group">
          <div className="todo-date-header">
            {dateKey === '__no_date__' ? <><Calendar size={12} /> No Date</> : getDateLabel(dateKey)}
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
