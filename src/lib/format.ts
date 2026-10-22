// format.ts
// Distance, walking time, masked card numbers, money, and small helpers (rewritten from FKart's
// util.ts with tests).

/** Walking pace from plan 5.2: 80 m per minute. */
export const WALK_M_PER_MIN = 80

export function walkMinutes(meters: number): number {
	return Math.max(1, Math.round(meters / WALK_M_PER_MIN))
}

/** "350 m" under 1 km (rounded to 10 m), "1.2 km" above, using the locale's decimal mark. */
export function formatDistance(meters: number, locale: string): { unit: "m" | "km"; value: string } {
	if (meters < 1000) return { unit: "m", value: String(Math.max(10, Math.round(meters / 10) * 10)) }
	return {
		unit: "km",
		value: new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-GB", { maximumFractionDigits: 1 }).format(meters / 1000),
	}
}

export function digitsOnly(s: string): string {
	return s.replace(/\D/g, "")
}

export function last4(cardNumber: string): string {
	return digitsOnly(cardNumber).slice(-4)
}

/** Groups of four for display while typing: "1234 5678 9012". */
export function groupCardNumber(s: string): string {
	return digitsOnly(s).replace(/(.{4})(?=.)/g, "$1 ")
}

export function formatMoney(amount: number, currency: string, locale: string): string {
	return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-GB", { style: "currency", currency }).format(amount)
}

export function hideEmail(email: string): string {
	const [user, domain] = email.split("@")
	if (!user || !domain) return email
	return `${user.slice(0, 2)}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`
}

export function groupBy<T, K extends string | number>(items: readonly T[], key: (t: T) => K): Map<K, T[]> {
	const out = new Map<K, T[]>()
	for (const it of items) {
		const k = key(it)
		const list = out.get(k)
		if (list) list.push(it)
		else out.set(k, [it])
	}
	return out
}

/** Formats bytes for the storage section. */
export function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`
	if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
	return `${(n / 1024 / 1024).toFixed(1)} MB`
}
