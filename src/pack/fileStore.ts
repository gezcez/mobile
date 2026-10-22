// fileStore.ts
// Packs live as files in the document directory: packs/<networkId>@<version>.json (wire JSON, as
// downloaded). Only the newest version per network is kept.

import { Directory, File, Paths } from "expo-file-system"

export interface StoredPack {
	networkId: string
	version: string
	bytes: number
}

export interface PackFileStore {
	list(): StoredPack[]
	read(networkId: string, version: string): Promise<string | null>
	write(networkId: string, version: string, json: string): Promise<void>
	remove(networkId: string, keepVersion?: string): void
}

const SEP = "@"

function parseName(name: string): { networkId: string; version: string } | null {
	if (!name.endsWith(".json")) return null
	const base = name.slice(0, -5)
	const i = base.lastIndexOf(SEP)
	if (i <= 0) return null
	return { networkId: decodeURIComponent(base.slice(0, i)), version: decodeURIComponent(base.slice(i + 1)) }
}

const fileName = (networkId: string, version: string) => `${encodeURIComponent(networkId)}${SEP}${encodeURIComponent(version)}.json`

export function deviceFileStore(): PackFileStore {
	const dir = () => {
		const d = new Directory(Paths.document, "packs")
		if (!d.exists) d.create({ intermediates: true, idempotent: true })
		return d
	}
	return {
		list() {
			const out: StoredPack[] = []
			for (const entry of dir().list()) {
				if (!(entry instanceof File)) continue
				const p = parseName(entry.name)
				if (p) out.push({ ...p, bytes: entry.size ?? 0 })
			}
			return out
		},
		async read(networkId, version) {
			const f = new File(dir(), fileName(networkId, version))
			return f.exists ? await f.text() : null
		},
		async write(networkId, version, json) {
			const f = new File(dir(), fileName(networkId, version))
			if (!f.exists) f.create({ overwrite: true })
			await f.write(json)
		},
		remove(networkId, keepVersion) {
			for (const entry of dir().list()) {
				if (!(entry instanceof File)) continue
				const p = parseName(entry.name)
				if (p && p.networkId === networkId && p.version !== keepVersion) entry.delete()
			}
		},
	}
}

export function memoryFileStore(): PackFileStore {
	const files = new Map<string, string>()
	return {
		list: () =>
			[...files.entries()].map(([k, v]) => {
				const p = parseName(k)!
				return { ...p, bytes: v.length }
			}),
		read: async (n, v) => files.get(fileName(n, v)) ?? null,
		write: async (n, v, json) => {
			files.set(fileName(n, v), json)
		},
		remove: (n, keep) => {
			for (const k of [...files.keys()]) {
				const p = parseName(k)
				if (p && p.networkId === n && p.version !== keep) files.delete(k)
			}
		},
	}
}
