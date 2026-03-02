import React from 'react'
import { useThemeStore } from '../../store/themeStore'

interface NavbarProps {
  activeTab: 'budget' | 'todo'
  onTabChange: (tab: 'budget' | 'todo') => void
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <nav className="navbar">
      <div className="navbar-brand">💰 Budget & Todo</div>
      <div className="navbar-tabs">
        <button
          className={`navbar-tab ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => onTabChange('budget')}
        >
          📊 Budget
        </button>
        <button
          className={`navbar-tab ${activeTab === 'todo' ? 'active' : ''}`}
          onClick={() => onTabChange('todo')}
        >
          ✅ Todo
        </button>
      </div>
      <div className="navbar-actions">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}{' '}
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
    </nav>
  )
}

export default Navbar
