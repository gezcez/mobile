import { CALLBACK_PATH, selectAuthTarget } from "./redirect"

const makeRedirectUri = jest.fn(({ path }: { path: string }) => `exp://192.168.1.20:8081/--/${path}`)

describe("selectAuthTarget", () => {
	beforeEach(() => makeRedirectUri.mockClear())

	it.each([
		["gezcez", "mobile"],
		["gezcez-preview", "mobile"],
		["gezcez-dev", "mobile-dev"],
	] as const)("uses %s://oauth/callback with the variant's client outside Expo Go", (scheme, clientId) => {
		expect(selectAuthTarget({ expoGo: false, scheme, clientId, makeRedirectUri })).toEqual({
			clientId,
			redirectUri: `${scheme}://oauth/callback`,
		})
		expect(makeRedirectUri).not.toHaveBeenCalled()
	})

	it("uses Expo Go's exp:// URI and the mobile-dev client in Expo Go", () => {
		expect(selectAuthTarget({ expoGo: true, scheme: "gezcez", clientId: "mobile", makeRedirectUri })).toEqual({
			clientId: "mobile-dev",
			redirectUri: "exp://192.168.1.20:8081/--/oauth/callback",
		})
		expect(makeRedirectUri).toHaveBeenCalledWith({ path: CALLBACK_PATH })
	})
})
