// index.ts
// The configured AuthClient for this app (oauth.md 9.7, mobile).

import * as SecureStore from "expo-secure-store"
import { AppState } from "react-native"
import { currentLanguage } from "@/i18n"
import { env } from "@/lib/env"
import { nativeBrowser } from "./request"
import { createAuthClient } from "./session"
import { secureStoreStorage } from "./storage"

export const AUTH_SCOPES = ["openid", "profile", "email", "offline_access", "transit"]

export const auth = createAuthClient(
	{
		clientId: env.oauthClientId, // "mobile", or "mobile-dev" in the development variant
		issuer: env.apiUrl,
		authorizeUrl: `${env.oauthUrl}/authorize`,
		apiBaseUrl: env.apiUrl,
		redirectUri: `${env.scheme}://oauth/callback`, // gezcez, gezcez-preview or gezcez-dev
		scopes: AUTH_SCOPES,
		refreshMode: "storage",
		storage: secureStoreStorage(SecureStore),
		locale: currentLanguage,
	},
	{ browser: nativeBrowser },
)

AppState.addEventListener("change", (s) => auth.setAppActive(s === "active"))

export type { AuthClient, AuthStatus, AuthEvent, LoginResult } from "./session"
export { AuthError, isAuthError } from "./errors"
