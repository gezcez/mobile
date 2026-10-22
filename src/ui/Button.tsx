import type { ReactNode } from "react"
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from "react-native"
import { useTheme } from "@/theme/theme"
import { touchTarget } from "@/theme/tokens"
import { Text } from "./Text"

export type ButtonVariant = "primary" | "secondary" | "accent" | "ghost" | "danger"

export interface ButtonProps extends Omit<PressableProps, "children"> {
	label: string
	variant?: ButtonVariant
	icon?: ReactNode
	loading?: boolean
	size?: "md" | "sm"
	fullWidth?: boolean
}

/** Pill buttons only. Primary is navy (light) or amber (dark); accent is the amber CTA. */
export function Button({
	label,
	variant = "primary",
	icon,
	loading,
	size = "md",
	fullWidth,
	disabled,
	style,
	...rest
}: ButtonProps) {
	const t = useTheme()
	const c = t.colors
	const fills: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
		primary: { bg: c.primary, fg: c.onPrimary },
		secondary: { bg: "transparent", fg: c.ink, border: c.secondaryBorder },
		accent: { bg: c.cta, fg: c.onCta },
		ghost: { bg: "transparent", fg: c.ink },
		danger: { bg: "transparent", fg: c.danger, border: c.danger },
	}
	const f = fills[variant]
	const height = size === "sm" ? 36 : touchTarget
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
			disabled={disabled || loading}
			hitSlop={size === "sm" ? 6 : 0}
			style={(state) => [
				styles.base,
				{
					minHeight: height,
					backgroundColor: f.bg,
					borderColor: f.border ?? "transparent",
					paddingHorizontal: size === "sm" ? 14 : 22,
					opacity: disabled ? 0.5 : state.pressed ? 0.85 : 1,
					alignSelf: fullWidth ? "stretch" : "flex-start",
				},
				typeof style === "function" ? style(state) : style,
			]}
			{...rest}
		>
			<View style={styles.row}>
				{loading ? <ActivityIndicator color={f.fg} size="small" /> : icon}
				<Text variant={size === "sm" ? "caption" : "bodyStrong"} style={{ color: f.fg }} numberOfLines={1}>
					{label}
				</Text>
			</View>
		</Pressable>
	)
}

/** Round icon-only button with an accessible label. */
export function IconButton({
	icon,
	label,
	variant = "ghost",
	style,
	...rest
}: Omit<PressableProps, "children"> & { icon: ReactNode; label: string; variant?: "ghost" | "surface" | "primary" }) {
	const t = useTheme()
	const bg = variant === "surface" ? t.colors.surface : variant === "primary" ? t.colors.primary : "transparent"
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			hitSlop={4}
			style={(state) => [
				styles.icon,
				{
					backgroundColor: bg,
					borderColor: variant === "surface" ? t.colors.border : "transparent",
					opacity: state.pressed ? 0.7 : 1,
				},
				typeof style === "function" ? style(state) : style,
			]}
			{...rest}
		>
			{icon}
		</Pressable>
	)
}

const styles = StyleSheet.create({
	base: {
		borderRadius: 999,
		borderWidth: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	row: { flexDirection: "row", alignItems: "center", gap: 8 },
	icon: {
		width: 44,
		height: 44,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: StyleSheet.hairlineWidth,
	},
})
