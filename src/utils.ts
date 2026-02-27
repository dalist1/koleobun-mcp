import type { TimeDict } from "./types";

const TRANSLITERATIONS: Record<string, string> = {
  l: "l",
  ł: "l",
  ń: "n",
  ą: "a",
  ę: "e",
  ś: "s",
  ć: "c",
  ó: "o",
  ź: "z",
  ż: "z",
  " ": "-",
  "/": "-",
  _: "-",
};

export function nameToSlug(name: string): string {
  return Array.from(name.toLowerCase())
    .map((char) => TRANSLITERATIONS[char] ?? char)
    .join("");
}

export function parseDateTime(input?: string): Date {
  if (!input) {
    return new Date();
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`Invalid ISO datetime: ${input}`);
  }
  return parsed;
}

export function koleoTimeToDate(input: string | TimeDict, baseDate = new Date()): Date {
  if (typeof input === "string") {
    return new Date(input);
  }
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    input.hour,
    input.minute,
    input.second ?? 0,
    0,
  );
}

export function formatDateYMD(date: Date): string {
  return [date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())].join("-");
}

export function formatDateDMYHM(date: Date): string {
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}_${pad2(date.getHours())}:${pad2(
    date.getMinutes(),
  )}`;
}

export function formatDateYMDHM(date: Date): string {
  return `${formatDateYMD(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatLocalIsoMinute(date: Date): string {
  return `${formatDateYMD(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function looksLikeSlug(value: string): boolean {
  return value.includes("-") && value.toLowerCase() === value;
}
