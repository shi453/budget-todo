import React from 'react'
import type { TodoItem as TodoItemType } from '../../types/todo'
import { useTodoStore } from '../../store/todoStore'
import { formatDate, formatTime, isOverdue } from '../../utils/dateHelpers'

interface TodoItemProps {
  item: TodoItemType
  onEdit: (id: string) => void
}

const TodoItem: React.FC<TodoItemProps> = ({ item, onEdit }) => {
  const { toggleComplete, deleteItem } = useTodoStore()
  const overdue = !item.completed && isOverdue(item.date, item.time)

  return (
    <div
      className={`todo-item ${item.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}
    >
      <label className="todo-checkbox">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={() => toggleComplete(item.id)}
        />
        <span className="checkmark"></span>
      </label>

      <div className="todo-content">
        <div className="todo-title">{item.title}</div>
        <div className="todo-meta">
          {item.date && (
            <span className={`todo-date ${overdue ? 'overdue-text' : ''}`}>
              📅 {formatDate(item.date)}
            </span>
          )}
          {item.time && (
            <span className="todo-time">🕐 {formatTime(item.time)}</span>
          )}
          <span className={`badge badge-${item.priority}`}>
            {item.priority}
          </span>
        </div>
      </div>

      <div className="todo-actions">
        <button
          className="btn-icon"
          onClick={() => onEdit(item.id)}
          title="Edit"
        >
          ✏️
        </button>
        <button
          className="btn-icon danger"
          onClick={() => deleteItem(item.id)}
          title="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default TodoItem
