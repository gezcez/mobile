// DragList.tsx
// A short list the rider reorders by dragging a handle (long press, then move). Rows can differ in
// height; the others slide aside while a row hovers. Screen reader users get "Move up" and "Move
// down" actions on each row instead, and Reduce Motion drops the slide animation. Meant for the
// Saved lists (tens of rows), so it renders every row; long lists stay on FlashList.

import * as Haptics from "expo-haptics"
import { GripVertical } from "lucide-react-native"
import { Fragment, useCallback, type ReactNode } from "react"
import { StyleSheet, View, type AccessibilityActionEvent, type AccessibilityActionInfo, type LayoutChangeEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { touchTarget } from "@/theme/tokens"
import { dragTarget, shiftFor } from "./dragTarget"
import { useReduceMotion } from "./LiveDot"

export interface DragRowA11y {
	accessibilityActions: AccessibilityActionInfo[]
	onAccessibilityAction: (e: AccessibilityActionEvent) => void
}

export function DragList<T>({
	items,
	keyOf,
	labelOf,
	renderItem,
	onMove,
	separator,
}: {
	items: readonly T[]
	keyOf: (item: T) => string
	/** Names the row in the handle's label ("Reorder Otogar"). */
	labelOf: (item: T) => string
	/** Render the row; put `handle` where the grip goes and spread `a11y` on the focusable row. */
	renderItem: (item: T, index: number, handle: ReactNode, a11y: DragRowA11y) => ReactNode
	onMove: (from: number, to: number) => void
	separator?: ReactNode
}) {
	const { t } = useT()
	const reduceMotion = useReduceMotion()
	const heights = useSharedValue<number[]>([])
	const active = useSharedValue(-1)
	const target = useSharedValue(-1)
	const dy = useSharedValue(0)

	const setHeight = useCallback(
		(i: number, h: number) => {
			const next = [...heights.get()]
			next[i] = h
			heights.set(next)
		},
		[heights],
	)
	const finish = useCallback(
		(from: number, to: number) => {
			if (from !== to) {
				void Haptics.selectionAsync().catch(() => undefined)
				onMove(from, to)
			}
		},
		[onMove],
	)

	return (
		<View>
			{items.map((item, i) => {
				const a11y: DragRowA11y = {
					accessibilityActions: [
						...(i > 0 ? [{ name: "moveUp", label: t("common:actions.moveUp") }] : []),
						...(i < items.length - 1 ? [{ name: "moveDown", label: t("common:actions.moveDown") }] : []),
					],
					onAccessibilityAction: (e) => {
						if (e.nativeEvent.actionName === "moveUp") onMove(i, i - 1)
						if (e.nativeEvent.actionName === "moveDown") onMove(i, i + 1)
					},
				}
				return (
					<Fragment key={keyOf(item)}>
						{i > 0 && separator ? separator : null}
						<DragRow
							index={i}
							heights={heights}
							active={active}
							target={target}
							dy={dy}
							reduceMotion={reduceMotion}
							onLayout={(e) => setHeight(i, e.nativeEvent.layout.height + (i > 0 && separator ? StyleSheet.hairlineWidth : 0))}
							onDrop={finish}
							render={(handle) => renderItem(item, i, handle, a11y)}
							handleLabel={t("saved.reorder", { label: labelOf(item) })}
						/>
					</Fragment>
				)
			})}
		</View>
	)
}

function DragRow({
	index,
	heights,
	active,
	target,
	dy,
	reduceMotion,
	onLayout,
	onDrop,
	render,
	handleLabel,
}: {
	index: number
	heights: SharedValue<number[]>
	active: SharedValue<number>
	target: SharedValue<number>
	dy: SharedValue<number>
	reduceMotion: boolean
	onLayout: (e: LayoutChangeEvent) => void
	onDrop: (from: number, to: number) => void
	render: (handle: ReactNode) => ReactNode
	handleLabel: string
}) {
	const theme = useTheme()
	const pan = Gesture.Pan()
		.activateAfterLongPress(250)
		.onStart(() => {
			active.set(index)
			target.set(index)
			dy.set(0)
		})
		.onUpdate((e) => {
			dy.set(e.translationY)
			target.set(dragTarget(heights.get(), index, e.translationY))
		})
		.onFinalize(() => {
			const from = active.get()
			const to = target.get()
			active.set(-1)
			target.set(-1)
			dy.set(0)
			if (from >= 0 && to >= 0) runOnJS(onDrop)(from, to)
		})

	const style = useAnimatedStyle(() => {
		if (active.get() === index)
			return { transform: [{ translateY: dy.get() }], zIndex: 2, backgroundColor: theme.colors.surface, opacity: 0.96 }
		const shift = active.get() < 0 ? 0 : shiftFor(index, active.get(), target.get(), heights.get()[active.get()] ?? 0)
		return { transform: [{ translateY: reduceMotion ? shift : withTiming(shift, { duration: 150 }) }], zIndex: 0, opacity: 1 }
	})

	const handle = (
		<GestureDetector gesture={pan}>
			<View
				accessible
				accessibilityRole="adjustable"
				accessibilityLabel={handleLabel}
				// Screen readers use the row's move actions; the grip is for touch.
				importantForAccessibility="no-hide-descendants"
				accessibilityElementsHidden
				style={styles.handle}
				hitSlop={8}
			>
				<GripVertical size={20} color={theme.colors.iconSubtle} />
			</View>
		</GestureDetector>
	)
	return (
		<Animated.View style={style} onLayout={onLayout}>
			{render(handle)}
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	handle: { width: 40, height: touchTarget, alignItems: "center", justifyContent: "center", marginRight: -8 },
})
