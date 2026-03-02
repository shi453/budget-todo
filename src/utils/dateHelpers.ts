export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

export function isOverdue(dateStr: string, timeStr: string): boolean {
  if (!dateStr) return false
  const now = new Date()
  const taskDate = new Date(dateStr + 'T00:00:00')
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':')
    taskDate.setHours(parseInt(hours), parseInt(minutes))
  } else {
    taskDate.setHours(23, 59, 59)
  }
  return taskDate < now
}

export function isToday(dateStr: string): boolean {
  if (!dateStr) return false
  const today = new Date()
  const date = new Date(dateStr + 'T00:00:00')
  return date.toDateString() === today.toDateString()
}
