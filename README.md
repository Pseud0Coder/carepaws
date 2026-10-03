# CarePaws

A mobile-first pet-care app.

- **Sign in** with a phone number (OTP), Google or email. Or choose **Just looking around** and skip setup entirely.
- **Pet parents** find verified local sitters, keep a **care sheet** for each pet, and sign **declarations** before every booking (health, behaviour, a pet-proofed home), so disputes start from a shared record.
- **Sitters** must pass **identity (KYC) verification** before they are listed, and can be **vouched for** by rescues and vets.
- **Stay log**: a shared, append-only record of photo updates, condition at drop-off and pick-up, and incidents, with one-tap **emergency help**.
- **Nearby**: anyone can find rescues, shelters and vet clinics near them and call them in one tap. An **emergency vet** shortcut lists 24×7 clinics first.
- **Rescues and clinics** have their own account type: a public listing with a phone number, and the ability to vouch for sitters they trust.
- **The Circle**: a community feed of tips, questions and stories, with **report and block**.
- **Account deletion** in the app, as Google Play requires.

It ships as an **Android app** (Capacitor) and as a **website** (Firebase Hosting) from the same code.

## How it fits together

```
Next.js 16 (static export → out/)
 ├─ Android app: Capacitor bundles out/ into an APK
 └─ Web: Firebase Hosting serves out/
        │
        ▼
Firebase
 ├─ Auth            phone (OTP), Google and email. Android: native SMS + Credential Manager; web: reCAPTCHA + popup
 ├─ Firestore       all app data, accessed directly from the client
 │                  └─ firestore.rules is the authorization layer (tested in tests/)
 ├─ Storage         profile photos, stay-log photos, and private ID documents (storage.rules)
 └─ Cloud Functions functions/: Razorpay payments, rating and vouch counts, KYC image purge, account deletion
```

There is no Next.js server. Security comes from Firestore rules, which:

- recompute every booking's price from the sitter's profile,
- allow only valid status changes (only the sitter accepts, nothing is completed unpaid),
- keep messages visible to the two participants only,
- stop users from setting their own `verified` badge or rating,
- let only **verified** rescues and clinics create a vouch, and only for a sitter, under their own name,
- keep people's phone numbers private (only rescue/vet listings may publish one),
- **refuse a booking** unless the sitter is KYC-verified, every declaration is affirmed at the current version, the care sheet says vaccinations are up to date, and an emergency limit and contact are given,
- let a sitter go live only after submitting verification, and never let a client set `verified` or `backgroundChecked`,
- make the **stay log append-only** (no edits, no deletes) and visible only to the two parties,
- let blocked people neither message nor book.

Only Cloud Functions can mark a booking paid, after verifying the Razorpay signature and re-fetching the payment.

### Data model

| Collection | Notes |
| --- | --- |
| `users/{uid}` | Public profile. `role` is `parent`, `sitter`, `rescue` or `vet`. Sitter fields: `services`, `petTypes`, `pricePerNight`… Rescue/vet fields: `phone`, `address`, `lat`/`lng`, `hours`, `open24x7`, `website`. System fields (clients can't write): `verified`, `rating`, `reviewCount`, `topRated`, `completedStays`, `vouchCount` |
| `vouches/{orgId}_{sitterId}` | A verified rescue/vet vouching for a sitter, with an optional note. One per pair |
| `users/{uid}/private/contact` | Email, phone, and the record that they confirmed they're 18+ and accepted the terms. Owner-only |
| `users/{uid}/blocked/{id}` | People this user has blocked. Other rules consult it |
| `kyc/{uid}` | A sitter's identity case: status, legal name, DOB, ID type, **last four characters only**, address, emergency contact, signed care standards, consent. Owner-readable; only an admin moves it past `submitted`. Images are in write-only Storage `kyc/{uid}/` |
| `pets/{id}` | Owner-only, with the care sheet (vaccinations, behaviour, medical, vet). Copied into bookings as a snapshot |
| `bookings/{id}` | `pending → confirmed → (paid) → completed`, or `declined` / `cancelled`. Carries the care sheet and the parent's signed declarations |
| `bookings/{id}/log/{id}` | The stay log. Append-only; photos in Storage `stays/{bookingId}/` |
| `reports/{id}` | User reports. Write-only for clients; admins read them |
| `reviews/{bookingId}` | One per completed stay |
| `conversations/{parentId_sitterId}/messages/{id}` | Chat |
| `posts/{id}/comments/{id}` | Community |

## Setup

1. **Firebase project.** Enable Authentication (**Phone**, Email/Password and Google), Firestore, Storage and Functions (Functions and production SMS need the Blaze plan).
2. **App config.** Copy `.env.example` to `.env.local` and fill it from Firebase console → Project settings → Your apps → Web app. `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` is under Authentication → Sign-in method → Google → Web SDK configuration.
3. **Android Firebase config.** Phone sign-in uses the native Firebase SDK, which needs `android/app/google-services.json`. In Firebase console → Project settings → Your apps, add an Android app (package `com.carepaws.app`), register the SHA-1 below, download `google-services.json` and put it in `android/app/` (it is git-ignored; CI writes it from a secret). The Gradle build refuses to run without it, because the app would crash at launch.
4. **Deploy rules, indexes and functions:**
   ```bash
   firebase functions:secrets:set RAZORPAY_KEY_ID
   firebase functions:secrets:set RAZORPAY_KEY_SECRET
   (cd functions && npm install)
   firebase deploy --only firestore,storage,functions
   ```
5. **Demo data (optional).** Uses the Admin SDK, so it needs a service account:
   ```bash
   cd functions && GOOGLE_APPLICATION_CREDENTIALS=key.json node seed.mjs --project <project-id>
   ```
   The seed creates **fictional** sitters, rescues and clinics. Their phone numbers are deliberately invalid placeholders (`+91 00000 000NN`), so a demo can never ring a real person. Remove it before launch.

### Sitter identity verification (KYC)

Sitters are **not listed and cannot be booked until you approve them**. In the app they verify a mobile number, give their legal name and date of birth, the ID type and the **last four characters** of the number (never the full number; Aadhaar must be a masked copy), photos of the ID and a selfie, an address (plus an address proof if the ID is a PAN card), an emergency contact, and agree to the care standards and a consent notice. A police clearance certificate is optional and earns a "Background checked" badge.

```bash
cd functions
node admin.mjs kyc-pending                          --project <id> --bucket <bucket>
node admin.mjs kyc-show    <uid> --out ./review     --project <id> --bucket <bucket>   # details + downloads the images
node admin.mjs kyc-approve <uid> [--background-checked] --project <id>
node admin.mjs kyc-reject  <uid> --reason "Selfie is too dark to match the ID photo"  --project <id>
node admin.mjs reports                              --project <id>                     # user reports
```

Check that the name and date of birth match, the selfie matches the ID photo, the document is genuine and unexpired, and the address matches. Delete downloaded files afterwards. Approval sets the sitter's `verified` flag; rejection shows your reason in the app and lets them resubmit.

**Data handling.** Documents go to private Storage that no client can read back. A scheduled function (`purgeKycImages`) deletes the images and personal details **30 days after a decision**, keeping only the outcome, ID type and last four characters. This follows UIDAI's guidance to accept masked Aadhaar and not to store the full number, and the DPDP Act's data-minimisation principle. See `docs/ROADMAP.md` for what is still needed before launch (automated verification, legal review).

### Phone sign-in notes

- **Web** uses Firebase's invisible reCAPTCHA. **Android** sends the SMS through the native Firebase SDK (no reCAPTCHA) and confirms the code with the JS SDK, so Firestore sees one signed-in user. Register your APK's SHA-1 and SHA-256 in Firebase for this to work.
- **Known limitation.** Google Play services sometimes verifies a number *instantly* without an SMS. In that case the native SDK gives the web layer no code to finish with, and the app asks the person to use Google or email instead. If this shows up in practice, add a Cloud Function that exchanges the native ID token for a custom token.
- **Cost.** SMS is billed beyond Firebase's free quota. Set an SMS region policy (Firebase console → Authentication → Settings) to the countries you serve, to limit abuse.

### Google Play checklist

- **Account deletion**: in-app (You → Delete my account) and a web page at `/legal/#deletion`. Put that URL in the Play Console's data-deletion field.
- **User-generated content**: in-app reporting and blocking exist; Play also asks that you moderate. Review reports regularly.
- **Data safety form**: you collect name, phone, email, approximate and precise location (only when used), photos, ID documents, and payment information (handled by Razorpay).
- Replace `NEXT_PUBLIC_SUPPORT_EMAIL`, and have the text in `src/app/legal/page.tsx` reviewed by a lawyer.

### Rescues, clinics and vouching

Anyone can sign up as a rescue/shelter or a vet clinic, but **nothing they publish goes live until you verify them**. This is deliberate: the directory carries emergency phone numbers, and a vouch is only worth something if a fake "clinic" can't hand them out.

```bash
cd functions
node admin.mjs pending  --project <project-id>          # who is waiting, with phone, address and website
node admin.mjs verify   <uid> --project <project-id>    # check them (call the number!), then approve
node admin.mjs unverify <uid> --project <project-id>    # also withdraws every vouch they gave
```

Sitters are verified through the KYC commands above, not `verify`. Run these with `GOOGLE_APPLICATION_CREDENTIALS=key.json` set.

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

**CI.** `.github/workflows/android.yml` builds the APK on every push to `main` and uploads it as a workflow artifact. Add the `NEXT_PUBLIC_*` values and `GOOGLE_SERVICES_JSON_BASE64` (the base64 of `google-services.json`) as repository secrets. For signed release APKs, also add `CAREPAWS_KEYSTORE_BASE64` and the three passwords as secrets.

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

Phone sign-in works in the Auth emulator (it prints the SMS code at `http://127.0.0.1:9099/emulator/v1/projects/demo-carepaws/verificationCodes`). The Storage emulator can't tell a new upload from an overwrite, so "photos can't be replaced" rests on the production rule `allow update, delete: if false`.

Checks:

```bash
npm run lint && npm run typecheck
npm run test:rules             # 85 security-rule tests (Firestore + Storage) on the emulator (needs firebase-tools)
```

## Design

The palette is called "Field & Hearth" and is drawn from natural materials: linen and oat surfaces, moss as the primary colour, clay as the warm accent, river stone for information, and honey for ratings. A faint paper grain keeps flat fills from looking plastic. Type pairs Fraunces (soft serif, for headings) with Manrope (body). Every screen has a dark theme, either following the system setting or chosen in the You tab. Tokens are in `src/app/globals.css`.
