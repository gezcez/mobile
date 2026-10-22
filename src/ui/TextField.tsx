import { useState, type ComponentRef, type Ref } from "react"
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

export interface TextFieldProps extends TextInputProps {
	label?: string
	hint?: string
	error?: string | null
	ref?: Ref<ComponentRef<typeof TextInput>>
}

/** Focused: a 2 pt border in the focus colour (ux-review M2); resting border at least 3:1. */
export function TextField({ label, hint, error, style, ref, onFocus, onBlur, ...rest }: TextFieldProps) {
	const t = useTheme()
	const [focused, setFocused] = useState(false)
	return (
		<View style={styles.wrap}>
			{label ? (
				<Text variant="label" importantForAccessibility="no">
					{label}
				</Text>
			) : null}
			<TextInput
				ref={ref}
				accessibilityLabel={label}
				accessibilityHint={hint}
				placeholderTextColor={t.colors.inkSubtle}
				selectionColor={t.colors.accent}
				onFocus={(e) => {
					setFocused(true)
					onFocus?.(e)
				}}
				onBlur={(e) => {
					setFocused(false)
					onBlur?.(e)
				}}
				style={[
					styles.input,
					t.typography.body,
					focused && styles.focused,
					{
						color: t.colors.ink,
						backgroundColor: t.colors.surface,
						borderColor: error ? t.colors.danger : focused ? t.colors.focus : t.colors.borderStrong,
					},
					style,
				]}
				{...rest}
			/>
			{error ? (
				<Text variant="caption" color="danger" accessibilityLiveRegion="polite">
					{error}
				</Text>
			) : hint ? (
				<Text variant="caption" color="inkSubtle">
					{hint}
				</Text>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { gap: 6 },
	input: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
	// One pt more border, one pt less padding: the text does not move on focus.
	focused: { borderWidth: 2, paddingHorizontal: 13, paddingVertical: 9 },
})
