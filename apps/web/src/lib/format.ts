const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : '—'
}

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}
