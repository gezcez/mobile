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

MapLibre, MMKV and SecureStore are native modules, so the app needs a **development build**, not
Expo Go:

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

Expo Go can open the JS but not the screens that matter: it lacks the MapLibre native module
(map, route and group maps), and MMKV (persisted stores and the query cache). SecureStore works
there but the OAuth redirect scheme does not. Use a development build for anything real.

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
