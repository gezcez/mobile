/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, screen, waitFor } from "@testing-library/react-native"
import * as Location from "expo-location"
import { useCityStore } from "@/features/city/useCityStore"
import { usePrefsStore } from "@/features/settings/usePrefsStore"
import { i18n } from "@/i18n"
import { useLocationStore } from "@/lib/location"
import { router, setParams } from "@/test/router"
import { dropPath, hangPath, KOCAELI_FIX, renderScreen, setLanguage, setupScreenTests } from "@/test/screen"
import CityStep from "@/app/onboarding/city"
import Welcome from "@/app/onboarding/index"
import LocationStep from "@/app/onboarding/location"

jest.mock("expo-router", () => require("@/test/router").expoRouterMock)

setupScreenTests({ city: null })

beforeEach(() => {
	usePrefsStore.setState({ onboarded: false })
})

describe("onboarding: welcome", () => {
	it("shows the headline and bullets and goes to the location step", async () => {
		await renderScreen(<Welcome />)
		expect(screen.getByText("Every city's transit, one app.")).toBeTruthy()
		expect(screen.getByText("No account needed")).toBeTruthy()
		await fireEvent.press(screen.getByTestId("onboarding-start"))
		expect(router.push).toHaveBeenCalledWith("/onboarding/location")
	})

	it("switches the app to Turkish from the language toggle", async () => {
		await renderScreen(<Welcome />)
		await fireEvent.press(screen.getByText("Türkçe"))
		expect(usePrefsStore.getState().locale).toBe("tr")
		expect(await screen.findByText("Her şehrin ulaşımı, tek uygulamada.")).toBeTruthy()
		expect(screen.getByText("Başla")).toBeTruthy()
	})
})

describe("onboarding: location", () => {
	it("goes to the city picker when location is denied", async () => {
		await renderScreen(<LocationStep />)
		await fireEvent.press(screen.getByTestId("onboarding-allow-location"))
		await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: "/onboarding/city", params: { pick: "1" } }))
		expect(useLocationStore.getState().permission).toBe("denied")
	})

	it("takes a fix and goes to the detected city when location is granted", async () => {
		jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ status: "granted", canAskAgain: true } as never)
		await renderScreen(<LocationStep />)
		await fireEvent.press(screen.getByTestId("onboarding-allow-location"))
		await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: "/onboarding/city", params: {} }))
		await waitFor(() => expect(useLocationStore.getState().fix).not.toBeNull())
	})

	it("lets the rider choose a city without location", async () => {
		await renderScreen(<LocationStep />)
		await fireEvent.press(screen.getByTestId("onboarding-choose-city"))
		expect(router.push).toHaveBeenCalledWith({ pathname: "/onboarding/city", params: { pick: "1" } })
	})

	it("is translated in Turkish", async () => {
		await setLanguage("tr")
		await renderScreen(<LocationStep />)
		expect(screen.getByText("Yakınınızdaki durakları bulun")).toBeTruthy()
		expect(screen.getByText("Şehri kendim seçeyim")).toBeTruthy()
	})
})

describe("onboarding: city", () => {
	it("shows a loading state while cities load", async () => {
		hangPath(/^\/v1\/cities$/)
		await renderScreen(<CityStep />)
		expect(screen.getByText("Finding your city")).toBeTruthy()
		expect(screen.getByTestId("onboarding-city-start")).toBeDisabled()
	})

	it("shows the first-launch offline state and retries", async () => {
		dropPath(/^\/v1\/cities$/)
		await renderScreen(<CityStep />)
		expect(await screen.findByText("Gezcez needs a connection the first time.")).toBeTruthy()
		expect(screen.getByText("Try again")).toBeTruthy()
	})

	it("shows the first-launch offline state in Turkish", async () => {
		await setLanguage("tr")
		dropPath(/^\/v1\/cities$/)
		await renderScreen(<CityStep />)
		expect(await screen.findByText("Gezcez ilk açılışta internet bağlantısına ihtiyaç duyar.")).toBeTruthy()
		expect(screen.getByText("Tekrar dene")).toBeTruthy()
	})

	it("picks a city from the list and finishes onboarding", async () => {
		setParams({ pick: "1" })
		await renderScreen(<CityStep />)
		expect(await screen.findByText("Choose your city")).toBeTruthy()
		expect(screen.queryByText("We could not tell which city you are in. Choose one below.")).toBeNull()
		await fireEvent.press(screen.getByText("Bursa"))
		// The rider chose to pick: no "could not tell" line appears once they have picked.
		expect(screen.queryByText("We could not tell which city you are in. Choose one below.")).toBeNull()
		expect(screen.getByTestId("onboarding-city-start")).toBeEnabled()
		await fireEvent.press(screen.getByTestId("onboarding-city-start"))
		await waitFor(() => expect(usePrefsStore.getState().onboarded).toBe(true))
		expect(useCityStore.getState().cityId).toBe("bursa")
	})

	it("detects the city from the fix", async () => {
		useLocationStore.setState({ permission: "granted", fix: KOCAELI_FIX })
		await renderScreen(<CityStep />)
		expect(await screen.findByText("You are in Kocaeli.")).toBeTruthy()
		expect(screen.getByText("2 networks")).toBeTruthy()
		await fireEvent.press(screen.getByText("Choose another city"))
		expect(screen.getByText("Choose your city")).toBeTruthy()
	})

	it("says when the city could not be detected", async () => {
		useLocationStore.setState({ permission: "granted", fix: { lat: 0, lon: 0, accuracy: null, at: 0 } })
		await renderScreen(<CityStep />)
		expect(await screen.findByText("We could not tell which city you are in. Choose one below.")).toBeTruthy()
	})

	it("can skip the download and still finish", async () => {
		hangPath(/\/pack$/)
		useLocationStore.setState({ permission: "granted", fix: KOCAELI_FIX })
		await renderScreen(<CityStep />)
		await screen.findByText("You are in Kocaeli.")
		await fireEvent.press(screen.getByTestId("onboarding-city-start"))
		expect(await screen.findByText("DOWNLOADING STOPS AND ROUTES FOR KOCAELI")).toBeTruthy()
		await fireEvent.press(screen.getByText(i18n.t("common:actions.skip")))
		expect(usePrefsStore.getState().onboarded).toBe(true)
	})

	it("toggles anonymous usage counts", async () => {
		await renderScreen(<CityStep />)
		await fireEvent(screen.getByRole("switch"), "valueChange", false)
		expect(usePrefsStore.getState().analytics).toBe(false)
	})
})
