// Fingerprint runtimeVersion settings (plan 7.4). The balanced preset plus the app config `extra`
// section: extra only carries JS-read values (variant, API hosts, the OTA `critical` marker), so
// changing it must not create a new runtime and strand installed binaries without updates.
/** @type {import('expo/fingerprint').Config} */
const config = {
	sourceSkips: [
		"PackageJsonAndroidAndIosScriptsIfNotContainRun",
		"ExpoConfigVersions",
		"ExpoConfigRuntimeVersionIfString",
		"EasJson",
		"Easignore",
		"AutolinkingConfigPaths",
		"ExpoConfigExtraSection",
	],
}

module.exports = config
