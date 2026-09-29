import { describe, expect, it } from 'vitest'
import { ageOn, celebratedAge, daysSince, fill, formatClock, formatLockDate, formatLongDate, formatShortDate, formatUnlock, numberWords, parseDay, plural, splitCountdown, stampParts } from './text'

describe('fill', () => {
  const names = { name: 'Mít', fullName: 'Nguyễn Mai Anh', sender: 'T', age: 22, days: 8036 }
  it('replaces the names', () => {
    expect(fill('Dear {name}, from {sender}. {name}!', names)).toBe('Dear Mít, from T. Mít!')
    expect(fill('For Miss {fullName}', names)).toBe('For Miss Nguyễn Mai Anh')
  })
  it('replaces the age and days', () => {
    const text = fill('{AgeWords}, or {ageWords} ({age}). {days} days.', names)
    expect(text.replaceAll('\u2060', '')).toBe('Twenty-two, or twenty-two (22). 8,036 days.')
    expect(text).toContain('twenty-\u2060two') // never split across lines
  })
})

describe('numberWords', () => {
  it('spells out 0–99', () => {
    expect(numberWords(7)).toBe('seven')
    expect(numberWords(19)).toBe('nineteen')
    expect(numberWords(20)).toBe('twenty')
    expect(numberWords(22)).toBe('twenty-two')
    expect(numberWords(101)).toBe('101')
  })
})

describe('ageOn', () => {
  it('counts full years', () => {
    expect(ageOn('2004-10-21', new Date(2026, 9, 20))).toBe(21)
    expect(ageOn('2004-10-21', new Date(2026, 9, 21))).toBe(22)
    expect(ageOn('2004-10-21', new Date(2026, 11, 1))).toBe(22)
  })
})

describe('celebratedAge', () => {
  it('uses the unlock date when there is one', () => {
    expect(celebratedAge('2004-10-21', '2026-10-21T00:00:00', new Date(2026, 0, 1))).toBe(22)
  })
  it('otherwise uses the nearest birthday, so a few weeks early is fine', () => {
    expect(celebratedAge('2004-10-21', null, new Date(2026, 8, 28))).toBe(22)
    expect(celebratedAge('2004-10-21', null, new Date(2026, 10, 15))).toBe(22)
  })
})

describe('formatLongDate', () => {
  it('weekday, month day, year', () => {
    expect(formatLongDate('2004-10-21')).toBe('Thursday, October 21, 2004')
  })
})

describe('parseDay', () => {
  it('parses in local time without shifting the day', () => {
    const d = parseDay('2025-06-14')
    expect(d?.getFullYear()).toBe(2025)
    expect(d?.getMonth()).toBe(5)
    expect(d?.getDate()).toBe(14)
  })
  it('returns null for other formats', () => {
    expect(parseDay('14/06/2025')).toBeNull()
  })
})

describe('stampParts', () => {
  it('matches a film-camera date stamp', () => {
    expect(stampParts('2025-06-04')).toEqual(['25', '6', '4'])
  })
})

describe('formatShortDate', () => {
  it('month day, year', () => {
    expect(formatShortDate('2023-02-14')).toBe('Feb 14, 2023')
  })
})

describe('formatLockDate', () => {
  it('weekday, month day', () => {
    expect(formatLockDate(new Date(2026, 9, 5))).toBe('Monday, October 5')
  })
})

describe('formatClock', () => {
  const evening = new Date(2026, 9, 5, 21, 7)
  const midnight = new Date(2026, 9, 5, 0, 30)
  it('24-hour clock', () => {
    expect(formatClock(evening)).toBe('21:07')
    expect(formatClock(midnight)).toBe('00:30')
  })
  it('12-hour clock like an iPhone lock screen', () => {
    expect(formatClock(evening, true)).toBe('9:07')
    expect(formatClock(midnight, true)).toBe('12:30')
  })
})

describe('formatUnlock', () => {
  it('short date and time', () => {
    expect(formatUnlock(new Date(2026, 9, 20, 0, 0))).toBe('Oct 20 at 00:00')
  })
})

describe('daysSince', () => {
  it('counts whole days', () => {
    expect(daysSince('2026-09-01', new Date(2026, 8, 28, 23, 59))).toBe(27)
  })
  it('handles leap years', () => {
    expect(daysSince('2024-02-28', new Date(2024, 2, 1))).toBe(2)
  })
})

describe('splitCountdown', () => {
  it('splits into days, hours, minutes and seconds', () => {
    expect(splitCountdown(((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000 + 999)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 })
  })
  it('never goes negative', () => {
    expect(splitCountdown(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })
})

describe('plural', () => {
  it('adds an s except for one', () => {
    expect(plural(1, 'day')).toBe('1 day')
    expect(plural(956, 'day')).toBe('956 days')
  })
})
