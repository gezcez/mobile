// Expo default Metro config plus the Sentry serializer (debug ids for source maps).
// No workspace settings: this repo is standalone.
const { getSentryExpoConfig } = require("@sentry/react-native/metro")

module.exports = getSentryExpoConfig(__dirname)
