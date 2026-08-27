import { toDateString } from './milestoneDates'

/**
 * Shared iCal / .ics export helpers.
 * Used by DashboardCalendar and Roadmap.
 */

function toICSDate(dateStr) {
  return dateStr.replace(/-/g, '')
}

function escapeICS(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateICS(milestones, companyName) {
  const now   = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eliv8 OS//Roadmap//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(companyName || 'Eliv8 OS')} Roadmap`,
    'X-WR-CALDESC:Milestones from your Eliv8 OS roadmap',
  ]

  milestones.forEach(m => {
    const dateStr = m.end_date || m.start_date
    if (!dateStr) return
    const date    = dateStr.slice(0, 10).replace(/-/g, '')
    const d       = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    const endDate = toICSDate(toDateString(d))

    lines.push(
      'BEGIN:VEVENT',
      `UID:growthos-milestone-${m.id}@growthos.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${escapeICS(m.title)}`,
      `DESCRIPTION:Eliv8 OS roadmap milestone${m.completed ? ' (completed)' : ''}`,
      m.completed ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(milestones, companyName, filename = 'eliv8os-roadmap.ics') {
  const ics  = generateICS(milestones, companyName)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
