import { useEffect, useRef } from 'react'
import { useTodoStore } from '../store/todoStore'

// Request notification permission
export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return Promise.resolve('denied' as NotificationPermission)
  }
  return Notification.requestPermission()
}

// Show a browser notification
function showNotification(title: string, body: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const n = new Notification(title, {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>',
      tag: body, // prevent duplicate notifications for same task
      requireInteraction: true,
    })
    // Auto-close after 30 seconds
    setTimeout(() => n.close(), 30000)
  } catch {
    // Service worker may be needed on some platforms - fallback ignored
  }
}

// Play a short alarm beep using Web Audio API
function playAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gain.gain.value = 0.3

    oscillator.start()

    // Two short beeps
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.45)

    oscillator.stop(ctx.currentTime + 0.5)
  } catch {
    // Audio not available - silently ignore
  }
}

// Hook: checks every 30s if any task is due and fires notification + alarm
export function useTaskReminders() {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const check = () => {
      const { items, groupReminders } = useTodoStore.getState()
      const now = new Date()

      items.forEach((item) => {
        // Skip if: completed, no date/time, already notified, or group reminders off
        if (item.completed) return
        if (!item.date || !item.time) return
        if (notifiedRef.current.has(item.id)) return
        if (!groupReminders[item.group]) return

        const [hours, minutes] = item.time.split(':')
        const taskTime = new Date(item.date + 'T00:00:00')
        taskTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        // Trigger if task is due within the next 60 seconds or just passed (within 2 min)
        const diffMs = taskTime.getTime() - now.getTime()
        if (diffMs <= 60000 && diffMs > -120000) {
          notifiedRef.current.add(item.id)
          showNotification(
            `⏰ Reminder: ${item.group}`,
            `${item.title} is due now!`
          )
          playAlarm()
        }
      })
    }

    // Check immediately and then every 30 seconds
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])
}
