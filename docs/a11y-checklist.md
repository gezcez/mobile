# Accessibility checklist

Manual VoiceOver (iOS) and TalkBack (Android) pass, run once per milestone on a preview build, in
both light and dark mode and at the largest system font size. Plan section 11 is the source.
Automated: `eslint-plugin-react-native-a11y` (roles, states, actions, nested touchables) in `bun run lint`.

## Every screen

- [ ] The screen title is announced as a heading (`Heading` sets `accessibilityRole="header"`).
- [ ] The back button reads "Back" / "Geri".
- [ ] Every control has a role (button, tab, radio, switch, link) and a label from `src/i18n`.
- [ ] Icon-only buttons (`IconButton`) have a label; decorative icons are not focusable.
- [ ] Loading skeletons are hidden from the screen reader; errors are announced (`ErrorState` is an alert).
- [ ] Toasts are announced once and their action button is reachable.
- [ ] Touch targets are at least 44 pt / 48 dp (buttons, rows, chips with hit slop).
- [ ] At 200% font size nothing is cut off; dense rows cap at 1.6x and wrap.
- [ ] Colour is never the only carrier of meaning (live = dot + word, status = dot + label).
- [ ] Contrast: text on cream, navy, amber and route colours meets WCAG AA (route badges correct text colour).

## Screens covered by the M6 pass (labels and roles only)

| Screen | Checks |
|---|---|
| Onboarding welcome, location, city | Logo reads "gezcez" as an image; language control is a tablist; progress is a polite live region |
| Me | Rows read title and subtitle; "Delete account" is reachable in one tap |
| Settings | Language and appearance are tablists with labels; switches read label and description |
| Privacy centre, Delete your data | Section headings; destructive buttons say what they delete; confirm dialog is native |
| About | Version line readable; developer unlock does not trap focus |
| Cards list | Each card reads "name, card ending 1234, balance ₺42,50, as of 08:10" |
| Add card | Network and card type are radio groups with checked state; number field reads its label and hint; validation error is a polite live region |
| Card detail | Balance, refresh, month switcher ("Previous month" / "Next month", next disabled on the current month), each transaction reads kind, line, amount and time |
| Network info, Alerts | Status has text, not only a dot; attribution readable |
| City sheet | Network switches read the network name |
| Force update | Heading, body, running version and the store button; no other route is reachable |
| OAuth callback | Spinner reads "Finishing sign-in" |

Map, live vehicles, stops, search, favourites and Home were built in M2 to M4 and are checked in
their own pass (map has a list alternative in its sheet; departure announcements are throttled).

## Platform specifics

- [ ] iOS: Turkish stop names inside English UI use `accessibilityLanguage="tr"` (`ListRow titleLanguage`).
- [ ] Android: TalkBack reads switches as "on/off", radio chips as "checked/not checked".
- [ ] Reduce Motion: no vehicle glide or pulse; sheets still usable.

## Sign-off

| Milestone | Date | Device / OS | Reader | Result |
|---|---|---|---|---|
| M6 | | | VoiceOver | |
| M6 | | | TalkBack | |
