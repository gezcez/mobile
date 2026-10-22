import { useTranslation } from "react-i18next"

/** t() typed over every namespace: "tabs.home" (mobile), "common:actions.retry", "errors:NOT_FOUND". */
export function useT() {
	return useTranslation(["mobile", "common", "errors"])
}
