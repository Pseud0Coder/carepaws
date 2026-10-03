# CarePaws

A mobile-first pet-care app.

- **Pet parents** find verified local sitters, request stays, chat and pay.
- **Sitters** manage requests, earnings and reviews, and can be **vouched for** by rescues and vets.
- **Nearby**: anyone can find rescues, shelters and vet clinics near them and call them in one tap. An **emergency vet** shortcut lists 24×7 clinics first.
- **Rescues and clinics** have their own account type: a public listing with a phone number, and the ability to vouch for sitters they trust.
- **The Circle**: a community feed of tips, questions and stories.

It ships as an **Android app** (Capacitor) and as a **website** (Firebase Hosting) from the same code.

## How it fits together

```
Next.js 16 (static export → out/)
 ├─ Android app: Capacitor bundles out/ into an APK
 └─ Web: Firebase Hosting serves out/
        │
        ▼
Firebase
 ├─ Auth            email/password + Google (native Credential Manager on Android, popup on web)
 ├─ Firestore       all app data, accessed directly from the client
 │                  └─ firestore.rules is the authorization layer (tested in tests/)
 ├─ Storage         profile photos (storage.rules)
 └─ Cloud Functions functions/: Razorpay orders + payment verification, rating aggregates
```

There is no Next.js server. Security comes from Firestore rules, which:

- recompute every booking's price from the sitter's profile,
- allow only valid status changes (only the sitter accepts, nothing is completed unpaid),
- keep messages visible to the two participants only,
- stop users from setting their own `verified` badge or rating,
- let only **verified** rescues and clinics create a vouch, and only for a sitter, under their own name,
- keep people's phone numbers private (only rescue/vet listings may publish one).

Only Cloud Functions can mark a booking paid, after verifying the Razorpay signature and re-fetching the payment.

### Data model

| Collection | Notes |
| --- | --- |
| `users/{uid}` | Public profile. `role` is `parent`, `sitter`, `rescue` or `vet`. Sitter fields: `services`, `petTypes`, `pricePerNight`… Rescue/vet fields: `phone`, `address`, `lat`/`lng`, `hours`, `open24x7`, `website`. System fields (clients can't write): `verified`, `rating`, `reviewCount`, `topRated`, `completedStays`, `vouchCount` |
| `vouches/{orgId}_{sitterId}` | A verified rescue/vet vouching for a sitter, with an optional note. One per pair |
| `users/{uid}/private/contact` | Email and phone, owner-only |
| `pets/{id}` | Owner-only. Copied into bookings as a snapshot for the sitter |
| `bookings/{id}` | `pending → confirmed → (paid) → completed`, or `declined` / `cancelled` |
| `reviews/{bookingId}` | One per completed stay |
| `conversations/{parentId_sitterId}/messages/{id}` | Chat |
| `posts/{id}/comments/{id}` | Community |

## Setup

1. **Firebase project.** Enable Authentication (Email/Password and Google), Firestore, Storage and Functions (Functions needs the Blaze plan).
2. **App config.** Copy `.env.example` to `.env.local` and fill it from Firebase console → Project settings → Your apps → Web app. `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` is under Authentication → Sign-in method → Google → Web SDK configuration.
3. **Deploy rules, indexes and functions:**
   ```bash
   firebase functions:secrets:set RAZORPAY_KEY_ID
   firebase functions:secrets:set RAZORPAY_KEY_SECRET
   (cd functions && npm install)
   firebase deploy --only firestore,storage,functions
   ```
4. **Demo data (optional).** Uses the Admin SDK, so it needs a service account:
   ```bash
   cd functions && GOOGLE_APPLICATION_CREDENTIALS=key.json node seed.mjs --project <project-id>
   ```
   The seed creates **fictional** sitters, rescues and clinics. Their phone numbers are deliberately invalid placeholders (`+91 00000 000NN`), so a demo can never ring a real person. Remove it before launch.

### Rescues, clinics and vouching

Anyone can sign up as a rescue/shelter or a vet clinic, but **nothing they publish goes live until you verify them**. This is deliberate: the directory carries emergency phone numbers, and a vouch is only worth something if a fake "clinic" can't hand them out.

```bash
cd functions
node admin.mjs pending  --project <project-id>          # who is waiting, with phone, address and website
node admin.mjs verify   <uid> --project <project-id>    # check them (call the number!), then approve
node admin.mjs unverify <uid> --project <project-id>    # also withdraws every vouch they gave
```

Use the same `verify` command to give a sitter their "ID verified" badge. Run these with `GOOGLE_APPLICATION_CREDENTIALS=key.json` set.

- **Nearby** lists verified organisations only, sorted by distance when the user shares their location. Location is read on the device and never stored or sent; it is used only to compute distances. Organisations can pin their premises when they set up their listing.
- **Vouching.** A verified organisation opens a sitter's profile and taps *Vouch*. The sitter's profile then shows *Vouched by N* with each organisation (tap to open its listing), and search can filter to vouched sitters. Counts are kept up to date by the `onVouchWritten` Cloud Function; renaming an organisation updates its vouches, and un-verifying it removes them.
- **Scale note.** The directory loads every verified listing of a type and sorts on the device, which is fine for thousands. Past that, add geohash range queries.

### Google Sign-In on Android

Android sign-in uses Google Credential Manager, which checks the APK's signing certificate. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) for the same project:

1. Create an **Android** OAuth client with package `com.carepaws.app` and the SHA-1 below. Also add the SHA-1 to Firebase → Project settings → Android app.
2. Keep using the **Web** client ID as `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`, not the Android one.

Debug builds are signed with the committed key `android/keystores/carepaws-debug.keystore`, so every machine and CI run produces the same fingerprint:

```
SHA-1:   F3:EB:C9:79:5A:D2:86:C6:5E:37:76:11:35:28:34:46:65:E6:07:4F
SHA-256: 43:C2:45:EE:C0:F5:B1:22:F1:A8:C2:8D:42:6D:E7:92:26:26:4F:51:FB:62:63:08:65:4E:1C:F4:D6:A2:E7:C0
```

For release builds, register your release key's SHA-1 too, plus the Play App Signing key if you publish on Play.

## Building the APK

Requirements: Node 22, JDK 21, Android SDK (platform 36).

```bash
npm install
npm run android:apk            # → android/app/build/outputs/apk/debug/app-debug.apk
```

For a signed release build, set `CAREPAWS_KEYSTORE`, `CAREPAWS_KEYSTORE_PASSWORD`, `CAREPAWS_KEY_ALIAS` and `CAREPAWS_KEY_PASSWORD`, then run `npm run android:release`.

**CI.** `.github/workflows/android.yml` builds the APK on every push to `main` and uploads it as a workflow artifact. Add the `NEXT_PUBLIC_*` values as repository secrets. For signed release APKs, also add `CAREPAWS_KEYSTORE_BASE64` and the three passwords as secrets.

## Development

```bash
npm run dev                    # http://localhost:3000 against your Firebase project
```

To run fully offline against the emulators, set `NEXT_PUBLIC_USE_EMULATORS=1` in `.env.local`, then:

```bash
npm run emulators              # auth, firestore, storage, functions
npm run seed:emulator          # in another terminal (needs functions/node_modules)
npm run dev
```

Checks:

```bash
npm run lint && npm run typecheck
npm run test:rules             # 40 Firestore security-rule tests on the emulator (needs firebase-tools)
```

## Design

The palette is called "Field & Hearth" and is drawn from natural materials: linen and oat surfaces, moss as the primary colour, clay as the warm accent, river stone for information, and honey for ratings. A faint paper grain keeps flat fills from looking plastic. Type pairs Fraunces (soft serif, for headings) with Manrope (body). Every screen has a dark theme, either following the system setting or chosen in the You tab. Tokens are in `src/app/globals.css`.
