import React from 'react'
import { useToastStore } from '../../store/toastStore'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = ICON_MAP[t.type]
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={18} className="toast-icon" />
            <span className="toast-message">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default ToastContainer
