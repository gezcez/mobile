// useCardsAvailability.ts
// Cards are shown only when the remote `cards` kill switch is on and at least one enabled network
// of the current city has the `card` capability (plan 5.11).

import { useAppConfig, useCurrentNetworks } from "@/features/network/hooks"
import { cardCapableNetworks } from "./model"

export function useCardsAvailability() {
	const config = useAppConfig()
	const { networks, all } = useCurrentNetworks()
	const killed = config.data?.killSwitches.cards === false
	const capable = cardCapableNetworks(networks)
	return { killed, capable, all, visible: !killed && capable.length > 0 }
}
