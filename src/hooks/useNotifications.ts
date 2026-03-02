import { useEffect, useRef } from 'react'
import { useTodoStore } from '../store/todoStore'

let swRegistration: ServiceWorkerRegistration | null = null

// Register the service worker (needed for PWA notifications on home screen)
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/budget-todo/sw.js')
    swRegistration = reg
    return reg
  } catch (err) {
    console.warn('Service worker registration failed:', err)
    return null
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return 'denied'
  }
  const permission = await Notification.requestPermission()
  // Ensure SW is registered when permission is granted
  if (permission === 'granted' && !swRegistration) {
    await registerServiceWorker()
  }
  return permission
}

// Show a notification via Service Worker (works in PWA standalone mode)
async function showNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return

  // Try service worker notification first (works in PWA)
  try {
    let reg = swRegistration
    if (!reg) {
      reg = await navigator.serviceWorker?.ready
    }
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: '/budget-todo/icon-192.svg',
        badge: '/budget-todo/icon-192.svg',
        tag: `group-reminder-${title}`,
        requireInteraction: true,
      } as NotificationOptions)
      return
    }
  } catch {
    // fallback below
  }

  // Fallback: direct Notification (works in regular browser tabs)
  try {
    const n = new Notification(title, {
      body,
      tag: `group-reminder-${title}`,
      requireInteraction: true,
    })
    setTimeout(() => n.close(), 30000)
  } catch {
    // Notifications not available
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

    // Three short beeps
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.45)
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.6)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.75)

    oscillator.stop(ctx.currentTime + 0.8)
  } catch {
    // Audio not available
  }
}

/**
 * Hook: checks every 30s if a group reminder time has been reached.
 * 
 * Logic:
 * - For each group with reminders enabled, check if current time matches the group's reminder time.
 * - If it matches, gather all incomplete tasks in that group and fire ONE notification listing them.
 * - The notification fires once per group per day (tracked by date+group key).
 * - Task-level date/time is for display only — it does NOT trigger notifications.
 */
export function useTaskReminders() {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Register SW on mount
    registerServiceWorker()

    const check = () => {
      const { items, groupReminders } = useTodoStore.getState()
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const currentMinutes = now.getHours() * 60 + now.getMinutes()

      Object.entries(groupReminders).forEach(([group, reminder]) => {
        if (!reminder || !reminder.enabled || !reminder.time) return

        // Parse group reminder time
        const [h, m] = reminder.time.split(':').map(Number)
        const reminderMinutes = h * 60 + m

        // Already notified this group today?
        const dayKey = `${group}::${todayStr}`
        if (notifiedRef.current.has(dayKey)) return

        // Fire if we're within a 2-minute window of the reminder time
        const diff = currentMinutes - reminderMinutes
        if (diff >= 0 && diff < 2) {
          // Gather incomplete tasks in this group
          const pendingTasks = items.filter(
            (i) => i.group === group && !i.completed
          )

          if (pendingTasks.length === 0) return

          notifiedRef.current.add(dayKey)

          const taskNames = pendingTasks
            .slice(0, 5)
            .map((t) => `• ${t.title}`)
            .join('\n')
          const extra =
            pendingTasks.length > 5
              ? `\n...and ${pendingTasks.length - 5} more`
              : ''

          showNotification(
            `⏰ ${group} — ${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}`,
            `${taskNames}${extra}`
          )
          playAlarm()
        }
      })
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])
}
