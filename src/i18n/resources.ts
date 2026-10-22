import { common as enCommon } from "./en/common"
import { errors as enErrors } from "./en/errors"
import { mobile as enMobile } from "./en/mobile"
import { common as trCommon } from "./tr/common"
import { errors as trErrors } from "./tr/errors"
import { mobile as trMobile } from "./tr/mobile"

export const resources = {
	en: { common: enCommon, mobile: enMobile, errors: enErrors },
	tr: { common: trCommon, mobile: trMobile, errors: trErrors },
} as const

export type AppLanguage = keyof typeof resources
export const LANGUAGES: AppLanguage[] = ["tr", "en"]
export const NAMESPACES = ["mobile", "common", "errors"] as const
