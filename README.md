# CarePaws

A mobile-first pet-sitting app. Pet parents find verified local sitters, request stays, chat and pay. Sitters manage requests, earnings and reviews. A community feed ("the Circle") shares tips and stories.

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
- stop users from setting their own `verified` badge or rating.

Only Cloud Functions can mark a booking paid, after verifying the Razorpay signature and re-fetching the payment.

### Data model

| Collection | Notes |
| --- | --- |
| `users/{uid}` | Public profile. Sitter fields: `services`, `petTypes`, `pricePerNight`… System fields: `verified`, `rating`, `reviewCount`, `topRated`, `completedStays` |
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
npm run test:rules             # Firestore security-rule tests on the emulator (needs firebase-tools)
```

## Design

The palette is called "Field & Hearth" and is drawn from natural materials: linen and oat surfaces, moss as the primary colour, clay as the warm accent, river stone for information, and honey for ratings. A faint paper grain keeps flat fills from looking plastic. Type pairs Fraunces (soft serif, for headings) with Manrope (body). Every screen has a dark theme, either following the system setting or chosen in the You tab. Tokens are in `src/app/globals.css`.
