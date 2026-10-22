import { fireEvent, render, screen } from "@testing-library/react-native"
import { Pressable, Text } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { i18n } from "@/i18n"
import { DragList } from "./DragList"

beforeAll(async () => {
	await i18n.changeLanguage("en")
})

const items = ["Otogar", "Gar", "Umuttepe"]

async function setup() {
	const onMove = jest.fn()
	await render(
		<GestureHandlerRootView>
			<DragList
				items={items}
				keyOf={(x) => x}
				labelOf={(x) => x}
				onMove={onMove}
				renderItem={(x, _i, handle, a11y) => (
					<Pressable accessibilityRole="button" accessibilityLabel={x} {...a11y}>
						<Text>{x}</Text>
						{handle}
					</Pressable>
				)}
			/>
		</GestureHandlerRootView>,
	)
	return onMove
}

describe("DragList", () => {
	it("offers move actions to screen readers, only where a move is possible", async () => {
		await setup()
		const names = (label: string) =>
			(screen.getByLabelText(label).props.accessibilityActions as { name: string }[]).map((a) => a.name)
		expect(names("Otogar")).toEqual(["moveDown"])
		expect(names("Gar")).toEqual(["moveUp", "moveDown"])
		expect(names("Umuttepe")).toEqual(["moveUp"])
	})

	it("moves a row with the accessibility action", async () => {
		const onMove = await setup()
		await fireEvent(screen.getByLabelText("Gar"), "accessibilityAction", {
			nativeEvent: { actionName: "moveUp" },
		})
		expect(onMove).toHaveBeenCalledWith(1, 0)
	})

	it("hides the touch grip from screen readers", async () => {
		await setup()
		expect(screen.queryByLabelText("Reorder Gar")).toBeNull()
		expect(screen.getByLabelText("Reorder Gar", { includeHiddenElements: true })).toBeTruthy()
	})
})
