// normalise.ts
// Turkish-aware folding for search: lower-case with the Turkish locale (İ→i, I→ı), then fold the
// diacritics (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u) so "izmit", "İzmit" and "IZMIT" all match.

const FOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" }

export function fold(s: string): string {
	return s
		.toLocaleLowerCase("tr")
		.replace(/[çğıöşüâîû]/g, (c) => FOLD[c] ?? c)
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/\s+/g, " ")
		.trim()
}
