import { content } from "../content";

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/** 22 → 'twenty-two' (0–99; larger numbers stay as digits). */
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  return n % 10 ? `${tens}-${ONES[n % 10]}` : tens;
}

export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

/** Full years between a 'YYYY-MM-DD' birthday and `on`. */
export function ageOn(birthday: string, on: Date): number | null {
  const b = parseDay(birthday);
  if (!b) return null;
  const hadBirthday =
    on.getMonth() > b.getMonth() ||
    (on.getMonth() === b.getMonth() && on.getDate() >= b.getDate());
  return on.getFullYear() - b.getFullYear() - (hadBirthday ? 0 : 1);
}

/**
 * The age being celebrated: at `unlockAt` when there is one, otherwise at the birthday nearest to `now`
 * (so opening the site a week early still shows the new age).
 */
export function celebratedAge(
  birthday: string,
  unlockAt: string | null,
  now: Date = new Date(),
): number | null {
  const b = parseDay(birthday);
  if (!b) return null;
  const unlock = unlockAt ? new Date(unlockAt) : null;
  if (unlock && !Number.isNaN(unlock.getTime())) return ageOn(birthday, unlock);
  const year = now.getFullYear();
  const nearest = [year - 1, year, year + 1]
    .map((y) => new Date(y, b.getMonth(), b.getDate()))
    .reduce((best, d) =>
      Math.abs(d.getTime() - now.getTime()) <
      Math.abs(best.getTime() - now.getTime())
        ? d
        : best,
    );
  return nearest.getFullYear() - b.getFullYear();
}

interface Names {
  name: string;
  fullName: string;
  sender: string;
  age: number | null;
  days: number | null;
  /** 'Oct 21, 2004' */
  birthDate?: string;
}

const defaultNames = (): Names => ({
  name: content.name,
  fullName: content.fullName,
  sender: content.sender,
  age: content.cake.age ?? celebratedAge(content.birthday, content.unlockAt),
  days: daysSince(content.birthday),
  birthDate: formatShortDate(content.birthday),
});

/** A word joiner after the hyphen keeps "twenty-two" on one line */
const unbroken = (words: string) => words.replaceAll("-", "-\u2060");

/** Replaces {name}, {fullName}, {sender}, {age}, {ageWords}, {AgeWords}, {days} and {birthDate} (see content.ts). */
export function fill(text: string, names: Names = defaultNames()): string {
  const age = names.age ?? 0;
  return text
    .replaceAll("{name}", names.name)
    .replaceAll("{fullName}", names.fullName)
    .replaceAll("{sender}", names.sender)
    .replaceAll("{studio}", `${content.studio.name} ${content.studio.kind}`)
    .replaceAll("{ageWords}", unbroken(numberWords(age)))
    .replaceAll("{AgeWords}", unbroken(capitalize(numberWords(age))))
    .replaceAll("{age}", String(age))
    .replaceAll("{days}", (names.days ?? 0).toLocaleString("en-US"))
    .replaceAll("{birthDate}", names.birthDate ?? "");
}

/** The age on the candles */
export const candleAge = (): number =>
  content.cake.age ?? celebratedAge(content.birthday, content.unlockAt) ?? 0;

export const pad = (n: number): string => String(n).padStart(2, "0");

/** Parses 'YYYY-MM-DD' in local time (new Date('YYYY-MM-DD') would treat it as UTC). */
export function parseDay(iso: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Film-camera date stamp: '2025-06-14' → ['25', '6', '14'] (shown as '25 6 14). */
export function stampParts(iso: string): string[] | null {
  const d = parseDay(iso);
  if (!d) return null;
  return [
    String(d.getFullYear()).slice(2),
    String(d.getMonth() + 1),
    String(d.getDate()),
  ];
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Lock screen date line: "Monday, October 5". */
export function formatLockDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Lock screen clock. iPhones on a 12-hour clock show "9:41" (no AM/PM), 24-hour ones "21:41". */
export function formatClock(d: Date, twelveHour = false): string {
  if (twelveHour) return `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** '2025-06-14' → 'Jun 14, 2025' */
export function formatShortDate(iso: string): string {
  const d = parseDay(iso);
  return d
    ? `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`
    : iso;
}

/** 'YYYY-MM-DDTHH:MM' → 'Oct 20 at 00:00' (for the countdown screen) */
export function formatUnlock(date: Date): string {
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()} at ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Whole days from `iso` until today. */
export function daysSince(iso: string, now: Date = new Date()): number | null {
  const d = parseDay(iso);
  if (!d) return null;
  const start = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today - start) / 86_400_000);
}

export function splitCountdown(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/** "1 day" / "3 days" */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** '2004-10-21' → 'Thursday, October 21, 2004' */
export function formatLongDate(iso: string): string {
  const d = parseDay(iso);
  return d
    ? `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    : iso;
}
