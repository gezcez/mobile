import "i18next"
import type { common } from "./en/common"
import type { errors } from "./en/errors"
import type { mobile } from "./en/mobile"

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "mobile"
		resources: { mobile: typeof mobile; common: typeof common; errors: typeof errors }
		returnNull: false
	}
}
