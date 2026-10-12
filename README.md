# CarePaws

A mobile-first pet-care app.

- **Sign in** with Google or email (a confirmed email address is required to finish setting up). Or choose **Just looking around** and skip setup entirely. Phone OTP is built but off until you move to a paid Firebase plan (see *Spark and Blaze*).
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
 ├─ Auth            Google and email (phone OTP is built, off on the free plan). Android: Credential Manager; web: popup
 └─ Firestore       all app data, including photos (small JPEGs stored as text), accessed directly from the client
                    └─ firestore.rules is the authorization layer (tested in tests/)

Not used on the free plan (kept in the repo, switched off): Cloud Storage, Cloud Functions, SMS sign-in.
```

There is no Next.js server. Security comes from Firestore rules, which:

- recompute every booking's price from the sitter's profile,
- allow only valid status changes (only the sitter accepts, and only the sitter completes a stay once it has ended),
- keep messages visible to the two participants only,
- stop users from setting their own `verified` badge or rating,
- let only **verified** rescues and clinics create a vouch, and only for a sitter, under their own name,
- keep people's phone numbers private (only rescue/vet listings may publish one),
- **refuse a booking** unless the sitter is KYC-verified, every declaration is affirmed at the current version, the care sheet says vaccinations are up to date, and an emergency limit and contact are given,
- let a sitter go live only after submitting verification, and never let a client set `verified` or `backgroundChecked`,
- make the **stay log append-only** (no edits, no deletes) and visible only to the two parties,
- let blocked people neither message nor book.

Payment is between the pet parent and the sitter (UPI or cash). The sitter records it as received; CarePaws never touches the money.

There are no Cloud Functions in the live set-up, so the public totals that people must not be able to fake (a sitter's rating and review count, stays completed, vouch count) are updated by the app in the **same batch** as the review, completion or vouch they count, and the rules check the arithmetic (new count = old + 1, new sum = old + the stars, average within rounding, a matching review/booking/vouch written in that batch). `tests/firestore.rules.test.mjs` covers each.

### Data model

| Collection | Notes |
| --- | --- |
| `users/{uid}` | Public profile. `role` is `parent`, `sitter`, `rescue` or `vet`. Sitter fields: `services`, `petTypes`, `pricePerNight`… Rescue/vet fields: `phone`, `address`, `lat`/`lng`, `hours`, `open24x7`, `website`. System fields (clients can't set them freely): `verified` and `backgroundChecked` (admin CLI only); `rating`, `ratingSum`, `reviewCount`, `topRated`, `completedStays`, `vouchCount` (only through the checked batches above). `photoURL` is a Google link or a small JPEG kept in the profile |
| `vouches/{orgId}_{sitterId}` | A verified rescue/vet vouching for a sitter, with an optional note. One per pair |
| `users/{uid}/private/contact` | Email, phone, and the record that they confirmed they're 18+ and accepted the terms. Owner-only |
| `users/{uid}/blocked/{id}` | People this user has blocked. Other rules consult it |
| `kyc/{uid}` | A sitter's identity case: status, legal name, DOB, ID type, **last four characters only**, address, emergency contact, signed care standards, consent. Owner-readable; only an admin moves it past `submitted`. The ID photos are in `kyc/{uid}/files/{name}`, which the owner can write but never read back; the admin CLI reads and deletes them |
| `pets/{id}` | Owner-only, with the care sheet (vaccinations, behaviour, medical, vet). Copied into bookings as a snapshot |
| `bookings/{id}` | `pending → confirmed → (paid) → completed`, or `declined` / `cancelled`. Carries the care sheet and the parent's signed declarations |
| `bookings/{id}/log/{id}` | The stay log. Append-only; photos in `bookings/{id}/photos/{photoId}` (small JPEGs as text) |
| `reports/{id}` | User reports. Write-only for clients; admins read them |
| `reviews/{bookingId}` | One per completed stay |
| `conversations/{parentId_sitterId}/messages/{id}` | Chat |
| `posts/{id}/comments/{id}` | Community |

## Setup

1. **Firebase project (free Spark plan is enough).** Enable Authentication (**Email/Password** and **Google**) and Firestore. Nothing else is needed. Under Authentication → Settings → Authorized domains, add the domain you host on.
2. **App config.** Copy `.env.example` to `.env.local` and fill it from Firebase console → Project settings → Your apps → Web app. `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` is under Authentication → Sign-in method → Google → Web SDK configuration.
3. **Android Firebase config.** Google sign-in on Android needs `android/app/google-services.json`. In Firebase console → Project settings → Your apps, add an Android app (package `com.carepaws.app`), register the SHA-1 below, download `google-services.json` and put it in `android/app/` (it is git-ignored; CI writes it from a secret). The Gradle build refuses to run without it, because the app would crash at launch.
4. **Deploy the rules and indexes** (and the website, if you host it on Firebase Hosting):
   ```bash
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore            # security rules + indexes
   npm run build && firebase deploy --only hosting
   ```
   Deploy the rules **before** anyone signs up: they are the only thing protecting the data.
5. **No demo data.** The app ships empty on purpose. Every account, listing and review in production is real. Never run any seeding against the production project. If you tried the app before launch, delete test users under Firebase console → Authentication.

### Spark and Blaze: what runs on the free plan

The app is built to run completely on Firebase's **free Spark plan**. These parts need the paid **Blaze** plan, so they ship switched off. The code for each is in the repo.

| Feature | Free-plan behaviour | To switch on |
| --- | --- | --- |
| Phone OTP sign-in and verified mobile numbers | Sign in with Google or email; email must be confirmed. Mobile number is collected as a private contact detail, not verified | Blaze, then build with `NEXT_PUBLIC_PHONE_OTP=1` |
| In-app payments (Razorpay) | Pet parent pays the sitter directly (UPI or cash); the sitter taps *Payment received* | Blaze, deploy `functions/`, set the Razorpay secrets, build with `NEXT_PUBLIC_ONLINE_PAYMENTS=1` (the rules would also need the paid-stay checks restored) |
| Nearby vets from Google Maps | "Coming soon" card; clinics registered on CarePaws still listed | Blaze, then see *Nearby vets* below, and build with `NEXT_PUBLIC_GOOGLE_VETS=1` |
| Cloud Storage | Not used. Photos are small JPEGs stored in Firestore (profile photos about 10 KB, stay photos under 300 KB, ID photos under 750 KB) | Not needed |
| Scheduled jobs and triggers | Not used. The app keeps counts itself; the admin CLI deletes old ID data (`kyc-purge-old`) | — |

To use Cloud Functions later: `firebase deploy --config firebase.blaze.json --only functions`. (`firebase.json` has no functions entry, so a plain `firebase deploy` works on Spark.)

Free-plan limits to watch: Firestore allows 1 GiB stored, 50,000 reads and 20,000 writes a day. Every photo counts towards the 1 GiB, so ID photos are deleted as soon as a case is decided, and stay photos are the main thing that grows.

### Launch scope: Hyderabad, real accounts only

- **Where:** CarePaws is launching in Hyderabad. People choose a neighbourhood from a fixed list (`src/lib/hyderabad-areas.json`: approximate centres, never addresses). The security rules carry a copy of that list and `tests/areas.test.mjs` fails if the two drift apart. Sitter ID addresses must have a Hyderabad pincode (500, 501 or 502), and rescue or clinic pins must be inside the Hyderabad bounds.
- **Real accounts:** a parent or sitter can't finish onboarding without a **confirmed email address** (Google accounts arrive confirmed; email sign-ups tap a link we send). The rules check it from the sign-in token, so it can't be skipped from the app. They also give an Indian mobile number as a private contact. Sitters are ID-verified by an admin before they appear. Someone "just looking around" needs none of this. (With phone OTP switched on, a verified mobile number counts as well.)
- **Not in Hyderabad?** They can browse. They can't create a parent, sitter or listing profile.

### Nearby vets (Google Maps)

> **Switched off for now.** It needs the paid Blaze plan and Google Maps billing, so the Nearby screen shows "Coming soon" and lists only clinics registered on CarePaws. The code is complete. To turn it on: do the setup below, deploy `nearbyVets`, and build the app with `NEXT_PUBLIC_GOOGLE_VETS=1`.

Pet parents and sitters see the closest vets and clinics from their location: Google's star rating and review count, whether it is open now, Google's AI summary of the reviews, a **Call** button and **Open in Maps** (turn-by-turn directions in the phone's Maps app). It uses the **Places API (New)**, field `reviewSummary` (English, India).

- **The key stays on the server.** The app calls the `nearbyVets` Cloud Function, which calls Google. The function refuses anything outside Hyderabad before Google is called.
- **Cost control.** Anyone can search, including people just looking around, because an emergency shouldn't need an account. It is limited to 30 searches per person per hour (`PLACES_PER_HOUR`) and 3,000 a day across the app (`PLACES_DAILY_CAP`), and old counters are purged nightly. Also set a budget alert, and a daily quota on the Places API (New) in Google Cloud.
- **Terms.** Nothing from Google is stored. The AI summary is always shown with "Summarized with Gemini" and a link to the reviews, plus Google's report link. Summaries aren't guaranteed for every clinic; those cards simply show the rating and contact.

Setup (once):

1. Google Cloud console → the same project as Firebase → **APIs & Services → Library** → enable **Places API (New)**. Billing must be on (the Blaze plan).
2. **Credentials → Create API key.** Restrict it: **API restrictions → Places API (New) only**. (Don't use an Android or website restriction: the call comes from Cloud Functions.)
3. `firebase functions:secrets:set GOOGLE_MAPS_API_KEY`, then `firebase deploy --only functions`.
4. Locally, the emulator reads `functions/.secret.local` (`GOOGLE_MAPS_API_KEY=...`) and `functions/.env.local` (`PLACES_API_BASE=...` to point at a stand-in server). Both are git-ignored.

### Sitter identity verification (KYC)

Sitters are **not listed and cannot be booked until you approve them**. In the app they give their legal name and date of birth, the ID type and the **last four characters** of the number (never the full number; Aadhaar must be a masked copy), photos of the ID and a selfie (photos only; PDFs aren't accepted), an address (plus an address proof if the ID is a PAN card), an emergency contact, and agree to the care standards and a consent notice. A police clearance certificate is optional and earns a "Background checked" badge.

```bash
cd functions
node admin.mjs kyc-pending                          --project <id>
node admin.mjs kyc-show    <uid> --out ./review     --project <id>   # details + saves the ID photos as files
node admin.mjs kyc-approve <uid> [--background-checked] --project <id>
node admin.mjs kyc-reject  <uid> --reason "Selfie is too dark to match the ID photo"  --project <id>
node admin.mjs kyc-purge-old                        --project <id>   # run now and then (see below)
node admin.mjs reports                              --project <id>                     # user reports
```

Check that the name and date of birth match, the selfie matches the ID photo, the document is genuine and unexpired, and the address matches. Delete downloaded files afterwards. This runs on your computer with a service-account key (Firebase console → Project settings → Service accounts → Generate new private key; set `GOOGLE_APPLICATION_CREDENTIALS` to its path), so it needs no paid plan. Approval sets the sitter's `verified` flag; rejection shows your reason in the app and lets them resubmit.

**Data handling.** The ID photos are saved privately in the database, where no app user can read them back. **Approving or rejecting a case deletes the photos at once.** The personal details (date of birth, address, emergency contact) stay for 30 days in case of a dispute, then `node admin.mjs kyc-purge-old` deletes them (there is no scheduler on the free plan, so run it every week or two), keeping only the outcome, ID type and last four characters. This follows UIDAI's guidance to accept masked Aadhaar and not to store the full number, and the DPDP Act's data-minimisation principle. See `docs/ROADMAP.md` for what is still needed before launch (automated verification, legal review).

### Phone sign-in notes (switched off on the free plan)

- **Web** uses Firebase's invisible reCAPTCHA. **Android** sends the SMS through the native Firebase SDK (no reCAPTCHA) and confirms the code with the JS SDK, so Firestore sees one signed-in user. Register your APK's SHA-1 and SHA-256 in Firebase for this to work.
- **Known limitation.** Google Play services sometimes verifies a number *instantly* without an SMS. In that case the native SDK gives the web layer no code to finish with, and the app asks the person to use Google or email instead. If this shows up in practice, add a Cloud Function that exchanges the native ID token for a custom token.
- **Cost.** Firebase sends SMS only on the Blaze plan, and bills beyond its free quota. Set an SMS region policy (Firebase console → Authentication → Settings) to the countries you serve, to limit abuse.

### Google Play checklist

- **Account deletion**: in-app (You → Delete my account) and a web page at `/legal/#deletion`. Put that URL in the Play Console's data-deletion field.
- **User-generated content**: in-app reporting and blocking exist; Play also asks that you moderate. Review reports regularly.
- **Data safety form**: you collect name, phone, email, approximate and precise location (only when used), photos, ID documents, and the stay photos and care details people choose to share. There is no in-app payment, so no payment data is collected.
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
- **Vouching.** A verified organisation opens a sitter's profile and taps *Vouch*. The sitter's profile then shows *Vouched by N* with each organisation (tap to open its listing), and search can filter to vouched sitters. The count moves in the same step as the vouch (the rules check it); renaming an organisation updates its vouches, and un-verifying it (`admin.mjs unverify`) removes them.
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
npm run emulators              # auth and firestore (starts empty)
npm run dev
```

There is no seed data. Create test accounts through the app. A sitter appears in the list after you approve their KYC with `functions/admin.mjs` against the emulator.

Email confirmation links appear in the Auth emulator at `http://127.0.0.1:9099/emulator/v1/projects/demo-carepaws/oobCodes`; open the `oobLink` of the newest one to confirm an address. (With `NEXT_PUBLIC_PHONE_OTP=1`, SMS codes appear at `.../verificationCodes`.)

Checks:

```bash
npm run lint && npm run typecheck
npm run test:rules             # 124 tests: security rules, area list, vet-search helpers (needs firebase-tools)
```

## Design

The palette is called "Field & Hearth" and is drawn from natural materials: linen and oat surfaces, moss as the primary colour, clay as the warm accent, river stone for information, and honey for ratings. A faint paper grain keeps flat fills from looking plastic. Type pairs Fraunces (soft serif, for headings) with Manrope (body). Every screen has a dark theme, either following the system setting or chosen in the You tab. Tokens are in `src/app/globals.css`.
