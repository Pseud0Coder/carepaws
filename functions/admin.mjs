// Admin tasks that clients must never do themselves.
//
//   node admin.mjs pending  --project <id>   list rescues/clinics waiting for verification
//   node admin.mjs verify   <uid> --project <id>
//   node admin.mjs unverify <uid> --project <id>   (also withdraws that organisation's vouches)
//
// Auth: GOOGLE_APPLICATION_CREDENTIALS=key.json, or FIRESTORE_EMULATOR_HOST for the emulator.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const pi = args.indexOf("--project");
const projectId = pi > -1 ? args[pi + 1] : process.env.GCLOUD_PROJECT;
const [cmd, uid] = args.filter((a, i) => a !== "--project" && args[i - 1] !== "--project");
if (!projectId || !["pending", "verify", "unverify"].includes(cmd) || (cmd !== "pending" && !uid)) {
  console.error("Usage: node admin.mjs pending | verify <uid> | unverify <uid>  --project <firebase-project-id>");
  process.exit(1);
}
initializeApp({ projectId });
const db = getFirestore();

if (cmd === "pending") {
  const snap = await db.collection("users").where("role", "in", ["rescue", "vet"]).get();
  const rows = snap.docs.filter((d) => d.get("onboarded") && d.get("verified") !== true);
  if (!rows.length) console.log("Nothing waiting for verification.");
  for (const d of rows) {
    const o = d.data();
    console.log(`${d.id}\n  ${o.displayName} (${o.role}) · ${o.location}\n  ${o.address}\n  phone: ${o.phone}  site: ${o.website || "-"}\n`);
  }
} else {
  const ref = db.doc(`users/${uid}`);
  if (!(await ref.get()).exists) {
    console.error(`No user ${uid}`);
    process.exit(1);
  }
  await ref.set({ verified: cmd === "verify" }, { merge: true });
  console.log(`${cmd === "verify" ? "Verified" : "Unverified"} ${uid}.`);
}
