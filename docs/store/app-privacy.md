# App Store privacy ("nutrition label") answers

Source: plan 15.4 and what the code does (src/lib/telemetry.ts, src/lib/sentry.ts,
src/features/cards, src/auth). Re-check whenever any of those change. Card numbers are declared
conservatively; reconsider with counsel.

**Do you or your third-party partners collect data from this app?** Yes.
**Tracking (App Tracking Transparency):** No data is used to track. No ATT prompt.

| Data type | Collected | Linked to the user | Used for tracking | Purposes | Notes |
|---|---|---|---|---|---|
| Contact info: Email address | Yes, only for account holders | Yes | No | App Functionality | Sign-in through the gezcez account pages |
| User content: Other user content | Yes, only for account holders | Yes | No | App Functionality | Saved stops and lines (favourites sync) |
| Financial info: Other financial info | Yes | No | No | App Functionality | Transit card number, sent in a POST body for the balance lookup, not stored by gezcez |
| Location: Precise / Coarse | **No** | | | | Processed on the device. The fallback nearby request sends a position rounded to about 100 m that is not stored or logged (privacy policy says so). If the backend ever stores it, this answer changes |
| Usage data: Product interaction | Yes | No | No | Analytics | Daily counters per city and app version, no IDs; opt-out in Settings |
| Diagnostics: Crash data | Yes | No | No | App Functionality | Sentry, no PII, scrubbed (no card numbers, coordinates, emails, query strings, request bodies) |
| Diagnostics: Performance data | Yes | No | No | App Functionality | Sentry traces at 5% |
| Identifiers (User ID, Device ID) | No | | | | No advertising ID, no device ID, no session ID in telemetry |
| Contacts, Health, Browsing history, Search history, Sensitive info, Purchases, Audio, Photos | No | | | | Search history stays on the device |

Privacy policy URL: https://gezcez.com/privacy

Account deletion (guideline 5.1.1(v)): in the app at Me, Delete account (one tap to
`https://oauth.gezcez.com/account/privacy/delete`), and Me, Privacy centre, Delete my data.
