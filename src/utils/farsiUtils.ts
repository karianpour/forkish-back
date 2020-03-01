export function mapToFarsi(str: string | number | undefined | null): string | number | undefined | null {
  if (!str && str !== 0) return str;
  return str.toString().replace(/[1234567890]/gi, e => String.fromCharCode(e.charCodeAt(0) + 1728))
}

export function mapToLatin(str: string | number | undefined | null): string | number | undefined | null {
  if (!str && str !== 0) return str;
  return str.toString().replace(/[۱۲۳۴۵۶۷۸۹۰]/gi, e => String.fromCharCode(e.charCodeAt(0) - 1728))
}
