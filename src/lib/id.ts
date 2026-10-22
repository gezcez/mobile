// id.ts
// UUID v7 (time-ordered) for client-created rows such as favourite groups and items: the backend keys
// them by the id the client chose (backend 7.0), so ids must be unique without a server round trip.

import * as Crypto from "expo-crypto"

export function uuidv7(nowMs = Date.now()): string {
	const b = Crypto.getRandomBytes(16)
	let ts = nowMs
	for (let i = 5; i >= 0; i--) {
		b[i] = ts % 256
		ts = Math.floor(ts / 256)
	}
	b[6] = (b[6]! & 0x0f) | 0x70
	b[8] = (b[8]! & 0x3f) | 0x80
	const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
