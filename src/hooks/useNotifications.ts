import { useEffect, useRef } from 'react'
import { useTodoStore } from '../store/todoStore'
import { playSelectedAlarm } from '../store/ringtoneStore'

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

// playAlarm is now handled by ringtoneStore.playSelectedAlarm()

/**
 * Hook: checks every 30s if a group reminder should fire.
 *
 * Logic:
 * - Each group has a specific date + time for its reminder.
 * - If snoozedUntil is set and in the future, skip (snoozed).
 * - If dismissed, skip.
 * - Otherwise fire when current datetime >= reminder datetime.
 * - After snooze expires, fire again.
 */
export function useTaskReminders() {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Register SW on mount
    registerServiceWorker()

    const check = () => {
      const { items, groupReminders } = useTodoStore.getState()
      const now = new Date()

      Object.entries(groupReminders).forEach(([group, reminder]) => {
        if (!reminder || !reminder.enabled || !reminder.date || !reminder.time) return
        if (reminder.dismissed) return

        // Build the target fire time
        const targetStr = `${reminder.date}T${reminder.time}:00`
        const targetDate = new Date(targetStr)
        if (isNaN(targetDate.getTime())) return

        // If snoozed and snooze hasn't expired yet, skip
        if (reminder.snoozedUntil) {
          const snoozeEnd = new Date(reminder.snoozedUntil)
          if (now < snoozeEnd) return
          // Snooze expired — fire again. Use snoozedUntil as the unique key so it doesn't double-fire.
          const snoozeKey = `${group}::snooze::${reminder.snoozedUntil}`
          if (notifiedRef.current.has(snoozeKey)) return

          const pendingTasks = items.filter((i) => i.group === group && !i.completed)
          if (pendingTasks.length === 0) return

          notifiedRef.current.add(snoozeKey)
          fireGroupNotification(group, pendingTasks)
          return
        }

        // Normal (non-snoozed) check: has the target time been reached?
        if (now < targetDate) return

        // Only fire within a 5-minute window to avoid re-firing on old reminders
        const diffMs = now.getTime() - targetDate.getTime()
        if (diffMs > 5 * 60 * 1000) return

        const dayKey = `${group}::${reminder.date}::${reminder.time}`
        if (notifiedRef.current.has(dayKey)) return

        const pendingTasks = items.filter((i) => i.group === group && !i.completed)
        if (pendingTasks.length === 0) return

        notifiedRef.current.add(dayKey)
        fireGroupNotification(group, pendingTasks)
      })
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])
}

function fireGroupNotification(group: string, pendingTasks: { title: string }[]) {
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
  playSelectedAlarm()
}
