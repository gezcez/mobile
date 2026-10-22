// hooks.tsx
// React bindings: useSession, useSignIn, useSignOut and <RequireAuth fallback>.

import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react"
import type { AuthClient, AuthStatus, LoginResult } from "./session"
import { auth } from "./index"

export function useAuthStatus(client: AuthClient = auth): AuthStatus {
	return useSyncExternalStore(client.subscribe, client.status, client.status)
}

export function useSession(client: AuthClient = auth) {
	const status = useAuthStatus(client)
	return {
		status: status === "unknown" ? ("loading" as const) : status === "signed_in" ? ("signedIn" as const) : ("guest" as const),
		claims: status === "signed_in" ? client.claims() : null,
	}
}

export function useSignIn(client: AuthClient = auth) {
	const [pending, setPending] = useState(false)
	const [result, setResult] = useState<LoginResult | null>(null)
	const signIn = useCallback(async () => {
		setPending(true)
		try {
			const r = await client.login()
			setResult(r)
			return r
		} finally {
			setPending(false)
		}
	}, [client])
	return { signIn, pending, result }
}

export function useSignOut(client: AuthClient = auth) {
	const [pending, setPending] = useState(false)
	const signOut = useCallback(async () => {
		setPending(true)
		try {
			await client.logout()
		} finally {
			setPending(false)
		}
	}, [client])
	return { signOut, pending }
}

/** Renders children only for a signed-in user; account-bound screens only, transit stays public. */
export function RequireAuth({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
	const status = useAuthStatus()
	return <>{status === "signed_in" ? children : fallback}</>
}
