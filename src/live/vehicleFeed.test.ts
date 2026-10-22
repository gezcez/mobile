import { COMPACT_FIELDS } from "./protocol"
import { LiveSocket, type SocketLike } from "./socket"
import { REST_POLL_MS, VehicleFeed } from "./vehicleFeed"

class S implements SocketLike {
	readyState = 0
	onopen: SocketLike["onopen"] = null
	onmessage: SocketLike["onmessage"] = null
	onclose: SocketLike["onclose"] = null
	onerror: SocketLike["onerror"] = null
	send() {}
	close() {}
}

const row = (id: string, lat = 40.7) => [id, lat, 29.9, 0, 0, "r", 0, "t", 1, "x", 1_800_000_000, 0]
const flush = () => new Promise((r) => jest.requireActual<typeof import("timers")>("timers").setImmediate(r))

describe("VehicleFeed", () => {
	beforeEach(() => jest.useFakeTimers())
	afterEach(() => jest.useRealTimers())

	function setup() {
		const sockets: S[] = []
		const socket = new LiveSocket({ url: () => "wss://x", factory: () => (sockets.push(new S()), sockets.at(-1)!), random: () => 1 })
		const fetcher = jest.fn(async () => ({
			network_id: 1,
			feed_ts: 100,
			status: "active" as const,
			message: null,
			fields: [...COMPACT_FIELDS],
			vehicles: [row("rest-1")],
		}))
		const feed = new VehicleFeed({ network: "n" }, socket, fetcher)
		return { sockets, socket, fetcher, feed }
	}

	it("paints from REST, then the WS snapshot and deltas take over", async () => {
		const { sockets, feed, fetcher } = setup()
		const off = feed.subscribe(() => undefined)
		await flush()
		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(feed.snapshot.vehicles.map((v) => v.id)).toEqual(["rest-1"])
		expect(feed.snapshot.source).toBe("rest")
		const ws = sockets[0]!
		ws.readyState = 1
		ws.onopen?.({})
		ws.onmessage?.({ data: JSON.stringify({ type: "snapshot", sub: "s1", seq: 1, feed_ts: 200, fields: COMPACT_FIELDS, vehicles: [row("a"), row("b")] }) })
		expect(feed.snapshot.vehicles.map((v) => v.id)).toEqual(["a", "b"])
		ws.onmessage?.({ data: JSON.stringify({ type: "delta", sub: "s1", seq: 2, feed_ts: 210, upsert: [row("a", 41), row("c")], remove: ["b"] }) })
		expect(feed.snapshot.vehicles.map((v) => [v.id, v.lat])).toEqual([
			["a", 41],
			["c", 40.7],
		])
		expect(feed.snapshot).toMatchObject({ source: "ws", feedTs: 210 })
		off()
	})

	it("polls REST every 15 s after three failed connections", async () => {
		const { sockets, feed, fetcher } = setup()
		feed.subscribe(() => undefined)
		await flush()
		for (let i = 0; i < 3; i++) {
			sockets.at(-1)!.onclose?.({ code: 1006 })
			jest.advanceTimersByTime(30_000)
		}
		await flush()
		const calls = fetcher.mock.calls.length
		jest.advanceTimersByTime(REST_POLL_MS)
		await flush()
		expect(fetcher.mock.calls.length).toBe(calls + 1)
	})
})
