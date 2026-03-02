import React from 'react'
import type { TodoItem as TodoItemType } from '../../types/todo'
import TodoItem from './TodoItem'
import { useTodoStore } from '../../store/todoStore'

interface TodoListProps {
  group: string
  items: TodoItemType[]
  onEdit: (id: string) => void
}

const TodoList: React.FC<TodoListProps> = ({ group, items, onEdit }) => {
  const { deleteGroup } = useTodoStore()

  return (
    <div className="todo-group">
      <div className="todo-group-header">
        <h3 className="todo-group-name">📁 {group}</h3>
        <span className="todo-group-count">
          {items.length} task{items.length !== 1 ? 's' : ''}
        </span>
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
      <div className="todo-items">
        {items.map((item) => (
          <TodoItem key={item.id} item={item} onEdit={onEdit} />
        ))}
      </div>
    </div>
  )
}

export default TodoList
