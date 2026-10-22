// This repo's own ESLint flat config: eslint-config-expo, a11y, hooks, and a literal-string rule
// for screens and features (strings go through src/i18n, plan section 12).
const { defineConfig } = require("eslint/config")
const { fixupPluginRules } = require("@eslint/compat")
const expoConfig = require("eslint-config-expo/flat")
const prettier = require("eslint-config-prettier")
const a11y = require("eslint-plugin-react-native-a11y")
const reactNative = require("eslint-plugin-react-native")

module.exports = defineConfig([
	expoConfig,
	prettier,
	{
		ignores: ["dist/*", ".expo/*", "node_modules/*", "src/api/schema.gen.ts", "coverage/*"],
	},
	{
		plugins: { "react-native-a11y": fixupPluginRules(a11y) },
		rules: {
			"react-native-a11y/has-valid-accessibility-actions": "error",
			"react-native-a11y/has-valid-accessibility-role": "error",
			"react-native-a11y/has-valid-accessibility-state": "error",
			"react-native-a11y/has-valid-accessibility-value": "error",
			"react-native-a11y/no-nested-touchables": "error",
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			"no-console": ["warn", { allow: ["warn", "error"] }],
			"import/no-unresolved": "off",
		},
	},
	{
		files: ["src/app/**/*.tsx", "src/features/**/*.tsx"],
		plugins: { "react-native": fixupPluginRules(reactNative) },
		rules: {
			"react-native/no-raw-text": ["error", { skip: ["Text", "Heading", "Eyebrow"] }],
			"no-restricted-syntax": [
				"error",
				{
					selector: "JSXElement[openingElement.name.name=/^(Text|Heading|Eyebrow)$/] > JSXText[value=/[A-Za-zÇĞİÖŞÜçğıöşü]{2,}/]",
					message: "Use t() from react-i18next; no literal UI strings in screens or features.",
				},
				{
					selector: "JSXAttribute[name.name=/^(label|title|accessibilityLabel|accessibilityHint|placeholder)$/] > Literal[value=/[A-Za-z]{2,}/]",
					message: "Use t() from react-i18next; no literal UI strings in screens or features.",
				},
			],
		},
	},
	{
		files: ["**/*.test.ts", "**/*.test.tsx", "src/test/**", "src/mock/**", "scripts/**"],
		rules: { "no-restricted-syntax": "off", "react-native/no-raw-text": "off", "no-console": "off" },
	},
])
