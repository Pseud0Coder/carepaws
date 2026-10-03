# CarePaws: research notes and roadmap

What I looked at, how it shaped what's built, and what is still missing, in the order I'd tackle it.
Items marked **(research)** come from the sources below; items marked **(judgement)** are my own reasoning and worth
challenging.

## What the research said

| Finding | Source | What it changed |
| --- | --- | --- |
| Rover vets every sitter with a third-party background check, requires 18+, a profile with testimonials, and a safety quiz; offers 24/7 support, vet advice for sitters, and a guarantee reimbursing up to US$25,000 of vet care. It also pushes **Meet & Greets** before booking. | [Rover safety page](https://www.rover.com/safety) and [support article](https://support.rover.com/hc/en-us/articles/205882216-What-does-Rover-do-to-support-safety), via search summaries (the page itself returned 403) | Sitter KYC, the optional police-certificate "Background checked" badge, care standards that every sitter signs. Meet & Greet and an insurance-style guarantee are on the roadmap below. |
| Reported incidents on a large platform: a dog came home with a dislocated hip and the sitter gave no explanation; two French bulldogs died of overheating. Owners said vetting "has to go a little deeper than just a background check", and complained of **no accountability** and **no standard safety requirements**. | [WSB-TV / Yahoo News](https://www.yahoo.com/news/dog-owners-popular-app-rover-224247569.html) | The **stay log** (append-only, photos, drop-off and pick-up condition, incidents), required daily updates, care standards on heat-safety (never in a car, hours-alone limit), a mandatory **emergency plan**, and **emergency help** with the parent's authorised spending limit. |
| Private companies should accept **masked Aadhaar** and store only the last four digits; storing the full number or e-KYC data brings the Aadhaar Data Vault obligations. The DPDP Act and Rules require reasonable safeguards, consent and transparency. | [Khaitan & Co on the Aadhaar Data Vault](https://www.khaitanco.com/sites/default/files/2025-12/ERGO%20-%20Aadhaar%20Data%20Vault%20-%2010%20December%202025.pdf), [law.asia](https://law.asia/aadhaar-dpdpa-compliance/), [Mondaq](https://www.mondaq.com/india/privacy-protection/1719124/vaulting-to-safety-uidai-issues-clarifications-on-applicability-of-aadhaar-data-vault-requirements) | KYC collects **only the last four characters** of any ID number, asks for masked Aadhaar, keeps images in write-only private Storage, purges images and personal details **30 days after a decision**, and records consent. |
| Google Play requires apps with user content to offer **in-app reporting and blocking** and moderation, and apps with account creation to offer **in-app and web account deletion**, deleting associated data except for legitimate retention (security, fraud prevention, regulation) that is disclosed. | [Play UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-GB) | Report and block, an in-app **Delete my account** with a Cloud Function, a `/legal/#deletion` page for the Play Console, and the anonymise-versus-delete policy documented in the privacy notice. |
| `@capacitor-firebase/authentication` (read from its own source): on Android, SMS can be **instantly verified** without a code, and with `skipNativeAuth` the web layer then has nothing to sign in with. | Plugin README and Android source in `node_modules` | The phone flow sends the SMS natively and confirms in the JS SDK, with a graceful fallback message and a documented fix if it shows up in practice. |

**What I couldn't establish.** Search returned little on how Indian pet-care competitors actually work (cancellation
terms, payout schedules, what they verify). I'd do a proper competitive teardown before fixing pricing, fees and policies.

## Built so far, and why

| Your ask / research finding | Built |
| --- | --- |
| Phone login | OTP sign-in on web and Android; link a phone to an email/Google account (needed for KYC) |
| Parent / sitter / "just looking around" | Role step with all three; browsing needs no account; explorers can upgrade later and are prompted when they try to book, message or post |
| Sitter KYC | Mobile verification, ID + selfie + address, optional police certificate, care standards, consent; admin review CLI; listed and bookable only after approval, enforced by the rules |
| Parent declarations (pet-proofed home, ...) | Versioned declarations signed per booking, plus a pet care sheet. Covers vaccination, parasite control, health and **behaviour disclosure including bite history**, no contagious illness, ownership, **pre-existing conditions recorded at drop-off**, **inherent risk and a 24-hour window to raise concerns**, **emergency vet authorisation with a limit**, and for care at home: **pet-proofed home, hazards and cameras disclosed, safe key sharing**. The sitter reviews and acknowledges before accepting. The server refuses a booking without them. |
| "Other helpful features" | Stay log with photos and condition checks **(research)**, emergency help **(research)**, report/block and account deletion **(research, Play policy)**, 18+ and terms acceptance **(DPDP)**, rescue/clinic directory and vouching (earlier round) |

## Roadmap

Effort: S under a week, M one to three weeks, L more.

### Before you can take real money (blockers)

1. **Sitter payouts. (L)** Money is collected through Razorpay but never paid to sitters. Needs Razorpay Route or RazorpayX, a verified bank/UPI account per sitter (penny-drop check), the platform fee (currently displayed as 10%), settlement timing (e.g. after check-out), and GST/TDS advice from an accountant. **(judgement)**
2. **Cancellation and refund policy. (M)** Today a paid booking cannot be cancelled at all. Needs windows (flexible / moderate / strict), Razorpay refunds, a sitter-cancels flow with a penalty and help rebooking, and what happens to the stay log. **(judgement)**
3. **Push notifications. (M)** New request, accepted, payment due, message, stay-log update, KYC decision. FCM through a Capacitor plugin and Cloud Function triggers. A marketplace without these loses requests. **(judgement)**
4. **Automated KYC plus an admin console. (L)** Keep the manual path for edge cases, but add Aadhaar/DigiLocker e-KYC (with the Data Vault obligations in mind) or a licensed provider (Digio, IDfy, Signzy, Setu, Sumsub), a liveness check and face match, and a web console instead of the CLI. Add duplicate detection (a hash of name + date of birth + ID tail) to catch one person registering twice. **(judgement)**
5. **Legal, privacy and compliance review. (M)** Have `src/app/legal/page.tsx` reviewed; add a grievance officer and a breach-response process (DPDP); complete the Play data-safety form; confirm marketplace obligations (GST, platform vs employer). **Not something I can sign off.**
6. **Disputes and support. (M)** A "Raise a concern" button on a stay, within 24 hours as the declarations promise, that attaches the stay log, with an owner and a response time. The data is there; the process isn't. **(research: accountability complaint)**
7. **Guarantee or insurance. (L, partnership)** Rover's guarantee is a major trust signal. Until an insurer is found, say plainly what is and isn't covered. **(research)**

### Soon after launch

8. **Meet & Greet before booking. (S)** A status on the request ("meet first"), a time proposal in chat, and a reminder. **(research)**
9. **Evidence for vaccinations. (M)** Today vaccination is self-declared. Let parents upload the certificate (reviewed by an admin or a partner vet), and remind them before boosters lapse. **(judgement)**
10. **Two-way reviews. (S)** Sitters rate parents privately; repeated problems (unreported aggression, last-minute cancellations) become visible to admins and to sitters before they accept. **(judgement)**
11. **Sitter learning and a quiz. (M)** Short modules on first aid, **heatstroke and flat-faced breeds** (the overheating deaths), medication handling, and handling fear. A badge once passed. **(research)**
12. **Heat and weather nudges. (S)** In summer, warn parents and sitters about hot-weather risks for the pet's breed and the city's forecast. **(research, judgement)**
13. **Services beyond overnight stays. (L)** Walks, drop-ins, daycare, with per-service pricing, availability calendars, instant-book, recurring bookings, and GPS-tracked walks.
14. **Masked calling and chat. (M)** Route calls through a number-masking provider so neither side's number is ever exposed, and keep a record for disputes.
15. **Languages. (M)** Hindi plus the regional languages of your launch cities. Strings are currently hard-coded English.

### Community and rescue features

16. **Lost and found pets. (M)** A post type with photo, last-seen location and a radius alert, shared with nearby rescues and clinics. High emotional value and a natural reason for rescues to be active.
17. **Adoptable animals and fostering. (M)** Let rescues list animals for adoption and request fosters, with donation links. Builds on the existing listings.
18. **Pet health record. (M)** A timeline of vaccinations, weights, conditions and documents the parent can share with a sitter or vet.
19. **Vet appointments or teleconsult. (L)** Book a slot at a listed clinic, or a video consult, from the same directory.
20. **Offline first aid guide. (S)** A short, vet-reviewed guide that works with no signal, linked from Emergency help. Needs a vet to review the content.

### Engineering

- **Directory scale.** Nearby loads every verified listing of a type and sorts on the device. Past a few thousand, add geohash range queries.
- **Phone instant-verification gap.** If it appears in practice, add a Cloud Function that exchanges the native ID token for a custom token.
- **Observability.** Crashlytics, Firestore usage alerts, and an alert on a spike in KYC submissions or reports.
