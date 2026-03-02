import React, { useState } from 'react'
import { useThemeStore } from '../../store/themeStore'
import RingtoneSettings from './RingtoneSettings'

interface NavbarProps {
  activeTab: 'budget' | 'todo'
  onTabChange: (tab: 'budget' | 'todo') => void
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { theme, toggleTheme } = useThemeStore()
  const [showRingtone, setShowRingtone] = useState(false)

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
        <button
          className="btn-icon navbar-settings-btn"
          onClick={() => setShowRingtone(true)}
          title="Notification sound settings"
        >
          🔊
        </button>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}{' '}
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
      {showRingtone && <RingtoneSettings onClose={() => setShowRingtone(false)} />}
    </nav>
  )
}

export default Navbar
