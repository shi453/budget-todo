/**
 * Notification & Reminder system.
 *
 * Two-tier approach:
 *   1. FOREGROUND — React setInterval checks every 30 s (fast, works when visible).
 *   2. BACKGROUND — Service Worker wake loop reads from Cache API and fires
 *      notifications even when the app is backgrounded / screen locked.
 *
 * Data flow: Zustand store → Cache API + postMessage → SW
 */

import { useEffect, useRef } from 'react'
import { useTodoStore } from '../store/todoStore'
import { playSelectedAlarm } from '../store/ringtoneStore'

let swRegistration: ServiceWorkerRegistration | null = null

const CACHE_NAME = 'reminder-data-v1'
const DATA_URL = '/_reminders.json'

// ──────────────────────────────────────────────────────────────────────────────
// Service Worker Registration
// ──────────────────────────────────────────────────────────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/budget-todo/sw.js')
    swRegistration = reg

    // Register Periodic Background Sync (Chrome Android installed PWA)
    try {
      if ('periodicSync' in reg) {
        await (reg as any).periodicSync.register('check-reminders', {
          minInterval: 60 * 1000, // request 1 min; browser enforces its own minimum
        })
      }
    } catch {
      // periodic-background-sync permission not granted or API unavailable
    }

    return reg
  } catch (err) {
    console.warn('SW registration failed:', err)
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Notification Permission
// ──────────────────────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported')
    return 'denied'
  }
  const permission = await Notification.requestPermission()
  if (permission === 'granted' && !swRegistration) {
    await registerServiceWorker()
  }
  return permission
}

// ──────────────────────────────────────────────────────────────────────────────
// Data Sync  (App → Cache API → SW)
// ──────────────────────────────────────────────────────────────────────────────

/** Write current items + reminders to the Cache API so the SW can read them. */
async function syncToCache() {
  try {
    const { items, groupReminders } = useTodoStore.getState()
    const cache = await caches.open(CACHE_NAME)
    await cache.put(
      DATA_URL,
      new Response(JSON.stringify({ items, groupReminders, updatedAt: Date.now() }))
    )
  } catch { /* Cache API unavailable */ }
}

/** Post current data to the active SW via MessageChannel. */
function syncToSW() {
  const sw = navigator.serviceWorker?.controller
  if (!sw) return
  const { items, groupReminders } = useTodoStore.getState()
  sw.postMessage({ type: 'SYNC_REMINDERS', payload: { items, groupReminders } })
}

/** Helper to post an arbitrary message to the SW. */
function postToSW(message: Record<string, unknown>) {
  navigator.serviceWorker?.controller?.postMessage(message)
}

/** Write to cache AND notify the SW. */
async function fullSync() {
  await syncToCache()
  syncToSW()
}

// ──────────────────────────────────────────────────────────────────────────────
// Foreground notification (shown via SW API, with fallback for plain tabs)
// ──────────────────────────────────────────────────────────────────────────────

async function showNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return

  try {
    const reg = swRegistration ?? (await navigator.serviceWorker?.ready)
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
  } catch { /* fallback below */ }

  try {
    const n = new Notification(title, {
      body,
      tag: `group-reminder-${title}`,
      requireInteraction: true,
    })
    setTimeout(() => n.close(), 30_000)
  } catch { /* not available */ }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useTaskReminders() {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // ── Register SW ──
    registerServiceWorker()

    // ── Listen for messages FROM the SW ──
    const handleSWMessage = (event: MessageEvent) => {
      const msg = event.data
      if (!msg?.type) return

      switch (msg.type) {
        case 'PLAY_ALARM':
          playSelectedAlarm()
          break
        case 'SNOOZE_REMINDER':
          useTodoStore.getState().snoozeGroupReminder(msg.group, msg.minutes)
          break
        case 'DISMISS_REMINDER':
          useTodoStore.getState().dismissGroupReminder(msg.group)
          break
        case 'PENDING_ACTIONS':
          // Apply any actions the user took on notifications while the app was closed
          if (Array.isArray(msg.actions)) {
            for (const a of msg.actions) {
              if (a.type === 'snooze') {
                useTodoStore.getState().snoozeGroupReminder(a.group, a.minutes)
              } else if (a.type === 'dismiss') {
                useTodoStore.getState().dismissGroupReminder(a.group)
              }
            }
          }
          break
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSWMessage)

    // ── On first load, ask the SW for queued actions ──
    navigator.serviceWorker?.ready.then(() => {
      postToSW({ type: 'GET_PENDING_ACTIONS' })
    })

    // ── Foreground check (fast-path when app is visible) ──
    const check = () => {
      // Skip when hidden — the SW handles background
      if (document.hidden) return

      const { items, groupReminders } = useTodoStore.getState()
      const now = new Date()

      Object.entries(groupReminders).forEach(([group, reminder]) => {
        if (!reminder || !reminder.enabled || !reminder.date || !reminder.time) return
        if (reminder.dismissed) return

        const targetStr = `${reminder.date}T${reminder.time}:00`
        const targetDate = new Date(targetStr)
        if (isNaN(targetDate.getTime())) return

        // Snoozed
        if (reminder.snoozedUntil) {
          const snoozeEnd = new Date(reminder.snoozedUntil)
          if (now < snoozeEnd) return
          const snoozeKey = `${group}::snooze::${reminder.snoozedUntil}`
          if (notifiedRef.current.has(snoozeKey)) return

          const pendingTasks = items.filter((i) => i.group === group && !i.completed)
          if (pendingTasks.length === 0) return

          notifiedRef.current.add(snoozeKey)
          fireGroupNotification(group, pendingTasks)
          return
        }

        // Normal
        if (now < targetDate) return
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
    const interval = setInterval(check, 30_000)

    // ── Visibility change: sync when app backgrounds ──
    const handleVisibility = () => {
      fullSync()
      if (document.hidden) {
        // Tell the SW to start its background wake loop
        postToSW({ type: 'KEEP_ALIVE' })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // ── Store subscription: re-sync whenever items or reminders change ──
    const unsubscribe = useTodoStore.subscribe((state, prev) => {
      if (state.items !== prev.items || state.groupReminders !== prev.groupReminders) {
        fullSync()
      }
    })

    // ── Initial sync ──
    fullSync()

    // ── Cleanup ──
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
      unsubscribe()
    }
  }, [])
}

// ──────────────────────────────────────────────────────────────────────────────
// Foreground notification helper
// ──────────────────────────────────────────────────────────────────────────────

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
