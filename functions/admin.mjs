// Admin tasks that clients must never do themselves. All of them use the Admin SDK, which bypasses
// security rules, so run them only from a trusted machine with a service account.
//
//   Organisations (rescues and vet clinics)
//     node admin.mjs pending                       who is waiting, with phone, address and website
//     node admin.mjs verify   <uid>                after you've checked them (call the number!)
//     node admin.mjs unverify <uid>                also withdraws every vouch they gave
//
//   Reports from users
//     node admin.mjs reports                       open reports, newest first, with the reported content
//     node admin.mjs report-resolve <reportId>     mark one handled (suspend an account in the Firebase console)
//
//   Sitter identity verification (KYC)
//     node admin.mjs kyc-pending                   cases waiting for review
//     node admin.mjs kyc-show <uid> [--out dir]    details, and downloads the ID images for review
//     node admin.mjs kyc-approve <uid> [--background-checked]
//     node admin.mjs kyc-reject  <uid> --reason "Selfie is too dark to match the ID photo"
//     node admin.mjs kyc-purge   <uid>             delete a case's images and personal details now
//
// Always pass --project <firebase-project-id>. Auth: GOOGLE_APPLICATION_CREDENTIALS=key.json
// (or the FIRESTORE_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST variables for the emulator).
import { mkdirSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import { join } from "node:path";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    const name = argv[i].slice(2);
    const takesValue = ["project", "reason", "out", "bucket"].includes(name);
    flags[name] = takesValue ? argv[++i] : true;
  } else positional.push(argv[i]);
}
const [cmd, uid] = positional;
const COMMANDS = ["pending", "verify", "unverify", "reports", "report-resolve", "kyc-pending", "kyc-show", "kyc-approve", "kyc-reject", "kyc-purge"];
const needsUid = !["pending", "kyc-pending", "reports"].includes(cmd);
const projectId = flags.project || process.env.GCLOUD_PROJECT;
if (!projectId || !COMMANDS.includes(cmd) || (needsUid && !uid)) {
  console.error(`Usage: node admin.mjs <${COMMANDS.join("|")}> [uid] --project <firebase-project-id>`);
  process.exit(1);
}
const bucketName = flags.bucket || process.env.STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
initializeApp({ projectId, storageBucket: bucketName });
const db = getFirestore();
const reviewer = process.env.ADMIN_NAME || userInfo().username;

async function purge(id) {
  await getStorage().bucket().deleteFiles({ prefix: `kyc/${id}/` });
  // Keep the outcome and an audit trail; drop the personal details and file references.
  await db.doc(`kyc/${id}`).update({
    idFront: FieldValue.delete(),
    idBack: FieldValue.delete(),
    selfie: FieldValue.delete(),
    addressProof: FieldValue.delete(),
    policeCert: FieldValue.delete(),
    dob: FieldValue.delete(),
    addressLine: FieldValue.delete(),
    city: FieldValue.delete(),
    pincode: FieldValue.delete(),
    emergencyName: FieldValue.delete(),
    emergencyPhone: FieldValue.delete(),
    purgedAt: FieldValue.serverTimestamp(),
  });
}

if (cmd === "pending") {
  const snap = await db.collection("users").where("role", "in", ["rescue", "vet"]).get();
  const rows = snap.docs.filter((d) => d.get("onboarded") && d.get("verified") !== true);
  if (!rows.length) console.log("Nothing waiting for verification.");
  for (const d of rows) {
    const o = d.data();
    console.log(`${d.id}\n  ${o.displayName} (${o.role}) · ${o.location}\n  ${o.address}\n  phone: ${o.phone}  site: ${o.website || "-"}\n`);
  }
} else if (cmd === "reports") {
  const snap = await db.collection("reports").orderBy("createdAt", "desc").limit(100).get();
  const open = snap.docs.filter((d) => !d.get("resolvedAt"));
  if (!open.length) console.log("No open reports.");
  for (const d of open) {
    const r = d.data();
    console.log(`${d.id}  ${r.createdAt?.toDate().toISOString()}  ${r.reason.toUpperCase()}  ${r.targetType}:${r.targetId}  (reported by ${r.reporterId})`);
    if (r.details) console.log(`    "${r.details}"`);
    // Show what was reported, where we can.
    const target = r.targetType === "post" ? await db.doc(`posts/${r.targetId}`).get() : r.targetType === "comment" ? await db.doc(`posts/${r.targetId.split("/")[0]}/comments/${r.targetId.split("/")[1]}`).get() : r.targetType === "user" ? await db.doc(`users/${r.targetId}`).get() : null;
    if (target?.exists) {
      const t = target.data();
      console.log(`    → ${t.title ? t.title + ": " : ""}${(t.text || t.bio || t.displayName || "").slice(0, 160)}  [author/owner: ${t.authorId || r.targetId}]`);
    }
  }
} else if (cmd === "report-resolve") {
  await db.doc(`reports/${uid}`).update({ resolvedAt: FieldValue.serverTimestamp(), resolvedBy: reviewer });
  console.log(`Resolved ${uid}.`);
} else if (cmd === "verify" || cmd === "unverify") {
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`No user ${uid}`);
    process.exit(1);
  }
  if (snap.get("role") === "sitter" && !flags.force) {
    console.error("Sitters are verified through identity review: use kyc-show / kyc-approve. (Pass --force to override.)");
    process.exit(1);
  }
  await ref.set({ verified: cmd === "verify" }, { merge: true });
  console.log(`${cmd === "verify" ? "Verified" : "Unverified"} ${uid}.`);
} else if (cmd === "kyc-pending") {
  const snap = await db.collection("kyc").where("status", "==", "submitted").get();
  if (!snap.size) console.log("No cases waiting.");
  snap.docs
    .sort((a, b) => a.get("submittedAt")?.toMillis() - b.get("submittedAt")?.toMillis())
    .forEach((d) => {
      const k = d.data();
      console.log(`${d.id}  ${k.legalName}  (${k.idType} ····${k.idLast4})  submitted ${k.submittedAt?.toDate().toISOString()}${k.hasPoliceCert ? "  +police cert" : ""}`);
    });
} else {
  const ref = db.doc(`kyc/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`No KYC case for ${uid}`);
    process.exit(1);
  }
  const k = snap.data();
  const userRef = db.doc(`users/${uid}`);

  if (cmd === "kyc-show") {
    const { declarations, consent, ...rest } = k;
    console.log(JSON.stringify({ ...rest, consent, declarationsVersion: declarations?.version }, (key, v) => (v?.toDate ? v.toDate().toISOString() : v), 2));
    const profile = (await userRef.get()).data();
    console.log(`\nProfile name: ${profile?.displayName}   phone verified on account: see Firebase Auth for ${uid}`);
    const out = flags.out || join(process.cwd(), "kyc-review", uid);
    mkdirSync(out, { recursive: true });
    for (const key of ["idFront", "idBack", "selfie", "addressProof", "policeCert"]) {
      if (!k[key]) continue;
      const [buf] = await getStorage().bucket().file(k[key]).download().catch((e) => {
        console.error(`Couldn't read ${k[key]} from bucket "${bucketName}": ${e.message}`);
        console.error('If the bucket name is wrong, pass --bucket <name> (see Firebase console → Storage; older projects end in ".appspot.com").');
        process.exit(1);
      });
      const dest = join(out, k[key].split("/").pop());
      writeFileSync(dest, buf);
      console.log(`  saved ${dest}`);
    }
    console.log("\nCheck: the name, date of birth and photo on the ID match; the selfie matches the ID photo;");
    console.log("the ID is genuine and unexpired; the address matches. Delete the saved files when you're done.");
  } else if (cmd === "kyc-approve") {
    if (k.status === "approved") {
      console.log("Already approved.");
      process.exit(0);
    }
    if (flags["background-checked"] && !k.hasPoliceCert) {
      console.error("This case has no police certificate, so it can't be marked background-checked.");
      process.exit(1);
    }
    await ref.update({
      status: "approved",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: reviewer,
      reason: FieldValue.delete(),
      backgroundChecked: !!flags["background-checked"],
    });
    await userRef.set({ verified: true, backgroundChecked: !!flags["background-checked"] }, { merge: true });
    console.log(`Approved ${uid}${flags["background-checked"] ? " (background checked)" : ""}. They are now listed and bookable.`);
  } else if (cmd === "kyc-reject") {
    if (!flags.reason) {
      console.error('Give a reason the sitter can act on: --reason "…"');
      process.exit(1);
    }
    await ref.update({ status: "rejected", reviewedAt: FieldValue.serverTimestamp(), reviewedBy: reviewer, reason: flags.reason });
    await userRef.set({ verified: false, backgroundChecked: false }, { merge: true });
    console.log(`Rejected ${uid}. They can resubmit from the app.`);
  } else if (cmd === "kyc-purge") {
    await purge(uid);
    console.log(`Deleted ${uid}'s ID images and personal details. The decision record is kept.`);
  }
}
