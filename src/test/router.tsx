// router.tsx
// A stand-in for expo-router in screen tests: a spy router, settable route params and the hooks the
// screens use. Use it with
//   jest.mock("expo-router", () => require("@/test/router").expoRouterMock)
// and set params with setParams() before rendering.
/* eslint-disable @typescript-eslint/no-require-imports */

import { useEffect, type ReactNode } from "react"

export const router = {
	push: jest.fn(),
	replace: jest.fn(),
	navigate: jest.fn(),
	back: jest.fn(),
	dismiss: jest.fn(),
	dismissTo: jest.fn(),
	dismissAll: jest.fn(),
	setParams: jest.fn(),
	canGoBack: jest.fn(() => true),
}

let params: Record<string, string | undefined> = {}

export function setParams(p: Record<string, string | undefined>) {
	params = p
}

export function resetRouter() {
	params = {}
	for (const fn of Object.values(router)) fn.mockClear()
	router.canGoBack.mockImplementation(() => true)
}

function Passthrough({ children }: { children?: ReactNode }) {
	return <>{children}</>
}
const StackLike = Object.assign(Passthrough, { Screen: () => null, Protected: Passthrough })

export const expoRouterMock = {
	__esModule: true,
	router,
	useRouter: () => router,
	useLocalSearchParams: () => params,
	useGlobalSearchParams: () => params,
	useIsFocused: () => true,
	useFocusEffect: (cb: () => void | (() => void)) => useEffect(cb, [cb]),
	useNavigation: () => ({ setOptions: jest.fn(), addListener: () => () => undefined, isFocused: () => true }),
	usePathname: () => "/",
	useSegments: () => [],
	Stack: StackLike,
	Tabs: StackLike,
	Slot: Passthrough,
	Redirect: () => null,
	Link: ({ children }: { children?: ReactNode }) => {
		const { Text } = require("react-native")
		return <Text>{children}</Text>
	},
}
