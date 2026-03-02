/**
 * Service Worker — Budget & Todo Tracker
 *
 * Handles background reminder checking so notifications fire even when the
 * mobile app is backgrounded or the screen is locked.
 *
 * Architecture:
 *   1. The React app syncs reminder + task data to the Cache API on every
 *      change and when the app goes to background (visibilitychange).
 *   2. It also posts the data to the SW via postMessage for immediate use.
 *   3. The SW runs a wake loop (30 s interval, up to 5 min per wake event)
 *      checking whether any reminder should fire.
 *   4. Periodic Background Sync is registered as a bonus wake source.
 *   5. Notification actions (Snooze / Dismiss) are handled directly in
 *      the SW — if the app is open the change is forwarded via postMessage;
 *      if not, the action is queued in the cache for the app to pick up.
 */

const APP_PREFIX = '/budget-todo'
const CACHE_NAME = 'reminder-data-v1'
const DATA_URL = '/_reminders.json'
const ACTIONS_URL = '/_pending_actions.json'
const WAKE_INTERVAL = 30_000       // check every 30 s
const WAKE_DURATION = 5 * 60_000   // keep checking for 5 min per wake

// ─── In-memory state ─────────────────────────────────────────────────────────
let reminderData = null
let wakeLoopRunning = false
const notifiedKeys = new Set()

// ─── Lifecycle ───────────────────────────────────────────────────────────────

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ─── Cache helpers ───────────────────────────────────────────────────────────

async function saveToCache(url, data) {
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(url, new Response(JSON.stringify(data)))
  } catch { /* unavailable */ }
}

async function loadFromCache(url) {
  try {
    const cache = await caches.open(CACHE_NAME)
    const res = await cache.match(url)
    return res ? await res.json() : null
  } catch { return null }
}

async function saveReminderData(data) {
  reminderData = data
  await saveToCache(DATA_URL, data)
}

async function getReminderData() {
  if (reminderData) return reminderData
  reminderData = await loadFromCache(DATA_URL)
  return reminderData
}

// ─── Pending actions queue ───────────────────────────────────────────────────
// When the user taps Snooze/Dismiss on a notification while the app is closed,
// the action is queued here. The app reads the queue on next open.

async function queuePendingAction(action) {
  const list = (await loadFromCache(ACTIONS_URL)) || []
  list.push({ ...action, timestamp: Date.now() })
  await saveToCache(ACTIONS_URL, list)
}

// ─── Reminder checking ──────────────────────────────────────────────────────

async function checkReminders() {
  const data = await getReminderData()
  if (!data?.groupReminders || !data?.items) return

  const now = new Date()

  for (const [group, reminder] of Object.entries(data.groupReminders)) {
    if (!reminder?.enabled || !reminder.date || !reminder.time) continue
    if (reminder.dismissed) continue

    const target = new Date(`${reminder.date}T${reminder.time}:00`)
    if (isNaN(target.getTime())) continue

    // ── Snoozed ──
    if (reminder.snoozedUntil) {
      const snoozeEnd = new Date(reminder.snoozedUntil)
      if (now < snoozeEnd) continue
      const key = `${group}::snz::${reminder.snoozedUntil}`
      if (notifiedKeys.has(key)) continue

      const pending = data.items.filter(i => i.group === group && !i.completed)
      if (pending.length === 0) continue

      notifiedKeys.add(key)
      await fireNotification(group, pending)
      continue
    }

    // ── Normal ──
    if (now < target) continue
    // 10-minute window (wider than foreground to catch background lag)
    if (now.getTime() - target.getTime() > 10 * 60_000) continue

    const key = `${group}::${reminder.date}::${reminder.time}`
    if (notifiedKeys.has(key)) continue

    const pending = data.items.filter(i => i.group === group && !i.completed)
    if (pending.length === 0) continue

    notifiedKeys.add(key)
    await fireNotification(group, pending)
  }
}

async function fireNotification(group, tasks) {
  const names = tasks.slice(0, 5).map(t => `• ${t.title}`).join('\n')
  const extra = tasks.length > 5 ? `\n...and ${tasks.length - 5} more` : ''

  await self.registration.showNotification(
    `⏰ ${group} — ${tasks.length} pending task${tasks.length > 1 ? 's' : ''}`,
    {
      body: `${names}${extra}`,
      icon: `${APP_PREFIX}/icon-192.svg`,
      badge: `${APP_PREFIX}/icon-192.svg`,
      tag: `reminder-${group}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        { action: 'snooze', title: '⏳ Snooze 15 min' },
        { action: 'dismiss', title: '✓ Dismiss' },
      ],
      data: { group },
    }
  )

  // Tell any visible client to play alarm sound
  const clients = await self.clients.matchAll({ type: 'window' })
  for (const client of clients) {
    client.postMessage({ type: 'PLAY_ALARM' })
  }
}

// ─── Wake loop ───────────────────────────────────────────────────────────────
// Keeps the SW alive for WAKE_DURATION after the last triggering event,
// checking reminders every WAKE_INTERVAL.

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runWakeLoop() {
  if (wakeLoopRunning) return
  wakeLoopRunning = true

  const start = Date.now()
  while (Date.now() - start < WAKE_DURATION) {
    await checkReminders()
    await sleep(WAKE_INTERVAL)
  }
  wakeLoopRunning = false
}

// ─── Message handler (app → SW) ─────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg?.type) return

  switch (msg.type) {
    case 'SYNC_REMINDERS':
      // App sent fresh data — save and start checking
      event.waitUntil(
        saveReminderData(msg.payload).then(() => runWakeLoop())
      )
      break

    case 'KEEP_ALIVE':
      // App went to background — keep checking
      event.waitUntil(runWakeLoop())
      break

    case 'GET_PENDING_ACTIONS':
      // App just opened — return any queued snooze/dismiss actions
      event.waitUntil(
        (async () => {
          const actions = (await loadFromCache(ACTIONS_URL)) || []
          if (event.source) {
            event.source.postMessage({ type: 'PENDING_ACTIONS', actions })
          }
          await saveToCache(ACTIONS_URL, [])
        })()
      )
      break
  }
})

// ─── Periodic Background Sync ────────────────────────────────────────────────
// Chrome on Android may wake the SW periodically for installed PWAs.

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(runWakeLoop())
  }
})

// ─── Notification interactions ───────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  const action = event.action
  const group = event.notification.data?.group
  event.notification.close()

  // ── Snooze ──
  if (action === 'snooze' && group) {
    event.waitUntil(
      (async () => {
        // Update SW-side data so it won't re-fire
        if (reminderData?.groupReminders?.[group]) {
          reminderData.groupReminders[group].snoozedUntil =
            new Date(Date.now() + 15 * 60_000).toISOString()
          await saveToCache(DATA_URL, reminderData)
        }
        // Forward to open clients or queue
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        if (clients.length > 0) {
          for (const c of clients) {
            c.postMessage({ type: 'SNOOZE_REMINDER', group, minutes: 15 })
          }
        } else {
          await queuePendingAction({ type: 'snooze', group, minutes: 15 })
        }
        // Re-enter wake loop so the snoozed reminder fires later
        await runWakeLoop()
      })()
    )
    return
  }

  // ── Dismiss ──
  if (action === 'dismiss' && group) {
    event.waitUntil(
      (async () => {
        if (reminderData?.groupReminders?.[group]) {
          reminderData.groupReminders[group].dismissed = true
          reminderData.groupReminders[group].snoozedUntil = undefined
          await saveToCache(DATA_URL, reminderData)
        }
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        if (clients.length > 0) {
          for (const c of clients) {
            c.postMessage({ type: 'DISMISS_REMINDER', group })
          }
        } else {
          await queuePendingAction({ type: 'dismiss', group })
        }
      })()
    )
    return
  }

  // ── Default tap — open or focus the app ──
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(APP_PREFIX) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(`${APP_PREFIX}/`)
      }
    })
  )
})
