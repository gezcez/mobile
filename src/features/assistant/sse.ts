// sse.ts
// A small Server-Sent Events parser (WHATWG "event stream interpretation") for streaming fetch
// bodies: chunks may split lines, CRLF pairs and multi-byte characters anywhere. React Native has no
// EventSource for POST, so the assistant reads the body itself.

export interface SseEvent {
	/** "message" when the stream gave no `event:` field. */
	event: string
	data: string
	/** The last `id:` seen on the stream so far (carried over between events, per the spec). */
	id: string | null
	/** A `retry:` value in ms, when this event block carried one. */
	retry?: number
}

export interface SseParser {
	push(chunk: string): void
	/** Flush at end of stream. An unterminated event block is dropped, as the spec requires. */
	end(): void
	lastEventId(): string | null
}

export function createSseParser(onEvent: (e: SseEvent) => void): SseParser {
	let buf = ""
	let first = true
	let pendingCr = false
	let eventType = ""
	let data: string[] = []
	let hasData = false
	let lastId: string | null = null
	let retry: number | undefined

	const dispatch = () => {
		if (hasData) {
			const e: SseEvent = { event: eventType || "message", data: data.join("\n"), id: lastId }
			if (retry !== undefined) e.retry = retry
			onEvent(e)
		}
		eventType = ""
		data = []
		hasData = false
		retry = undefined
	}

	const line = (l: string) => {
		if (l === "") return dispatch()
		if (l.startsWith(":")) return
		const i = l.indexOf(":")
		const field = i === -1 ? l : l.slice(0, i)
		let value = i === -1 ? "" : l.slice(i + 1)
		if (value.startsWith(" ")) value = value.slice(1)
		switch (field) {
			case "event":
				eventType = value
				break
			case "data":
				data.push(value)
				hasData = true
				break
			case "id":
				if (!value.includes("\0")) lastId = value
				break
			case "retry":
				if (/^\d+$/.test(value)) retry = Number(value)
				break
		}
	}

	return {
		push(chunk) {
			if (!chunk) return
			if (first) {
				first = false
				if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1)
			}
			// A CR at the end of the previous chunk already ended a line; skip its LF here.
			if (pendingCr && chunk.startsWith("\n")) chunk = chunk.slice(1)
			pendingCr = false
			buf += chunk
			let start = 0
			for (let i = 0; i < buf.length; i++) {
				const c = buf.charCodeAt(i)
				if (c !== 10 && c !== 13) continue
				line(buf.slice(start, i))
				if (c === 13) {
					if (i + 1 < buf.length) {
						if (buf.charCodeAt(i + 1) === 10) i++
					} else pendingCr = true
				}
				start = i + 1
			}
			buf = buf.slice(start)
		},
		end() {
			buf = ""
			eventType = ""
			data = []
			hasData = false
		},
		lastEventId: () => lastId,
	}
}

type Reader = { read(): Promise<{ done: boolean; value?: Uint8Array | string }>; cancel?(): Promise<void> }

/**
 * Feed a fetch Response body into the parser. Uses the body stream when the fetch supports one
 * (expo/fetch, Node), else falls back to the whole text (still correct, just not incremental).
 */
export async function readSse(response: Response, parser: SseParser, signal?: AbortSignal): Promise<void> {
	const body = response.body as unknown as { getReader?: () => Reader } | null
	if (!body || typeof body.getReader !== "function") {
		parser.push(await response.text())
		parser.end()
		return
	}
	const reader = body.getReader()
	const decoder = new TextDecoder()
	const onAbort = () => void reader.cancel?.().catch(() => {})
	signal?.addEventListener("abort", onAbort)
	try {
		for (;;) {
			if (signal?.aborted) throw abortError()
			const { done, value } = await reader.read()
			if (done) break
			if (value === undefined) continue
			parser.push(typeof value === "string" ? value : decoder.decode(value, { stream: true }))
		}
		if (signal?.aborted) throw abortError()
		parser.push(decoder.decode())
		parser.end()
	} finally {
		signal?.removeEventListener("abort", onAbort)
	}
}

export function abortError(): Error {
	const e = new Error("Aborted")
	e.name = "AbortError"
	return e
}

export function isAbortError(e: unknown): boolean {
	return e instanceof Error && e.name === "AbortError"
}
