import type { ComponentRef, Ref } from "react"
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native"
import { useTheme } from "@/theme/theme"
import { Text } from "./Text"

export interface TextFieldProps extends TextInputProps {
	label?: string
	hint?: string
	error?: string | null
	ref?: Ref<ComponentRef<typeof TextInput>>
}

export function TextField({ label, hint, error, style, ref, ...rest }: TextFieldProps) {
	const t = useTheme()
	return (
		<View style={styles.wrap}>
			{label ? <Text variant="caption" color="inkMuted">{label}</Text> : null}
			<TextInput
				ref={ref}
				accessibilityLabel={label}
				accessibilityHint={hint}
				placeholderTextColor={t.colors.inkSubtle}
				selectionColor={t.colors.accent}
				style={[
					styles.input,
					t.typography.body,
					{
						color: t.colors.ink,
						backgroundColor: t.colors.surface,
						borderColor: error ? t.colors.danger : t.colors.borderStrong,
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
})
