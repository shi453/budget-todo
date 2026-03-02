import { useState, useEffect } from 'react'
import { useThemeStore } from './store/themeStore'
import Navbar from './components/common/Navbar'
import BudgetDashboard from './components/budget/BudgetDashboard'
import TodoDashboard from './components/todo/TodoDashboard'

type Tab = 'budget' | 'todo'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('budget')
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="app">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container">
        {activeTab === 'budget' ? <BudgetDashboard /> : <TodoDashboard />}
      </main>
    </div>
  )
}

export default App
