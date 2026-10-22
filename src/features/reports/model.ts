// model.ts
// Community reports (mobile.md L6): what can be reported on which screen, the form draft, its
// validation, and mapping submit errors (rate limit, sign-in, moderation) to what the form says.
// Reports reference stop, route or vehicle ids only, never the rider's coordinates.

import { errorCodeOf, isApiError } from "@/api/errors"
import type { W } from "@/api/wire"

/** Remote-config flag (GET /v1/app/config `flags`); absent means off. */
export const REPORTS_FLAG = "community_reports"

export type ReportKind = W["ReportInput"]["kind"]
export type ReportTargetType = W["ReportInput"]["ref"]["type"]
export type CrowdingLevel = NonNullable<W["ReportInput"]["crowding"]>
export type StopIssue = NonNullable<W["ReportInput"]["issue"]>
export type ReportStatus = W["Report"]["status"]

export const CROWDING_LEVELS: CrowdingLevel[] = ["low", "medium", "high", "full"]
export const STOP_ISSUES: StopIssue[] = ["damaged", "shelter", "sign", "accessibility", "dirty", "other"]
export const DELAY_OPTIONS = [5, 10, 15, 30] as const
export const TEXT_MAX = 280
/** "Other" stop issues need a few words so a moderator can act on them. */
export const OTHER_TEXT_MIN = 10

/** Crowding needs a vehicle or a line; stop issues only make sense at a stop. */
export const KINDS_FOR: Record<ReportTargetType, ReportKind[]> = {
	stop: ["delay", "stop_issue", "crowding"],
	vehicle: ["crowding", "delay"],
	route: ["crowding", "delay"],
}

export interface ReportTarget {
	type: ReportTargetType
	networkId: string
	id: string
	label?: string
}

export interface ReportDraft {
	kind: ReportKind
	crowding: CrowdingLevel | null
	delayMin: number | null
	issue: StopIssue | null
	text: string
}

export interface Report {
	id: string
	kind: ReportKind
	target: ReportTarget
	status: ReportStatus
	createdAt: string
	crowding: CrowdingLevel | null
	delayMin: number | null
	issue: StopIssue | null
	text: string | null
}

export interface VehicleCrowding {
	level: CrowdingLevel
	reports: number
	windowMin: number
	updatedAt: string
}

export function emptyDraft(target: ReportTargetType, kind?: ReportKind): ReportDraft {
	const kinds = KINDS_FOR[target]
	return { kind: kind && kinds.includes(kind) ? kind : kinds[0]!, crowding: null, delayMin: null, issue: null, text: "" }
}

export type DraftField = "crowding" | "delayMin" | "issue" | "text" | "kind"
export type DraftError = "required" | "tooLong" | "tooShort" | "outOfRange" | "notAllowed"

export type Validation =
	| { ok: true; body: W["ReportInput"] }
	| { ok: false; errors: Partial<Record<DraftField, DraftError>> }

/** Checks a draft for a target and builds the request body. Text is trimmed and collapsed. */
export function validateReport(target: ReportTarget, d: ReportDraft): Validation {
	const errors: Partial<Record<DraftField, DraftError>> = {}
	const text = d.text.replace(/\s+/g, " ").trim()
	if (!KINDS_FOR[target.type].includes(d.kind)) errors.kind = "notAllowed"
	if (d.kind === "crowding" && !d.crowding) errors.crowding = "required"
	if (d.kind === "delay") {
		if (d.delayMin == null) errors.delayMin = "required"
		else if (!Number.isInteger(d.delayMin) || d.delayMin < 1 || d.delayMin > 120) errors.delayMin = "outOfRange"
	}
	if (d.kind === "stop_issue") {
		if (!d.issue) errors.issue = "required"
		else if (d.issue === "other" && text.length < OTHER_TEXT_MIN) errors.text = text ? "tooShort" : "required"
	}
	if ([...text].length > TEXT_MAX) errors.text = "tooLong"
	if (Object.keys(errors).length > 0) return { ok: false, errors }

	const body: W["ReportInput"] = { kind: d.kind, ref: { type: target.type, network_id: target.networkId, id: target.id } }
	if (d.kind === "crowding") body.crowding = d.crowding!
	if (d.kind === "delay") body.delay_min = d.delayMin!
	if (d.kind === "stop_issue") body.issue = d.issue!
	if (text) body.text = text
	return { ok: true, body }
}

export type SubmitProblem =
	| { kind: "rate_limited"; retryAt: number }
	| { kind: "sign_in" }
	| { kind: "banned" }
	| { kind: "invalid" }
	| { kind: "offline" }
	| { kind: "unavailable" }
	| { kind: "other" }

/** Fallback wait when a 429 has no `details.retry_after` (backend preset `reports`: per hour). */
export const DEFAULT_RETRY_AFTER_S = 15 * 60

/** Reads `details.retry_after` (seconds) defensively; the backend sends it on every 429. */
export function retryAfterSeconds(e: unknown): number {
	const raw = isApiError(e) ? e.details?.retry_after : undefined
	const n = typeof raw === "string" ? Number(raw) : raw
	return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.ceil(n) : DEFAULT_RETRY_AFTER_S
}

export function submitProblem(e: unknown, nowMs: number): SubmitProblem {
	switch (errorCodeOf(e)) {
		case "RATE_LIMITED":
			return { kind: "rate_limited", retryAt: nowMs + retryAfterSeconds(e) * 1000 }
		case "AUTH_REQUIRED":
		case "AUTH_SESSION_REQUIRED":
		case "AUTH_TOKEN_INVALID":
		case "AUTH_TOKEN_EXPIRED":
		case "AUTH_SESSION_REVOKED":
		case "SCOPE_MISSING":
			return { kind: "sign_in" }
		case "USER_BANNED":
			return { kind: "banned" }
		case "VALIDATION_FAILED":
		case "NOT_FOUND":
			return { kind: "invalid" }
		case "NETWORK":
			return { kind: "offline" }
		case "PROVIDER_DISABLED":
		case "CAPABILITY_UNSUPPORTED":
			return { kind: "unavailable" }
		default:
			return { kind: "other" }
	}
}

/** Whole minutes left until `retryAt`, at least 1 while still blocked, 0 once it has passed. */
export function minutesLeft(retryAt: number | null, nowMs: number): number {
	if (retryAt == null || retryAt <= nowMs) return 0
	return Math.max(1, Math.ceil((retryAt - nowMs) / 60_000))
}

export function toReport(w: W["Report"]): Report {
	return {
		id: w.id,
		kind: w.kind,
		target: { type: w.ref.type, networkId: w.ref.network_id, id: w.ref.id, ...(w.label ? { label: w.label } : {}) },
		status: w.status,
		createdAt: w.created_at,
		crowding: w.crowding ?? null,
		delayMin: w.delay_min ?? null,
		issue: w.issue ?? null,
		text: w.text ?? null,
	}
}

export function toVehicleCrowding(w: W["VehicleCrowding"]): VehicleCrowding | null {
	if (!w || !CROWDING_LEVELS.includes(w.level) || w.reports < 1) return null
	return { level: w.level, reports: w.reports, windowMin: w.window_min, updatedAt: w.updated_at }
}
