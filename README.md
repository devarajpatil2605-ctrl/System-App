# SHADOW SYSTEM: DEV

A mobile-first, Solo Leveling-inspired personal progression tracker for Dev. The UI uses original HUD styling and effects; it does not bundle copyrighted anime footage, official artwork, logos, or soundtrack recordings.

## Modules

- System dashboard: daily quests, unresolved quest prompt, calorie overview, due revision topics, body summary, and hunter score.
- Nutrition: calorie and macro diary, local starter foods, custom foods, search via Open Food Facts, optional USDA FoodData Central search, serving scaling, and available nutrient details.
- Revision: editable Subject → Heading → Topic hierarchy with configurable Day 1 / 3 / 7 / 14 / 30 / 90 spaced-repetition stages and per-topic notes/history.
- Body status: weight entries, goal settings, graph, and date-specific history.
- Quest board: recurring and one-time quests, persistent occurrences, completion history, and auditable XP ledger.
- Hunter status: E/D/C/B/A/S rank, consistency score, levels, milestones, and progression settings.
- Settings & portability: targets, thresholds, interval customisation, reminder settings, appearance, local JSON backup and restore.

## Data and nutrition sources

Essential tracker data is saved locally in the app's browser/WebView storage. Open Food Facts searches are performed only when you search and require an internet connection. USDA FoodData Central search is optional and requires an API key entered locally in Settings. Food values are reference data per 100 g and vary by preparation and product; missing nutrient values are not represented as zero. The included starter catalogue is small and is not a complete branded-food database.

## Build a web preview

Requires Node.js 20 or newer.

    npm install
    npm run build
    npm test
    npm run dev

## Build the Android APK

The repository's GitHub Actions workflow builds an Android debug APK using Capacitor. Open Actions → Build Shadow System Android APK and run the workflow if it is not already running. After success, download the shadow-system-dev-debug-apk artifact and extract app-debug.apk.

The automated build creates the Android wrapper, installs the Android SDK, syncs the Vite build into the native project, runs assembleDebug, and uploads the generated APK. A debug APK is suitable for installation after allowing app installs from the source used on your device; a signed release build requires a separate keystore configuration.

## Android notification caveats

The app uses Capacitor Local Notifications for native revision reminders. Delivery is subject to Android notification permission, device power-management rules, and alarm scheduling limits. In the app, grant notification permission from Settings. Browser notifications cannot guarantee background delivery.

## Privacy and assets

The core tracker does not require an account. No analytics or advertising SDKs are included. API keys entered in Settings are stored only in local app storage, not in source code. Use only food data and media assets whose licensing terms permit the intended use.

## Current verification

GitHub Actions runs a production web build, smoke-checks the generated assets, generates/syncs the Android wrapper, and builds the debug APK. Check the actual workflow run before treating the APK as delivered.
