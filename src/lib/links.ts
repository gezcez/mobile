// links.ts
// Outbound links (in-app browser) and share / deep link builders.

import * as WebBrowser from "expo-web-browser"
import { Share } from "react-native"
import { env } from "./env"

export const oauthLinks = {
	account: () => `${env.oauthUrl}/account`,
	deleteAccount: () => `${env.oauthUrl}/account/privacy/delete`,
	exportData: () => `${env.oauthUrl}/account/privacy`,
}

export const siteLinks = {
	home: "https://gezcez.com",
	privacy: "https://gezcez.com/privacy",
	kvkk: "https://gezcez.com/kvkk",
	source: "https://github.com/gezcez/mobile",
	feedback: "mailto:info@gezcez.com?subject=gezcez%20app",
}

export async function openInApp(url: string) {
	if (url.startsWith("mailto:")) {
		const { Linking } = await import("react-native")
		await Linking.openURL(url)
		return
	}
	await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET })
}

/** Deep links carry the network so a shared stop opens in any city (plan 4). */
export const deepLink = {
	stop: (networkId: string, stopId: string) => `${env.scheme}://stop/${encodeURIComponent(networkId)}/${encodeURIComponent(stopId)}`,
	route: (networkId: string, routeId: string, direction?: 0 | 1) =>
		`${env.scheme}://route/${encodeURIComponent(networkId)}/${encodeURIComponent(routeId)}${direction !== undefined ? `?dir=${direction}` : ""}`,
	city: (cityId: string) => `${env.scheme}://city/${encodeURIComponent(cityId)}`,
}

export async function shareLink(message: string, url: string) {
	try {
		await Share.share({ message: `${message}\n${url}`, url })
	} catch {
		// dismissed
	}
}
