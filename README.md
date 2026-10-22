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
