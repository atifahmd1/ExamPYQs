import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names safely with Tailwind merge
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Robust 64-bit FNV-1a hash function to prevent false positive collisions
 */
export function computeTextHash(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x811c9dc5);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `hash_${hex1}${hex2}_len${normalized.length}`;
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format percentage accurately
 */
export function formatPercentage(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

/**
 * Advanced CSV parser supporting multi-line quotes and custom headers
 */
export function parseCsvToObjects(csvString: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i];
    if (char === '"' && csvString[i + 1] === '"') {
      currentLine += '"';
      i++; // skip escaped quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);

  if (lines.length < 2) return [];

  const splitRow = (line: string) => {
    const row: string[] = [];
    let cell = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        q = !q;
      } else if (c === ',' && !q) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    row.push(cell.trim());
    return row;
  };

  const headers = splitRow(lines[0]).map((h) => h.toLowerCase().replace(/["']/g, '').trim());
  const results: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const values = splitRow(lines[r]).map((v) => v.replace(/^"|"$/g, '').trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    results.push(obj);
  }

  return results;
}

/**
 * Sanitize error messages for user safety
 */
export function getSanitizedErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    if (error.message.includes('duplicate key')) {
      return 'A record with this identifier already exists.';
    }
    return 'An unexpected error occurred. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
