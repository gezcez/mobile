# Google Play Data safety answers

Source: plan 15.4 and the code (see app-privacy.md). Keep both files in step.

## Overview

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | Yes (collects; shares nothing) |
| Is all of the user data collected by your app encrypted in transit? | Yes (HTTPS only, no cleartext) |
| Do you provide a way for users to request that their data is deleted? | Yes: in the app (Me, Privacy centre, Delete my data) and on the web at https://oauth.gezcez.com/account/privacy/delete |
| Has your app been independently validated against a global security standard? | No |
| Does the app contain ads? | No |
| Target audience | 13+ (general audience, not directed at children) |

Data is **shared** with no third party. Sentry processes crash reports as a service provider
(processing on our behalf is not "sharing" under Play's definition).

## Data types

| Category / type | Collected | Shared | Processed ephemerally | Required or optional | Purposes |
|---|---|---|---|---|---|
| Personal info / Email address | Yes | No | No | Optional (only to sign in) | Account management, App functionality |
| Financial info / Other financial info (transit card number) | Yes | No | Yes (sent for the balance lookup, not stored) | Optional (only when adding a card) | App functionality |
| App activity / Other user-generated content (saved stops and lines) | Yes | No | No | Optional (sync needs an account) | App functionality |
| App activity / App interactions (aggregate counters) | Yes | No | No | Optional (switch in onboarding and Settings) | Analytics |
| App info and performance / Crash logs | Yes | No | No | Required when crash reporting is on | App functionality |
| App info and performance / Diagnostics | Yes | No | No | Required when crash reporting is on | App functionality |
| Location / Approximate or Precise | No | | | | Used on the device only; the fallback request rounds to about 100 m and is processed ephemerally and not stored, which Play does not count as collection when it is not stored or logged |
| Device or other IDs | No | | | | |

## Permissions declared in the manifest

`ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` (foreground only; background location, record
audio and overlay are blocked in `app.config.ts`), `INTERNET`. No background location
declaration is needed.
