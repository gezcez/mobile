// Jest mocks for native modules (mmkv mocks itself in tests).
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock("expo-secure-store", () => {
	const store = new Map<string, string>()
	return {
		AFTER_FIRST_UNLOCK: 0,
		AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
		getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
		setItemAsync: jest.fn(async (k: string, v: string) => {
			store.set(k, v)
		}),
		deleteItemAsync: jest.fn(async (k: string) => {
			store.delete(k)
		}),
		__store: store,
	}
})

jest.mock("expo-crypto", () => {
	const nodeCrypto = require("crypto")
	return {
		CryptoDigestAlgorithm: { SHA256: "SHA-256" },
		CryptoEncoding: { BASE64: "base64", HEX: "hex" },
		getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
		getRandomBytesAsync: async (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
		digest: async (_alg: string, data: ArrayBuffer | Uint8Array) => {
			const buf = Buffer.from(data instanceof Uint8Array ? data : new Uint8Array(data))
			const out = nodeCrypto.createHash("sha256").update(buf).digest()
			return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)
		},
		digestStringAsync: async (_alg: string, data: string, opts?: { encoding?: string }) =>
			nodeCrypto
				.createHash("sha256")
				.update(data)
				.digest(opts?.encoding === "hex" ? "hex" : "base64"),
		randomUUID: () => nodeCrypto.randomUUID(),
	}
})

jest.mock("expo-localization", () => ({
	getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
	getCalendars: () => [{ timeZone: "Europe/Istanbul" }],
}))

jest.mock("expo-location", () => ({
	Accuracy: { Balanced: 3, Low: 2 },
	PermissionStatus: { GRANTED: "granted", DENIED: "denied", UNDETERMINED: "undetermined" },
	getForegroundPermissionsAsync: jest.fn(async () => ({ status: "undetermined", canAskAgain: true })),
	requestForegroundPermissionsAsync: jest.fn(async () => ({ status: "denied", canAskAgain: false })),
	getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 40.7655, longitude: 29.9408 } })),
	getLastKnownPositionAsync: jest.fn(async () => null),
}))

jest.mock("@react-native-community/netinfo", () => ({
	__esModule: true,
	default: {
		addEventListener: jest.fn(() => () => {}),
		fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
	},
	addEventListener: jest.fn(() => () => {}),
	useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}))

jest.mock("expo-haptics", () => ({
	impactAsync: jest.fn(),
	selectionAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: "light" },
}))

// MMKV mocks itself under Jest, but its factory module still imports nitro at load time.
jest.mock("react-native-nitro-modules", () => ({
	NitroModules: { createHybridObject: jest.fn(), box: jest.fn() },
	getHybridObjectConstructor: jest.fn(),
}))
