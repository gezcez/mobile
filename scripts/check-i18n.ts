// check-i18n.ts
// tr/en key parity for every namespace (the typed tr catalogs catch most of this at compile time;
// this also catches plural suffixes and empty strings).

import { resources } from "../src/i18n/resources"

type Tree = { [k: string]: string | Tree }

function keys(tree: Tree, prefix = ""): Map<string, string> {
	const out = new Map<string, string>()
	for (const [k, v] of Object.entries(tree)) {
		const key = prefix ? `${prefix}.${k}` : k
		if (typeof v === "string") out.set(key, v)
		else for (const [kk, vv] of keys(v, key)) out.set(kk, vv)
	}
	return out
}

/** Keys whose value is the bare brand name (chrome), exempt from the sentence-start rule. */
const BRAND_KEYS = new Set(["common:appName", "mobile:me.about"])

let failed = false
function fail(msg: string) {
	failed = true
	console.error(msg)
}
for (const ns of Object.keys(resources.en) as (keyof typeof resources.en)[]) {
	const en = keys(resources.en[ns] as unknown as Tree)
	const tr = keys(resources.tr[ns] as unknown as Tree)
	for (const k of en.keys()) if (!tr.has(k)) fail(`tr is missing ${ns}:${k}`)
	for (const k of tr.keys()) if (!en.has(k)) fail(`en is missing ${ns}:${k}`)
	for (const [lang, map] of [["en", en], ["tr", tr]] as const)
		for (const [k, v] of map) {
			if (!v.trim()) fail(`${lang} has an empty string at ${ns}:${k}`)
			// "Gezcez" at the start of a sentence, "gezcez" in chrome (ux-review X5).
			if (/^gezcez\b(?!\.)/.test(v) && !BRAND_KEYS.has(`${ns}:${k}`)) fail(`${lang} ${ns}:${k} starts a sentence with "gezcez"; write "Gezcez"`)
		}
}
if (failed) process.exit(1)
console.log("i18n catalogs match.")
