import React, { useState, useRef, useEffect } from 'react'
import type { TodoItem as TodoItemType } from '../../types/todo'
import { useTodoStore } from '../../store/todoStore'
import { formatDate, formatTime, isOverdue } from '../../utils/dateHelpers'
import { Calendar, Clock, StickyNote, Pencil, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react'

interface TodoItemProps {
  item: TodoItemType
  onEdit: (id: string) => void
}

const TodoItem: React.FC<TodoItemProps> = ({ item, onEdit }) => {
  const { toggleComplete, deleteItem, updateItem } = useTodoStore()
  const overdue = !item.completed && isOverdue(item.date, item.time)
  const [showNotes, setShowNotes] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [draftNotes, setDraftNotes] = useState(item.notes || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editingNotes && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editingNotes])

  const handleSaveNotes = () => {
    updateItem(item.id, { notes: draftNotes.trim() })
    setEditingNotes(false)
  }

  const handleCancelEdit = () => {
    setDraftNotes(item.notes || '')
    setEditingNotes(false)
  }

  const handleNotesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleCancelEdit()
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveNotes()
  }

  const hasNotes = !!(item.notes && item.notes.trim())

  return (
    <div
      className={`todo-item ${item.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${showNotes ? 'notes-open' : ''}`}
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
              <Calendar size={12} /> {formatDate(item.date)}
            </span>
          )}
          {item.time && (
            <span className="todo-time"><Clock size={12} /> {formatTime(item.time)}</span>
          )}
          <span className={`badge badge-${item.priority}`}>
            {item.priority}
          </span>
          <button
            className={`btn-icon notes-toggle ${hasNotes ? 'has-notes' : ''} ${showNotes ? 'active' : ''}`}
            onClick={() => {
              setShowNotes(!showNotes)
              if (!showNotes && !hasNotes) {
                setEditingNotes(true)
                setDraftNotes('')
              }
            }}
            title={hasNotes ? (showNotes ? 'Hide notes' : 'Show notes') : 'Add notes'}
            aria-label={hasNotes ? (showNotes ? 'Hide notes' : 'Show notes') : 'Add notes'}
          >
            <StickyNote size={13} />
            {showNotes ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        </div>

        {showNotes && (
          <div className="todo-notes-panel">
            {editingNotes ? (
              <div className="notes-editor">
                <textarea
                  ref={textareaRef}
                  value={draftNotes}
                  onChange={(e) => {
                    setDraftNotes(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  onKeyDown={handleNotesKeyDown}
                  placeholder="Write notes here... (Ctrl+Enter to save)"
                  className="notes-inline-textarea"
                  rows={2}
                />
                <div className="notes-editor-actions">
                  <button className="btn btn-sm btn-primary" onClick={handleSaveNotes}>
                    <Save size={12} /> Save
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={handleCancelEdit}>
                    <X size={12} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="notes-display"
                onClick={() => {
                  setDraftNotes(item.notes || '')
                  setEditingNotes(true)
                }}
                title="Click to edit notes"
              >
                {hasNotes ? (
                  <span className="notes-text">{item.notes}</span>
                ) : (
                  <span className="notes-placeholder">Click to add notes...</span>
                )}
                <Pencil size={12} className="notes-edit-hint" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="todo-actions">
        <button
          className="btn-icon"
          onClick={() => onEdit(item.id)}
          title="Edit"
          aria-label="Edit task"
        >
          <Pencil size={14} />
        </button>
        <button
          className="btn-icon danger"
          onClick={() => deleteItem(item.id)}
          title="Delete"
          aria-label="Delete task"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default TodoItem
