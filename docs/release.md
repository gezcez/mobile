# Release runbook

How gezcez mobile gets from `main` to riders (plan section 7.4 and 15). Commands run from the repo
root; CI runs the same commands in `.github/workflows/eas.yml`.

## Variants, profiles and channels

| Variant (`APP_VARIANT`) | EAS build profile | Update channel | Bundle id | Distribution |
|---|---|---|---|---|
| development | `development`, `development-simulator` | `development` | `com.gezcez.app.dev` | internal (dev client) |
| development + mock | `e2e` | `e2e` | `com.gezcez.app.dev` | internal APK / simulator, Maestro only |
| preview | `preview` | `preview` | `com.gezcez.app.preview` | internal APK / ad hoc, testers |
| production | `production` | `production` | `com.gezcez.app` | stores (AAB, App Store) |

`app.config.ts` picks name, ids, scheme, icon, OAuth client and API host from `APP_VARIANT`
(`src/test/appConfig.test.ts` locks this down). EAS owns build numbers (`appVersionSource: remote`,
`autoIncrement` on production). The marketing version is CalVer `YY.M.patch` in `app.config.ts`
and `package.json`; tag releases `v26.12.0`.

## Runtime versions

`runtimeVersion: { policy: "fingerprint" }`. The fingerprint hashes native inputs (native modules,
config plugins, permissions, icons, `app.config.ts` minus `version` and `extra`; see
`fingerprint.config.js`). An OTA update only reaches binaries with the same fingerprint, so a native
change can never land on an incompatible build. The `fingerprint` workflow writes on every PR
whether the fingerprint changed. Changed means: merge it, then ship a store build before relying
on OTAs for that code.

Check locally:

```sh
APP_VARIANT=production node_modules/.bin/fingerprint fingerprint:generate | head -c 200
```

## Everyday flow

1. PR: `ci` (typecheck, lint, i18n parity, jest, android export), `api-check`, `fingerprint`.
2. Merge to `main`: `eas` publishes an OTA to the **preview** channel and uploads source maps.
3. Testers on preview builds get it on their next cold start (`checkAutomatically: ON_LOAD`,
   `fallbackToCacheTimeout: 0`: launches never wait for the network).

## Production OTA (bug fixes, copy, styling, features already in the reviewed binary behind flags)

1. Actions, `eas`, action `production-update`, rollout `10`. Optional `critical` (riders see
   "An important fix is ready" with Restart; use only for crashes or data bugs).
2. Watch Sentry (release `com.gezcez.app@<version>+<build>`, dist = update id) for a few hours.
3. Action `rollout` with `50`, later `100`.
4. Undo: action `rollback` (`eas update:rollback --branch production`), or republish the previous
   commit. Kill switches in the dashboard (`cards`, `live_map`, provider `status: disabled`) are the
   faster first response for provider problems and need no update at all.

Do not OTA anything that changes what the app is (a new major feature, cards for a new provider):
that ships as a store build so review sees it (App Store 3.3.1 / 4.7).

## Store builds

```sh
bunx eas-cli build --profile production --platform all
bunx eas-cli submit --profile production --platform android --latest   # Play internal track, draft
bunx eas-cli submit --profile production --platform ios --latest       # TestFlight
```

or Actions, `eas`, action `build` then `submit`. Android goes to the internal track first and is
promoted by hand (internal, closed, production). iOS goes to TestFlight; external testers need Beta
App Review. Listing texts, privacy labels and review notes are in `docs/store/`.

## Force and soft updates

`GET /v1/app/config` returns `min_supported_version` and `soft_update_version` (dashboard settings).

- Raise `soft_update_version` after a store release: riders on older binaries get one toast per
  version with a store button.
- Raise `min_supported_version` only when old binaries would break (API removed): every route is
  replaced by the force update screen with a store button. The config is persisted, so it also
  applies offline after the first fetch.

## Secrets and variables (GitHub, EAS)

| Name | Where | Used by |
|---|---|---|
| `EXPO_TOKEN` | GitHub secret | all EAS jobs |
| `SENTRY_AUTH_TOKEN` | GitHub secret, EAS secret | source map upload |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `EAS_PROJECT_ID`, `IOS_APP_STORE_ID` | GitHub variables, EAS env | `app.config.ts` |
| `EXPO_PUBLIC_SENTRY_DSN` | EAS env (preview, production) | crash reporting (off when unset) |
| Play service account JSON, App Store Connect API key | EAS credentials | `eas submit` |

The `production` GitHub environment should require a reviewer, so production OTAs and submits
need a second click.

## Before each store release

- [ ] `bun run typecheck && bun run lint && bun run test && bunx expo export --platform android`
- [ ] Maestro flows green on the `e2e` build (`maestro test maestro/flows`)
- [ ] Manual VoiceOver/TalkBack pass (`docs/a11y-checklist.md`) for changed screens
- [ ] Version bumped (CalVer) in `app.config.ts` and `package.json`
- [ ] Store texts and privacy answers still true (`docs/store/`)
- [ ] After approval: raise `soft_update_version`, tag `vYY.M.patch`
