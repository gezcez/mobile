// The three variants from plan 15.1 must stay installable side by side and keep the release policy.
import type { ExpoConfig } from "expo/config"

function load(variant: string | undefined, env: Record<string, string> = {}): ExpoConfig {
	const saved = { ...process.env }
	process.env.APP_VARIANT = variant
	if (variant === undefined) delete process.env.APP_VARIANT
	Object.assign(process.env, env)
	let cfg: ExpoConfig
	jest.isolateModules(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require("../../app.config") as { default: (ctx: { config: Partial<ExpoConfig> }) => ExpoConfig }
		cfg = mod.default({ config: {} })
	})
	process.env = saved
	return cfg!
}

describe("app.config variants", () => {
	it.each([
		["development", "gezcez Dev", "com.gezcez.app.dev", "gezcez-dev", "mobile-dev"],
		["preview", "gezcez Beta", "com.gezcez.app.preview", "gezcez-preview", "mobile"],
		["production", "gezcez", "com.gezcez.app", "gezcez", "mobile"],
	])("%s has its own name, ids, scheme and OAuth client", (variant, name, id, scheme, client) => {
		const c = load(variant)
		expect(c.name).toBe(name)
		expect(c.ios?.bundleIdentifier).toBe(id)
		expect(c.android?.package).toBe(id)
		expect(c.scheme).toBe(scheme)
		expect(c.extra?.oauthClientId).toBe(client)
		expect(c.extra?.variant).toBe(variant)
	})

	it("defaults to production when APP_VARIANT is unset", () => {
		expect(load(undefined).ios?.bundleIdentifier).toBe("com.gezcez.app")
	})

	it("uses the fingerprint runtime and never blocks launch on an update check", () => {
		const c = load("production", { EAS_PROJECT_ID: "00000000-0000-0000-0000-000000000000" })
		expect(c.runtimeVersion).toEqual({ policy: "fingerprint" })
		expect(c.updates).toMatchObject({
			url: "https://u.expo.dev/00000000-0000-0000-0000-000000000000",
			checkAutomatically: "ON_LOAD",
			fallbackToCacheTimeout: 0,
		})
	})

	it("asks only for foreground location and blocks inherited permissions", () => {
		const c = load("production")
		expect(c.android?.permissions).toEqual(["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"])
		expect(c.android?.blockedPermissions).toContain("android.permission.ACCESS_BACKGROUND_LOCATION")
		expect(c.ios?.infoPlist?.NSLocationAlwaysAndWhenInUseUsageDescription).toBeUndefined()
		expect(c.ios?.infoPlist?.NSAppTransportSecurity).toEqual({ NSAllowsArbitraryLoads: false })
	})

	it("marks OTA updates critical only when asked", () => {
		expect(load("production").extra?.critical).toBe(false)
		expect(load("production", { EAS_UPDATE_CRITICAL: "1" }).extra?.critical).toBe(true)
	})
})
