import type { ReactNode } from "react";
import { AppBar } from "@/components/ui";

const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 px-5 pt-8">
      <h2 className="mb-3 font-display text-2xl text-bark">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-bark-soft [&_li]:mt-1.5 [&_strong]:text-bark [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </section>
  );
}

export const metadata = { title: "Terms, care policy and privacy | CarePaws" };

/**
 * Plain-language terms, care policy and privacy notice. It describes what the app actually does;
 * have it reviewed by a lawyer for your jurisdiction before launch.
 */
export default function LegalPage() {
  return (
    <>
      <AppBar back="/" title="Terms & privacy" />
      <main className="pb-16">
        <p className="px-5 pt-4 text-sm text-stone">Last updated October 2026. Plain-language summary.</p>

        <Section id="terms" title="How CarePaws works">
          <p>
            CarePaws connects pet parents with independent pet sitters, and lists rescues and vet clinics. CarePaws is a platform: sitters are independent and not our employees, and we are not a veterinary service.
          </p>
          <ul>
            <li><strong>Sitters</strong> are listed only after we verify their identity. Verification confirms who they are; it isn’t a guarantee of how they will behave.</li>
            <li><strong>Pet parents</strong> must give honest, complete information about their pet and home, and confirm it before every booking.</li>
            <li><strong>Rescues and clinics</strong> are listed after we check them, but you should always call ahead.</li>
            <li>Be kind. We remove content and accounts that harass, mislead or put animals at risk, and you can report or block anyone in the app.</li>
          </ul>
        </Section>

        <Section id="care-policy" title="Pet care policy">
          <ul>
            <li><strong>Declarations.</strong> Before each booking, the pet parent confirms the pet’s health, vaccination, behaviour and (for care at home) the safety of their home. These confirmations are saved with the booking, with the date, as a record both sides can rely on.</li>
            <li><strong>Drop-off record.</strong> At the start of a stay, the pet’s condition is recorded with photos, so pre-existing injuries and conditions are documented.</li>
            <li><strong>Daily updates.</strong> Sitters send at least one photo update a day. The stay log is a shared record for both sides.</li>
            <li><strong>Emergencies.</strong> If a pet is unwell or injured, the sitter contacts the pet parent and a vet straight away. The pet parent authorises emergency veterinary treatment up to the limit they set when booking, and reimburses reasonable emergency costs.</li>
            <li><strong>Risk.</strong> Even with excellent care, pets can become ill or injured, especially when stressed by a new place. Concerns should be raised within 24 hours, with the stay log and photos as evidence.</li>
            <li><strong>Payments.</strong> Payment is taken through Razorpay after a sitter accepts a booking.</li>
          </ul>
        </Section>

        <Section id="privacy" title="Privacy notice">
          <p><strong>What we collect and why</strong></p>
          <ul>
            <li><strong>Account:</strong> your phone number, email or Google account, and name, to sign you in and let people recognise you.</li>
            <li><strong>Profile:</strong> area, bio, pets, and for sitters their services and household details, to match people.</li>
            <li><strong>Identity verification (sitters only):</strong> legal name, date of birth, ID type, the <em>last four characters</em> of the ID number (never the full number), photos of the ID and a selfie, home address, an emergency contact, and optionally a police clearance certificate. We use these only to confirm identity and, if you choose, a background check. Please use a masked Aadhaar showing only the last four digits.</li>
            <li><strong>Location:</strong> your device’s location, only when you tap “Use my location”, to sort rescues and clinics by distance. It is used on your device and is not stored or sent to us. Rescues and clinics publish their own address and pin.</li>
            <li><strong>Messages, bookings and posts:</strong> to run the service, and kept as the record of a stay.</li>
          </ul>
          <p><strong>Who sees it</strong></p>
          <ul>
            <li>Your phone number and email are never shown to other users. Identity documents are stored privately: nobody, including you, can open them in the app, and only authorised CarePaws reviewers can.</li>
            <li>When a booking is confirmed, the sitter sees your pet’s care sheet and your declarations for that booking.</li>
            <li>We share data with the services that run CarePaws (Google Firebase for hosting, sign-in and storage; Razorpay for payments). We do not sell personal data.</li>
          </ul>
          <p><strong>How long we keep it</strong></p>
          <ul>
            <li>ID images and the personal details in a verification case are <strong>deleted 30 days after a decision</strong>. We keep only the outcome, the ID type, the last four characters and an audit record, so we can show who was verified and when.</li>
            <li>Booking, payment and safety records are kept as long as needed for accounting, disputes and legal obligations.</li>
          </ul>
          <p><strong>Your rights.</strong> You can see, correct, and delete your data, and withdraw consent, at any time. Under India’s Digital Personal Data Protection Act, 2023 you also have the right to grievance redressal.</p>
        </Section>

        <Section id="deletion" title="Delete your account and data">
          <p>
            In the app, open <strong>You → Delete my account</strong>. This signs you out everywhere and deletes your profile, pets, identity documents, private contact details and unsent data. To protect other people and meet legal duties, bookings, payments and reviews are kept but detached from your name and photo.
          </p>
          <p>
            Can’t sign in? {SUPPORT ? <>Email <a className="font-semibold text-moss" href={`mailto:${SUPPORT}?subject=Delete%20my%20CarePaws%20account`}>{SUPPORT}</a> from your account’s email address or phone number and we’ll delete it.</> : <>Contact CarePaws support from the address on our store listing and we’ll delete it.</>}
          </p>
        </Section>
      </main>
    </>
  );
}
