import React, { useState } from 'react'
import { useThemeStore } from '../../store/themeStore'
import RingtoneSettings from './RingtoneSettings'
import { Volume2, Moon, Sun, BarChart3, CheckSquare, Wallet } from 'lucide-react'

interface NavbarProps {
  activeTab: 'budget' | 'todo'
  onTabChange: (tab: 'budget' | 'todo') => void
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { theme, toggleTheme } = useThemeStore()
  const [showRingtone, setShowRingtone] = useState(false)

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Wallet size={20} />
        Budget &amp; Todo
      </div>
      <div className="navbar-tabs">
        <button
          className={`navbar-tab ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => onTabChange('budget')}
        >
          <BarChart3 size={16} />
          Budget
        </button>
        <button
          className={`navbar-tab ${activeTab === 'todo' ? 'active' : ''}`}
          onClick={() => onTabChange('todo')}
        >
          <CheckSquare size={16} />
          Todo
        </button>
      </div>
      <div className="navbar-actions">
        <button
          className="btn-icon navbar-settings-btn"
          onClick={() => setShowRingtone(true)}
          title="Notification sound settings"
          aria-label="Notification sound settings"
        >
          <Volume2 size={16} />
        </button>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
      {showRingtone && <RingtoneSettings onClose={() => setShowRingtone(false)} />}
    </nav>
  )
}

export default Navbar
