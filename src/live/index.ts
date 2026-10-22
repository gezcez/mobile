// index.ts
// The app's single LiveSocket: URL from remote config (ws_url), the mock socket in mock mode,
// auth for signed-in riders, and AppState / network wiring.

import { onlineManager } from "@tanstack/react-query"
import { AppState } from "react-native"
import { appConfigQuery } from "@/api/queries/transit"
import { queryClient } from "@/api/queryClient"
import { auth } from "@/auth"
import { env } from "@/lib/env"
import { MockWebSocket } from "@/mock/ws"
import { LiveSocket, type SocketLike } from "./socket"

function wsUrl(): string | null {
	const fromConfig = queryClient.getQueryData(appConfigQuery().queryKey)?.wsUrl
	if (fromConfig) return fromConfig
	if (env.mock) return "mock://ws"
	return `${env.apiUrl.replace(/^http/, "ws")}/v1/ws`
}

let instance: LiveSocket | null = null

export function liveSocket(): LiveSocket {
	if (instance) return instance
	const socket = new LiveSocket({
		url: wsUrl,
		factory: (url) => (url.startsWith("mock://") ? new MockWebSocket(url) : (new WebSocket(url) as unknown as SocketLike)),
		getToken: async () => (auth.status() === "signed_in" ? auth.getAccessToken().catch(() => null) : null),
		onAuthRejected: async () => {
			auth.invalidateAccessToken()
		},
	})
	AppState.addEventListener("change", (s) => socket.setAppActive(s === "active"))
	onlineManager.subscribe((online) => socket.setOnline(online))
	auth.onEvent((e) => {
		if (e.type === "refreshed" || e.type === "signed_in") void socket.reauth()
	})
	instance = socket
	return socket
}
