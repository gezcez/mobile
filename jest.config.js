/** @type {import('jest').Config} */
module.exports = {
	preset: "jest-expo",
	setupFiles: ["<rootDir>/src/test/setup.ts"],
	setupFilesAfterEnv: ["<rootDir>/src/test/setup-after-env.ts"],
	testPathIgnorePatterns: ["/node_modules/", "/dist/", "/maestro/"],
	transformIgnorePatterns: [
		"node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native|@maplibre/.*|@gorhom/.*|@shopify/flash-list|kdbush|geokdbush|tinyqueue|openapi-fetch|react-native-mmkv|react-native-nitro-modules))",
	],
	moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
}
