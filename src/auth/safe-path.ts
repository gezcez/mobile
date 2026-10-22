// safeInternalPath (oauth.md 9.3, vector 5): only same-app absolute paths survive; anything that could
// leave the app or be read as a scheme or protocol-relative URL becomes "/".

export function safeInternalPath(input: string | null | undefined): string {
	if (!input) return "/"
	let decoded = input
	try {
		decoded = decodeURIComponent(input)
	} catch {
		return "/"
	}
	for (const s of [input, decoded]) {
		if (!s.startsWith("/")) return "/"
		if (s.startsWith("//") || s.startsWith("/\\")) return "/"
		if (/[\u0000-\u001f]/.test(s)) return "/"
	}
	return input
}
