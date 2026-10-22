import { render, screen } from "@testing-library/react-native"
import { i18n } from "@/i18n"
import { Eyebrow } from "./Text"

describe("Eyebrow", () => {
	afterAll(async () => {
		await i18n.changeLanguage("en")
	})

	it("uppercases with English rules in English", async () => {
		await i18n.changeLanguage("en")
		await render(<Eyebrow>Downloading stops for Kocaeli</Eyebrow>)
		expect(screen.getByText("DOWNLOADING STOPS FOR KOCAELI")).toBeTruthy()
	})

	it("uppercases with Turkish rules in Turkish", async () => {
		await i18n.changeLanguage("tr")
		await render(<Eyebrow>Kocaeli için iniyor</Eyebrow>)
		expect(screen.getByText("KOCAELİ İÇİN İNİYOR")).toBeTruthy()
	})
})
