# I-Ingenuity Inspect

Expo / React Native field app for inspections and work orders. It talks to the I-Ingenuity Laravel API and stores downloaded work-order data in on-device SQLite.

This repo is **not** the API. Docker, MySQL, Redis, and Mailhog live in [`i-ingenuity-3`](../i-ingenuity-3).

Native modules (`expo-sqlite`, `expo-secure-store`, `react-native-pdf-renderer`, `expo-dev-client`) mean you need a **development build**. Expo Go will not run this app.

## Prerequisites

- Node.js 20+
- Xcode (iOS simulator) and/or Android Studio
- Docker, with the API stack running (see below)
- EAS CLI (`eas-cli` ≥ 18.1.0) for store / shared binaries — see [EAS](#eas-cloud-and-store-builds). Local Play AABs still need you logged into the Expo org.

## 1. Start the API

From the API repo:

```bash
cd ~/PhpstormProjects/i-ingenuity-3
docker compose up -d
```

On this machine the published ports are:

| Service | URL |
| --- | --- |
| API / web | http://localhost:8130 |
| Mailhog | http://localhost:8132 |

Seed once if you need a login:

```bash
docker compose exec app php artisan db:seed
```

Default account: `support@i-ingenuity.com` / `Password123!`

Password-reset and other outbound mail from the API show up in Mailhog. Follow the Local development section in `i-ingenuity-3/README.md` if the stack is not up yet.

## 2. Configure this app

```bash
cd ~/PhpstormProjects/i-ingenuity-inspect
cp .env.example .env
```

Edit `.env` if needed. Restart Metro after changing it.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Axios base URL (example: `http://localhost:8130/api/v1`) |
| `EXPO_PUBLIC_DEV_USER` | Optional. Prefills the login email |
| `EXPO_PUBLIC_DEV_USER_PASS` | Optional. Prefills the login password |

| Client | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| iOS simulator / Android emulator | `http://localhost:8130/api/v1` |
| Physical device on the same LAN | `http://<your-mac-lan-ip>:8130/api/v1` |
| Shared beta API | `https://beta.i-ingenuity.com/api/v1` |

## 3. Install and run

```bash
npm install
```

First time on a machine, build and install the native dev client:

```bash
npx expo run:ios
# or
npx expo run:android
```

That compiles **I-Ingenuity**, installs it on the simulator/emulator, and starts Metro. After that, day to day is:

```bash
npx expo start
```

Then open the **I-Ingenuity** app (not Expo Go).

`npx expo start` only starts the JS bundler. Pressing `i` will fall back to Expo Go if no development build is installed, and this project will not load there.

### Simulator

Use the **iPhone 16 Pro** (or whichever device `expo run:ios` booted). Ignore **iPhone 15 Pro — External Display** if it appears; that window is a blank extra screen. Turn it off with **I/O → External Displays → Off**.

On first open you may see **I-Ingenuity Development Build** with a green server and **Open in 'I-Ingenuity'?** Tap **Open**, or tap the green **I-Ingenuity** row.

### Physical iPhone

The simulator binary cannot be copied onto a real phone. Plug the phone in, enable Developer Mode, tap Trust, stay on the same Wi-Fi as the Mac, keep Metro running, then:

```bash
npx expo run:ios --device
```

Open **I-Ingenuity**, not Expo Go. Point `EXPO_PUBLIC_API_URL` at the Mac’s LAN IP, not `localhost`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Metro / Expo dev server |
| `npm run ios` | Build and launch the iOS dev client |
| `npm run android` | Build and launch the Android dev client |
| `npm run web` | Expo web (limited; this app is built for native) |
| `npm run lint` | ESLint |

Rebuild with `npx expo run:ios` / `run:android` when native code changes (new native module, `app.json` plugin, or a clean machine). JS-only work is Metro plus Fast Refresh.

## Day to day

1. `docker compose up -d` in `i-ingenuity-3` if the API is down
2. `npx expo start` in this repo
3. Open **I-Ingenuity** on the simulator
4. Log in with the seeded user (or whatever you put in `.env`)
5. Check Mailhog at http://localhost:8132 if you trigger mail from the API

## EAS (cloud and store builds)

Local `npx expo run:ios` / `run:android` does not need EAS. Store binaries do: we build them locally with `eas build --local` (see [Local store build](#local-store-build-current-process)) so we skip Expo’s queue, then upload the file by hand. Cloud `eas build` without `--local` is optional.

Store releases today are **Android** (Play Console). iOS ships later; we will need **App Store Connect** access and credentials before TestFlight or App Store uploads.

This app already belongs to the Expo org **i-ingenuity** (`owner` and `eas.projectId` in `app.json`). You must be a member of that org. Ask for an invite to your `@i-ingenuity.com` address if `eas project:info` fails.

### Log in

```bash
npm install -g eas-cli
eas login
```

Use the Expo account that accepted the org invite (for example `stu@i-ingenuity.com`), not a personal Expo account. Then:

```bash
eas whoami
eas project:info
```

`project:info` should resolve **I-Ingenuity** under owner **i-ingenuity**. Confirm the same in the browser: [expo.dev](https://expo.dev) → org **i-ingenuity** → project **i-ingenuity-inspect**.

You do not need `eas init`. Profiles live in `eas.json`.

### Profiles

| Profile | Purpose |
| --- | --- |
| `development` / `development-simulator` | Dev client, internal distribution (iOS simulator) |
| `qa` | Internal distribution, API `https://beta.i-ingenuity.com/api/v1` |
| `production` | Store build, same beta API URL for now, auto-increments version on Expo |

`qa` and `production` bake in `EXPO_PUBLIC_API_URL`; they do not use your local `.env`.

### Local store build (current process)

`npx expo run:android` / `run:ios` only produces a **debug** binary (for example `android/app/build/outputs/apk/debug/app-debug.apk`). Play Console will not accept that.

Store binaries are built with EAS **on this machine** (`--local`) so we skip Expo’s build queue. You still need `eas login` against the **i-ingenuity** org: that is how the CLI downloads the existing Play upload keystore. Do not generate a new keystore.

**Android (AAB)** — Android Studio / Android SDK + NDK installed, then:

```bash
eas build --platform android --profile production --local --output ./i-ingenuity-android.aab
```

QA / internal instead of production:

```bash
eas build --platform android --profile qa --local --output ./i-ingenuity-qa.aab
```

`--output` writes the `.aab` in the project root. Without it, EAS copies the artifact into the current directory with a generated name.

That AAB is what you upload by hand (see [Manual upload](#manual-upload)). Omit `--local` to build on Expo’s servers instead.

Do **not** run `./gradlew bundleRelease` in the generated `android/` folder unless the Play upload keystore is wired into Gradle. The default Expo `android/` project signs release with the **debug** key, which Play will reject.

**iOS (IPA)** — later, once we have App Store Connect details (Apple ID or API key, team `GQHFR8SLY2`). Needs Xcode, CocoaPods, and fastlane:

```bash
eas build --platform ios --profile production --local --output ./i-ingenuity-ios.ipa
```

### Cloud build and submit

Same profiles, but the compile happens on Expo (you wait in the queue, then download or submit from there):

```bash
eas build --profile qa --platform android
eas build --profile qa --platform ios

eas build --profile production --platform android
eas build --profile production --platform ios

eas submit --profile production --platform android
eas submit --profile production --platform ios
```

Production uses `"appVersionSource": "remote"` and `"autoIncrement": true`, so production EAS builds (local or cloud) bump the version on Expo. Debug binaries from `expo run:*` still use `version` in `app.json`.

You can also submit a local file: `eas submit --platform android --path ./i-ingenuity-android.aab`.

### Manual upload

Play Console / App Store Connect access is separate from the Expo org invite.

**Android (AAB)** — [Google Play Console](https://play.google.com/console)

You need to be on the I-Ingenuity Play developer account.

1. Open the app **I-Ingenuity** (package `com.iingenuity.iingenuityinspect`).
2. **Release → Production** (or **Testing → Internal testing** / **Closed testing** for a non-production track).
3. **Create new release** → upload `i-ingenuity-android.aab` (or whatever you passed to `--output`) → **Review release** → roll out.

A cloud EAS artifact is the same `.aab`, downloaded from the build page on [expo.dev](https://expo.dev).

**iOS (IPA)** — [App Store Connect](https://appstoreconnect.apple.com)

We will need App Store Connect access and signing details later (Apple Developer team membership, and an Apple ID or App Store Connect API key for EAS). Bundle ID is `com.iingenuity.iingenuityinspect`, team `GQHFR8SLY2`.

Once that is in place:

1. **Apps** → **I-Ingenuity**.
2. For TestFlight: **TestFlight** → wait for processing after upload, then add testers.
3. For a store release: **App Store** → the version → select the build → submit for review.

Upload the `.ipa` with [Transporter](https://apps.apple.com/app/transporter/id1450874784), Xcode Organizer (**Window → Organizer → Distribute App**), or `eas submit --platform ios --path ./i-ingenuity-ios.ipa`. A cloud EAS iOS artifact is an `.ipa` from the same Expo build page.
