import React, { useState, useEffect } from 'react'
import { useTodoStore } from '../../store/todoStore'
import type { TodoItem, Priority } from '../../types/todo'

interface TodoFormProps {
  editItem: TodoItem | null
  onClose: () => void
}

const TodoForm: React.FC<TodoFormProps> = ({ editItem, onClose }) => {
  const { addItem, updateItem, groups, addGroup } = useTodoStore()

  const [title, setTitle] = useState('')
  const [group, setGroup] = useState('General')
  const [newGroup, setNewGroup] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [notes, setNotes] = useState('')
  const [showNewGroup, setShowNewGroup] = useState(false)

  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title)
      setGroup(editItem.group)
      setDate(editItem.date)
      setTime(editItem.time)
      setPriority(editItem.priority)
      setNotes(editItem.notes || '')
    }
  }, [editItem])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    if (editItem) {
      updateItem(editItem.id, {
        title: title.trim(),
        group,
        date,
        time,
        priority,
        notes: notes.trim(),
      })
    } else {
      addItem({
        title: title.trim(),
        group,
        date,
        time,
        priority,
        notes: notes.trim(),
        completed: false,
      })
    }
    onClose()
  }

  const handleAddGroup = () => {
    if (newGroup.trim()) {
      addGroup(newGroup.trim())
      setGroup(newGroup.trim())
      setNewGroup('')
      setShowNewGroup(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal todo-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{editItem ? 'Edit Task' : 'New Task'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Group</label>
              <div className="group-selector">
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  {groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowNewGroup(!showNewGroup)}
                >
                  +
                </button>
              </div>
              {showNewGroup && (
                <div className="new-group-input">
                  <input
                    type="text"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    placeholder="New group name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddGroup()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleAddGroup}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="high">● High</option>
                <option value="medium">● Medium</option>
                <option value="low">● Low</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes or details..."
              rows={3}
              className="notes-textarea"
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editItem ? 'Update' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TodoForm
