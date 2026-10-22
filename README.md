# gezcez mobile

The gezcez rider app for iOS and Android: nearby stops, live departures, live buses on a map,
saved stops and routes, for every city gezcez supports. Expo (managed, CNG), expo-router,
TypeScript strict, TanStack Query, zustand + MMKV, MapLibre.

This repo is standalone: no shared packages. Contracts with other repos are the backend's
`openapi.json` (`bun run api:gen`), the OAuth client integration contract (implemented in
`src/auth/`) and the brand tokens (`src/theme/tokens.ts`, same values as www).

## Run it

```sh
bun install
cp .env.example .env.local     # optional; EXPO_PUBLIC_MOCK=1 runs without a backend
```

MapLibre, MMKV and SecureStore are native modules, so the full app needs a **development build**
(Expo Go runs a reduced mode, see [Expo Go](#expo-go)):

```sh
APP_VARIANT=development bunx expo run:android   # or run:ios, needs Android Studio / Xcode
# or in the cloud:
bunx eas-cli build --profile development --platform android
# then start Metro (mock data, no backend):
bun run start:mock
```

| Variant | Name | Bundle id | Scheme | API |
|---|---|---|---|---|
| development | gezcez Dev | com.gezcez.app.dev | gezcez-dev | staging or local |
| preview | gezcez Beta | com.gezcez.app.preview | gezcez-preview | staging |
| production | gezcez | com.gezcez.app | gezcez | api.gezcez.com |

## Scripts

| Script | What |
|---|---|
| `bun run typecheck` | `tsc --noEmit` (strict) |
| `bun run lint` | ESLint (expo, a11y, no literal UI strings in screens) |
| `bun run test` | Jest + React Native Testing Library |
| `bun run i18n:check` | tr/en key parity |
| `bun run api:gen` | regenerate `src/api/schema.gen.ts` from `API_SPEC` (default staging `openapi.json`) |
| `bun run api:check` | fail when `schema.gen.ts` drifted from the backend |
| `bunx expo export --platform android` | prove the JS bundle builds |

Endpoints the backend has not published yet are typed by hand in `src/api/schema.manual.ts`
(marked MANUAL); delete them there once `api:gen` brings them in.

The checked-in `schema.gen.ts` was generated from the backend-transit `rewrite-transit` branch's
`openapi.json` (`API_SPEC=../backend-transit/openapi.json bun run api:gen`). That export
publishes some nullable top-level fields as arrays; `src/api/types.ts` maps both forms.

## Expo Go

```sh
bun run start:go        # APP_VARIANT=development expo start --go, scan the QR code with Expo Go
bun run start:mock      # also works in Expo Go: mock data, demo sign-in, no backend
```

Expo Go has no MapLibre and no MMKV (Nitro), and it cannot open our `gezcez*://` schemes. The app
detects it (`Constants.executionEnvironment === "storeClient"`, `src/lib/expoGo.ts`) and degrades
instead of crashing:

| | Dev / store build | Expo Go |
|---|---|---|
| Storage (`src/lib/storage.ts`) | MMKV | Map in memory (`src/lib/kv.ts`); the default instance writes through to AsyncStorage, so prefs, city, favourites and recent searches survive a reload. The query cache and card numbers stay in memory only. |
| Maps (`src/features/map/TransitMap.tsx`, `layers.tsx`) | MapLibre | A placeholder card; layers render nothing. MapLibre is never loaded. Sheets, lists and departures still work. |
| Sign-in (`src/auth/redirect.ts`) | variant client, `<scheme>://oauth/callback` | always `mobile-dev`, redirect from `makeRedirectUri()`: `exp://<lan-ip>:8081/--/oauth/callback` |
| API / OAuth hosts (`src/lib/env.ts`) | per variant | staging (where `mobile-dev` exists), unless `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_OAUTH_URL` are set |

Real sign-in from Expo Go needs the backend to accept the `exp://` redirect for `mobile-dev`. The
backend matches redirect URIs exactly (loopback `http://` ports are the only exception), and the
LAN IP in the Expo Go URI changes per machine and network, so the backend needs both:

1. `src/db/seed.ts`, `mobile-dev` client: add `"exp://127.0.0.1:8081/--/oauth/callback"` to
   `redirect_uris` (the redirect URI rules already accept custom schemes for native clients).
2. `src/services/oauth/oauth.utils.ts`, `matchRedirectUri`: for `dev` apps, let an `exp://` URI
   match a registered `exp://` URI with the same path whatever its host and port (the way loopback
   ports are matched today), so `exp://192.168.1.20:8081/--/oauth/callback` and tunnel hosts like
   `exp://abc-anonymous-8081.exp.direct/--/oauth/callback` are accepted.

Until then, sign-in from Expo Go stops at the authorize page with an invalid redirect URI error;
use `start:mock` or a development build. Anything else real (maps, encrypted card numbers,
release checks) needs the development build.

## Mock mode

`bun run start:mock` (`EXPO_PUBLIC_MOCK=1`) answers every REST endpoint and the realtime WS from
`src/mock/` (two cities, three networks, moving vehicles, departures, favourites, cards), and
sign-in returns a demo account. Tests use the same fixtures.

## Layout

| Path | What |
|---|---|
| `src/app/` | expo-router screens: tabs (Home, Map, Search, Saved, Me), stop, route, vehicle, city, onboarding, sheets |
| `src/api/` | openapi-fetch client, generated + manual schema, wire to domain mappers, query factories |
| `src/auth/` | OAuth 2.1 + PKCE client (token storage, refresh, step-up, middleware) |
| `src/live/` | realtime WS protocol v1, shared socket with backoff, vehicle feeds with REST fallback |
| `src/pack/` | offline network packs (stops, routes) with nearest-stop and search indexes |
| `src/features/` | screen building blocks per feature (map layers, favourites + sync, departures) |
| `src/theme/` | brand tokens (same values as www) and light/dark themes |
| `maestro/` | e2e flows, run by `.github/workflows/e2e.yml` against a mock-mode build |

## Release

`docs/release.md` is the runbook: variants and EAS profiles, fingerprint runtime versions, preview
and staged production OTAs, rollback, store builds and submit, force and soft updates. Store
listing drafts (tr/en), App Store privacy answers, Play Data safety answers and review notes are in
`docs/store/`. The manual screen reader pass is `docs/a11y-checklist.md`.

E2E: `maestro test maestro/flows` against a mock-mode build (`eas build --profile e2e`, or the
`e2e` workflow). Flows: onboarding, search to route, save stop, map, sign-in, settings, cards.
