// useNow.ts
// A clock that ticks every `intervalMs` (default 15 s) so countdowns stay right without refetching.
// One shared timer per interval for the whole app, stopped when nobody listens.

import { useSyncExternalStore } from "react"

interface Clock {
	subscribe: (cb: () => void) => () => void
	read: () => number
}

const clocks = new Map<number, Clock>()

function makeClock(intervalMs: number): Clock {
	let now = Date.now()
	let timer: ReturnType<typeof setInterval> | null = null
	const listeners = new Set<() => void>()
	return {
		subscribe(cb) {
			listeners.add(cb)
			if (!timer) {
				now = Date.now()
				timer = setInterval(() => {
					now = Date.now()
					for (const l of listeners) l()
				}, intervalMs)
			}
			return () => {
				listeners.delete(cb)
				if (listeners.size === 0 && timer) {
					clearInterval(timer)
					timer = null
				}
			}
		},
		read: () => now,
	}
}

function clockFor(intervalMs: number): Clock {
	let c = clocks.get(intervalMs)
	if (!c) {
		c = makeClock(intervalMs)
		clocks.set(intervalMs, c)
	}
	return c
}

export function useNow(intervalMs = 15_000): number {
	const c = clockFor(intervalMs)
	return useSyncExternalStore(c.subscribe, c.read, c.read)
}
