// request.ts
// Native browser leg: expo-auth-session's AuthRequest opens oauth.gezcez.com/authorize in
// ASWebAuthenticationSession / Custom Tabs. PKCE and state are ours (pkce.ts, contract vectors),
// passed as explicit params, so AuthRequest's own PKCE is off. preferEphemeralSession is false so
// the identity cookie persists and the already-signed-in fast path works (oauth.md 5.12).

import { AuthRequest, ResponseType } from "expo-auth-session"
import type { AuthBrowser } from "./session"

const OWN_PARAMS = new Set(["client_id", "redirect_uri", "response_type", "scope", "state", "prompt"])

export const nativeBrowser: AuthBrowser = {
	async authorize({ authorizeUrl, params, redirectUri }) {
		const extraParams: Record<string, string> = {}
		for (const [k, v] of Object.entries(params)) if (!OWN_PARAMS.has(k)) extraParams[k] = v
		const request = new AuthRequest({
			clientId: params.client_id!,
			redirectUri,
			responseType: ResponseType.Code,
			scopes: (params.scope ?? "").split(" ").filter(Boolean),
			state: params.state,
			usePKCE: false,
			extraParams: params.prompt ? { ...extraParams, prompt: params.prompt } : extraParams,
		})
		const result = await request.promptAsync(
			{ authorizationEndpoint: authorizeUrl },
			{ preferEphemeralSession: false, showInRecents: true },
		)
		if (result.type === "success" || result.type === "error") return { type: "redirect", url: result.url }
		return { type: "cancel" }
	},
}
