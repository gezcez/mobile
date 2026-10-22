// base64url without padding, and decode, in plain JS (no atob/Buffer dependency on Hermes).

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

export function base64UrlEncode(bytes: Uint8Array): string {
	let out = ""
	let i = 0
	for (; i + 2 < bytes.length; i += 3) {
		const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!
		out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + ALPHABET[n & 63]!
	}
	const rest = bytes.length - i
	if (rest === 1) {
		const n = bytes[i]! << 16
		out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]!
	} else if (rest === 2) {
		const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8)
		out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]!
	}
	return out
}

export function base64UrlDecode(input: string): Uint8Array {
	const s = input.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
	const out: number[] = []
	let buffer = 0
	let bits = 0
	for (const ch of s) {
		const v = ALPHABET.indexOf(ch)
		if (v < 0) throw new Error("invalid base64url")
		buffer = (buffer << 6) | v
		bits += 6
		if (bits >= 8) {
			bits -= 8
			out.push((buffer >> bits) & 0xff)
		}
	}
	return new Uint8Array(out)
}

export function utf8Encode(s: string): Uint8Array<ArrayBuffer> {
	const out: number[] = []
	for (const ch of s) {
		const c = ch.codePointAt(0)!
		if (c < 0x80) out.push(c)
		else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
		else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
		else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
	}
	return new Uint8Array(out)
}

export function utf8Decode(bytes: Uint8Array): string {
	let out = ""
	let i = 0
	const at = (k: number) => (bytes[i + k] ?? 0) & 63
	while (i < bytes.length) {
		const b = bytes[i]!
		let c: number
		let len: number
		if (b < 0x80) {
			c = b
			len = 1
		} else if (b < 0xe0) {
			c = ((b & 31) << 6) | at(1)
			len = 2
		} else if (b < 0xf0) {
			c = ((b & 15) << 12) | (at(1) << 6) | at(2)
			len = 3
		} else {
			c = ((b & 7) << 18) | (at(1) << 12) | (at(2) << 6) | at(3)
			len = 4
		}
		out += String.fromCodePoint(c)
		i += len
	}
	return out
}
