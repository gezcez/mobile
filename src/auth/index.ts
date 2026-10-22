// index.ts
// The configured AuthClient for this app (oauth.md 9.7, mobile).

import { makeRedirectUri } from "expo-auth-session"
import * as SecureStore from "expo-secure-store"
import { AppState } from "react-native"
import { currentLanguage } from "@/i18n"
import { env } from "@/lib/env"
import { IS_EXPO_GO } from "@/lib/expoGo"
import { transportFetch } from "@/lib/transport"
import { selectAuthTarget } from "./redirect"
import { nativeBrowser } from "./request"
import { createAuthClient, type AuthBrowser } from "./session"
import { secureStoreStorage } from "./storage"

/** Mock mode: the "browser" signs in at once, so the whole flow runs against the mock token endpoint. */
const mockBrowser: AuthBrowser = {
	authorize: async ({ params, redirectUri }) => ({
		type: "redirect",
		url: `${redirectUri}?code=mock-code&state=${encodeURIComponent(params.state ?? "")}`,
	}),
}

export const AUTH_SCOPES = ["openid", "profile", "email", "offline_access", "transit"]

/** "mobile" or "mobile-dev" (development variant and Expo Go); gezcez*://oauth/callback or exp://. */
export const AUTH_TARGET = selectAuthTarget({
	expoGo: IS_EXPO_GO,
	scheme: env.scheme,
	clientId: env.oauthClientId,
	makeRedirectUri,
})

export const auth = createAuthClient(
	{
		clientId: AUTH_TARGET.clientId,
		issuer: env.apiUrl,
		authorizeUrl: `${env.oauthUrl}/authorize`,
		apiBaseUrl: env.apiUrl,
		redirectUri: AUTH_TARGET.redirectUri,
		scopes: AUTH_SCOPES,
		refreshMode: "storage",
		storage: secureStoreStorage(SecureStore),
		locale: currentLanguage,
	},
	{ browser: env.mock ? mockBrowser : nativeBrowser, fetch: transportFetch },
)

AppState.addEventListener("change", (s) => auth.setAppActive(s === "active"))

export type { AuthClient, AuthStatus, AuthEvent, LoginResult } from "./session"
export { AuthError, isAuthError } from "./errors"
