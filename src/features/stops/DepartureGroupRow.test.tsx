import { fireEvent, render, screen } from "@testing-library/react-native"
import type { Departure } from "@/api/types"
import { i18n } from "@/i18n"
import { DepartureGroupRow } from "./DepartureGroupRow"
import { groupDepartures } from "./groupDepartures"

const NOW = Date.parse("2026-10-22T09:00:00Z")
const route = { id: "41265", networkId: "kocaeli-bus", shortName: "41C", longName: "Umuttepe - Merkez", mode: "bus" as const, color: "#d97706", textColor: "#ffffff" }
const dep = (minutes: number, extra: Partial<Departure> = {}): Departure => ({
	route,
	direction: 0,
	headsign: "Umuttepe",
	tripId: `t${minutes}`,
	scheduledAt: new Date(NOW + minutes * 60_000).toISOString(),
	predictedAt: null,
	vehicleId: null,
	stopsAway: null,
	source: "schedule",
	cancelled: false,
	...extra,
})

beforeAll(async () => {
	await i18n.changeLanguage("en")
})

describe("DepartureGroupRow", () => {
	it("shows the line, headsign and an accessible summary with live and cancelled times", async () => {
		const [group] = groupDepartures([dep(3, { source: "live", predictedAt: new Date(NOW + 4 * 60_000).toISOString() }), dep(15, { cancelled: true })])
		const onPress = jest.fn()
		await render(<DepartureGroupRow group={group!} nowMs={NOW} timeZone="Europe/Istanbul" onPress={onPress} />)
		expect(screen.getByText("41C")).toBeTruthy()
		const row = screen.getByRole("button")
		const label = row.props.accessibilityLabel as string
		expect(label).toContain("41C")
		expect(label).toContain("Umuttepe")
		expect(label).toContain(i18n.t("stop.a11yLive"))
		expect(label).toContain(i18n.t("stop.a11yCancelled"))
		await fireEvent.press(row)
		expect(onPress).toHaveBeenCalledTimes(1)
	})

	it("is not a button without onPress", async () => {
		const [group] = groupDepartures([dep(5)])
		await render(<DepartureGroupRow group={group!} nowMs={NOW} timeZone="Europe/Istanbul" />)
		expect(screen.queryByRole("button")).toBeNull()
		expect(screen.getAllByLabelText(/41C/).length).toBeGreaterThan(0)
	})
})
