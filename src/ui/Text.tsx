import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native"
import { useTheme } from "@/theme/theme"
import type { ColorTokens, TypographyVariant } from "@/theme/tokens"

export interface TextProps extends RNTextProps {
	variant?: TypographyVariant
	color?: keyof ColorTokens
	align?: TextStyle["textAlign"]
	tabular?: boolean
}

/** Brand text. Font scaling stays on; dense rows cap at 1.6x (plan section 11). */
export function Text({ variant = "body", color = "ink", align, tabular, style, ...rest }: TextProps) {
	const t = useTheme()
	return (
		<RNText
			maxFontSizeMultiplier={1.6}
			{...rest}
			style={[
				t.typography[variant],
				{ color: t.colors[color] },
				align ? { textAlign: align } : null,
				tabular ? { fontVariant: ["tabular-nums"] } : null,
				style,
			]}
		/>
	)
}

export function Heading(props: Omit<TextProps, "variant"> & { level?: 1 | 2 | 3 }) {
	const { level = 2, ...rest } = props
	const variant = level === 1 ? "display" : level === 2 ? "title" : "heading"
	return <Text accessibilityRole="header" variant={variant} {...rest} />
}

/** Uppercase amber label above a title, the www section pattern ("NEARBY", "SAVED"). */
export function Eyebrow({ children, ...rest }: Omit<TextProps, "variant">) {
	const upper = typeof children === "string" ? children.toLocaleUpperCase("tr") : children
	return (
		<Text variant="eyebrow" color="eyebrow" {...rest}>
			{upper}
		</Text>
	)
}
