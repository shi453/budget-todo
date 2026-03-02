import React from 'react'
import { useTodoStore } from '../../store/todoStore'

const TodoFilter: React.FC = () => {
  const {
    groups,
    filterGroup,
    filterStatus,
    searchQuery,
    setFilterGroup,
    setFilterStatus,
    setSearchQuery,
    items,
  } = useTodoStore()

  const activeCount = items.filter((i) => !i.completed).length
  const completedCount = items.filter((i) => i.completed).length

  return (
    <div className="todo-filters">
      <input
        type="text"
        placeholder="🔍 Search tasks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />

      <div className="filter-row">
        <div className="filter-group">
          <label>Group:</label>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({items.length})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              Active ({activeCount})
            </button>
            <button
              className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('completed')}
            >
              Done ({completedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TodoFilter
