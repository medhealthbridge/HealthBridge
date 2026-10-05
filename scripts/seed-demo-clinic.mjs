// A complete, working demo clinic for showing Clinix PH: real logins for the
// owner, a front-desk assistant and a practitioner, plus a price list, patients,
// today's schedule, receipts, stock, claims, notes and custom patient fields.
//
//   node --env-file=.env.local scripts/seed-demo-clinic.mjs             # add
//   node --env-file=.env.local scripts/seed-demo-clinic.mjs --dry-run   # run everything, then roll back
//   node --env-file=.env.local scripts/seed-demo-clinic.mjs --remove    # delete the demo clinic and its people
//   node scripts/seed-demo-clinic.mjs --emit-sql out.json               # no database: write the statements as a JSON array
//                                                                       # (for a SQL runner that can't open a Postgres connection)
//
// Everything is tied to one clinic (subdomain "demo") and three users whose
// emails end in @demo.invalid (they can't receive mail). Adding is idempotent: if
// the demo owner already exists nothing is changed. Set DEMO_PASSWORD to choose the
// shared password, otherwise one is generated and printed once. Existing users'
// passwords are never touched.
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import pg from "pg";

// Seeding writes across tenants (and creates users), so it connects as the database owner:
// DATABASE_ADMIN_URL when set, otherwise DATABASE_URL (the app's own, restricted role cannot do this).
const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
import { hashPassword } from "better-auth/crypto";

const SLUG = "demo";
const COMPANY = "Sunrise Dental (Demo)";
const EMAILS = { owner: "owner@demo.invalid", assistant: "frontdesk@demo.invalid", practitioner: "dentist@demo.invalid" };
const NAMES = { owner: "Dra. Maria Villanueva", assistant: "Kim Uy", practitioner: "Dr. Paolo Reyes" };
const DRY = process.argv.includes("--dry-run");
const REMOVE = process.argv.includes("--remove");
const EMIT = process.argv.includes("--emit-sql") ? process.argv[process.argv.indexOf("--emit-sql") + 1] : null;

if (!EMIT && !ADMIN_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const newId = () => randomBytes(16).toString("hex");
function generatePassword() {
  const sets = ["abcdefghjkmnpqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789", "!@#$%*-_="];
  const chars = sets.map((set) => set[randomInt(set.length)]);
  const all = sets.join("");
  while (chars.length < 14) chars.push(all[randomInt(all.length)]);
  return chars.sort(() => randomInt(3) - 1).join("");
}

// ---- money, copied from src/lib/invoice-totals.ts (VAT-inclusive prices, RA 9994 / 10754) ----
function totals(lines, discounted) {
  const t = { subtotal: 0, discount: 0, vat: 0, vatExempt: 0, total: 0 };
  for (const line of lines) {
    const gross = line.price * line.qty;
    const base = line.vatExempt ? gross : Math.round(gross / 1.12);
    t.subtotal += gross;
    if (!discounted) { t.vat += gross - base; t.total += gross; continue; }
    const discount = Math.round(base * 0.2);
    t.vatExempt += gross - base; t.discount += discount; t.total += base - discount;
  }
  return t;
}

// Clinic-local (Manila, UTC+8) wall time → instant.
const manila = (dayOffset, hour, minute = 0) => {
  const now = new Date(Date.now() + 8 * 3600_000);
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hour - 8, minute));
  return date;
};

const SERVICES = [
  { name: "Consultation", code: "CONS", category: "Preventive", minutes: 20, price: 50000, vatExempt: true },
  { name: "Oral Prophylaxis (Cleaning)", code: "PROPHY", category: "Preventive", minutes: 45, price: 80000, vatExempt: false },
  { name: "Tooth Extraction", code: "EXT", category: "Surgery", minutes: 40, price: 150000, vatExempt: false },
  { name: "Composite Filling", code: "FILL", category: "Restorative", minutes: 45, price: 120000, vatExempt: false },
  { name: "Root Canal Therapy", code: "RCT", category: "Endodontics", minutes: 90, price: 850000, vatExempt: false },
  { name: "Teeth Whitening", code: "WHITE", category: "Cosmetic", minutes: 60, price: 450000, vatExempt: false },
  { name: "Dental X-ray (Periapical)", code: "XRAY", category: "Diagnostics", minutes: 10, price: 35000, vatExempt: false },
  { name: "Braces Adjustment", code: "BRACE", category: "Orthodontics", minutes: 30, price: 100000, vatExempt: false },
];

// [first, last, sex, birth, mobile, email, philhealth, osca, medical alerts, allergies, emergency contact]
const PATIENTS = [
  ["Maria", "Santos", "F", "1990-05-01", "0917 555 4412", "maria.santos@demo.invalid", "12-345678901-2", null, ["Hypertension"], ["Local anesthesia"], "Jose Santos · 0917 555 0001"],
  ["Joel", "Ramirez", "M", "1985-11-20", "0918 222 3344", null, null, null, [], [], "Ana Ramirez · 0918 222 0002"],
  ["Andrea", "Tan", "F", "2001-03-14", "0920 777 1180", "andrea.tan@demo.invalid", null, null, [], ["Latex"], "Mike Tan · 0920 777 0003"],
  ["Ben", "Cruz", "M", "1952-07-09", "0905 333 9921", null, "98-765432109-8", "OSCA-2291044", ["Diabetes", "On blood thinners"], ["Penicillin"], "Liza Cruz · 0905 333 0004"],
  ["Grace", "Ubaldo", "F", "1978-01-30", "0927 410 6655", "grace.ubaldo@demo.invalid", null, null, ["Pregnant"], [], "Ric Ubaldo · 0927 410 0005"],
  ["Rico", "Mendoza", "M", "1996-09-02", "0916 808 7712", null, null, null, [], [], "Ma. Mendoza · 0916 808 0006"],
  ["Lea", "Villareal", "F", "1969-12-25", "0919 345 0098", "lea.villareal@demo.invalid", "11-222333444-5", null, ["Heart condition"], ["Ibuprofen"], "Carlo Villareal · 0919 345 0007"],
  ["Noel", "Bautista", "M", "2010-04-18", "0922 666 5400", null, null, null, [], [], "Rose Bautista · 0922 666 0008"],
  ["Cheska", "Lim", "F", "1993-06-11", "0917 100 2468", "cheska.lim@demo.invalid", null, null, [], [], "Dan Lim · 0917 100 0009"],
  ["Armando", "Dela Cruz", "M", "1948-02-03", "0906 540 7731", null, "55-123456789-0", "OSCA-1180772", ["Hypertension"], [], "Elena Dela Cruz · 0906 540 0010"],
  ["Trisha", "Navarro", "F", "1999-08-27", "0928 912 3300", "trisha.navarro@demo.invalid", null, null, [], ["Latex"], "Paul Navarro · 0928 912 0011"],
  ["Eduardo", "Garcia", "M", "1975-10-05", "0915 678 1122", null, null, null, ["Diabetes"], [], "Maya Garcia · 0915 678 0012"],
];

const FIELDS = [
  { key: "chief_complaint", label: "Chief complaint", type: "long_text", options: [], medical: true, section: "Dental" },
  { key: "medical_alerts", label: "Medical alerts", type: "multi_select", options: ["Bleeding disorder", "On blood thinners", "Heart condition", "Diabetes", "Hypertension", "Pregnant", "Asthma"], medical: true, section: "Medical history" },
  { key: "allergies", label: "Allergies", type: "multi_select", options: ["Local anesthesia", "Latex", "Penicillin", "Ibuprofen", "None known"], medical: true, section: "Medical history" },
  { key: "emergency_contact", label: "Emergency contact", type: "text", options: [], medical: false, section: "Contact" },
  { key: "last_dental_visit", label: "Last dental visit", type: "date", options: [], medical: false, section: "Dental" },
];

const INVENTORY = [
  { name: "Lidocaine 2% carpule", sku: "LIDO-2", unit: "carpule", reorder: 24, lots: [[18, 4], [10, 11]] },
  { name: "Composite resin A2", sku: "COMP-A2", unit: "syringe", reorder: 12, lots: [[4, 8]] },
  { name: "Gauze pads 2x2", sku: "GAUZE-22", unit: "pack", reorder: 40, lots: [[120, 14]] },
  { name: "Disposable gloves (M)", sku: "GLOVE-M", unit: "box", reorder: 10, lots: [[26, 18]] },
  { name: "Prophy paste", sku: "PROPHY-P", unit: "cup", reorder: 20, lots: [[60, 10]] },
  { name: "Fluoride varnish", sku: "FLUOR-V", unit: "tube", reorder: 6, lots: [[5, -1], [9, 6]] }, // one lot already expired
];

const pgClient = new pg.Client({ connectionString: ADMIN_URL });
const emitted = [];
// In emit mode statements are collected with their values written in as escaped literals, not run.
const literal = (value) =>
  value === null || value === undefined ? "NULL"
  : typeof value === "boolean" || typeof value === "number" ? String(value)
  : value instanceof Date ? pgClient.escapeLiteral(value.toISOString())
  : pgClient.escapeLiteral(String(value));
const inline = (text, params = []) => text.replace(/\$(\d+)/g, (_, n) => literal(params[Number(n) - 1]));
const q = EMIT
  ? async (text, params) => {
      if (!/^(begin|commit|rollback)$/i.test(text.trim()) && !/pg_advisory/.test(text) && !/^select 1 from "user"/.test(text.trim())) emitted.push(inline(text, params));
      return { rows: [], rowCount: 0 };
    }
  : (text, params) => pgClient.query(text, params);
if (!EMIT) await pgClient.connect();

try {
  await q("begin");
  await q("select pg_advisory_xact_lock(hashtext('seed-demo-clinic'))");

  if (REMOVE) {
    const [{ id: clinicId } = {}] = (await q("select id from clinics where subdomain = $1", [SLUG])).rows;
    const users = (await q('select id from "user" where email like \'%@demo.invalid\'')).rows.map((row) => row.id);
    if (clinicId) {
      for (const table of ["reminder_log", "hmo_claims", "payments", "invoice_line_items", "invoices", "clinical_notes", "appointments", "patient_invites", "agent_actions", "staff_invites", "audit_logs", "inventory_batches", "inventory_items", "patient_field_definitions", "services", "patients", "domain_lookups", "clinic_staff"]) {
        await q(`delete from ${table} where clinic_id = $1`, [clinicId]);
      }
      const accountId = (await q("select account_id from clinics where id = $1", [clinicId])).rows[0].account_id;
      await q("delete from clinics where id = $1", [clinicId]);
      await q("delete from subscriptions where account_id = $1", [accountId]);
      await q("delete from accounts where id = $1", [accountId]);
    }
    if (users.length) {
      await q("delete from session where user_id = any($1)", [users]);
      await q("delete from account where user_id = any($1)", [users]);
      await q('delete from "user" where id = any($1)', [users]);
    }
    console.log(clinicId ? "Removed the demo clinic and its 3 users." : "No demo clinic found.");
  } else {
    if ((await q('select 1 from "user" where email = $1', [EMAILS.owner])).rowCount) {
      console.log("The demo clinic already exists. Nothing changed. Use --remove first to rebuild it.");
      await q("rollback");
      process.exit(0);
    }
    const password = process.env.DEMO_PASSWORD ?? generatePassword();
    const hash = await hashPassword(password);

    // People
    const userIds = {};
    for (const role of ["owner", "assistant", "practitioner"]) {
      userIds[role] = newId();
      await q('insert into "user" (id, name, email, email_verified) values ($1,$2,$3,true)', [userIds[role], NAMES[role], EMAILS[role]]);
      await q("insert into account (id, user_id, provider_id, account_id, password) values ($1,$2,'credential',$2,$3)", [newId(), userIds[role], hash]);
    }

    // Company, plan, clinic
    const accountId = randomUUID();
    const clinicId = randomUUID();
    await q("insert into accounts (id, owner_user_id, company_name) values ($1,$2,$3)", [accountId, userIds.owner, COMPANY]);
    await q("insert into subscriptions (account_id, tier, billing_interval, status, clinic_slot_limit, current_period_ends_at) values ($1,'tier_2','monthly','active',2,$2)", [accountId, new Date(Date.now() + 60 * 86400_000)]);
    await q("select set_config('app.current_account_id', $1, true), set_config('app.current_clinic_id', $2, true)", [accountId, clinicId]);
    await q("insert into clinics (id, account_id, name, subdomain, specialty, address, phone) values ($1,$2,$3,$4,'dental','Unit 5, Ayala Ave, Makati City','(02) 8555 0100')", [clinicId, accountId, COMPANY, SLUG]);

    const staffIds = {};
    for (const role of ["owner", "assistant", "practitioner"]) {
      staffIds[role] = randomUUID();
      await q("insert into clinic_staff (id, clinic_id, user_id, role, joined_at) values ($1,$2,$3,$4,now())", [staffIds[role], clinicId, userIds[role], role]);
    }

    // Price list
    const svc = {};
    for (const s of SERVICES) {
      svc[s.code] = { ...s, id: randomUUID() };
      await q("insert into services (id, clinic_id, name, code, category, duration_minutes, price_centavos, vat_exempt) values ($1,$2,$3,$4,$5,$6,$7,$8)", [svc[s.code].id, clinicId, s.name, s.code, s.category, s.minutes, s.price, s.vatExempt]);
    }

    // Patient fields (the clinic's own), then patients with answers
    for (const [index, f] of FIELDS.entries()) {
      await q("insert into patient_field_definitions (clinic_id, key, label, type, options, medical, section, sort_order, scope, created_by_staff_id) values ($1,$2,$3,$4,$5,$6,$7,$8,'standard',$9)", [clinicId, f.key, f.label, f.type, JSON.stringify(f.options), f.medical, f.section, index + 1, staffIds.owner]);
    }
    const patients = [];
    for (const [index, p] of PATIENTS.entries()) {
      const [first, last, sex, birth, mobile, email, phil, osca, alerts, allergies, emergency] = p;
      const custom = { medical_alerts: alerts, allergies: allergies.length ? allergies : ["None known"], emergency_contact: emergency, last_dental_visit: "2026-03-14" };
      if (!alerts.length) delete custom.medical_alerts;
      const id = randomUUID();
      await q(
        "insert into patients (id, clinic_id, medical_record_number, first_name, last_name, sex, date_of_birth, contact_phone, contact_email, philhealth_member_pin, osca_id, data_privacy_consent_at, custom_fields, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),$12,now() - ($13 || ' days')::interval)",
        [id, clinicId, `MRN-${String(index + 1).padStart(5, "0")}`, first, last, sex, birth, mobile, email, phil, osca, JSON.stringify(custom), String(40 - index * 3)],
      );
      patients.push({ id, name: `${first} ${last}`, mrn: `MRN-${String(index + 1).padStart(5, "0")}`, senior: Boolean(osca), osca });
    }

    // Appointments: some earlier (completed, with receipts), today's floor, tomorrow's bookings
    const appt = async (patient, day, hour, minute, code, status, practitioner = "practitioner", source = "phone", queue = null) => {
      const s = svc[code];
      const startsAt = manila(day, hour, minute);
      const id = randomUUID();
      await q(
        "insert into appointments (id, clinic_id, patient_id, practitioner_staff_id, service_id, starts_at, ends_at, status, source, queue_number, chair_or_room) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
        [id, clinicId, patient.id, staffIds[practitioner], s.id, startsAt, new Date(startsAt.getTime() + s.minutes * 60_000), status, source, queue, queue ? `Chair ${1 + (queue % 2)}` : null],
      );
      return id;
    };

    // Past: completed visits, each paid
    const history = [
      [-6, 10, 0, 0, "PROPHY", "cash"], [-5, 11, 0, 3, "FILL", "gcash"], [-4, 9, 30, 1, "CONS", "cash"], [-3, 14, 0, 7, "EXT", "maya"],
      [-2, 10, 30, 8, "WHITE", "card"], [-1, 9, 0, 3, "RCT", "cash"], [-1, 15, 0, 9, "XRAY", "cash"], [0, 9, 0, 5, "PROPHY", "gcash"],
    ];
    let seq = 0;
    for (const [day, hour, minute, who, code, method] of history) {
      const patient = patients[who];
      const appointmentId = await appt(patient, day, hour, minute, code, "completed");
      const s = svc[code];
      const lines = [{ price: s.price, qty: 1, vatExempt: s.vatExempt }];
      const t = totals(lines, patient.senior);
      seq++;
      const number = `OR-${String(seq).padStart(6, "0")}`;
      const issued = manila(day, hour + 1, minute);
      const invoiceId = randomUUID();
      await q(
        "insert into invoices (id, clinic_id, patient_id, appointment_id, invoice_number, discount_type, discount_id_number, discount_label, discount_kind, subtotal_cents, discount_cents, vat_cents, vat_exempt_cents, total_cents, paid_cents, status, issued_at, created_by_staff_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,'paid',$15,$16)",
        [invoiceId, clinicId, patient.id, appointmentId, number, patient.senior ? "senior_citizen" : "none", patient.senior ? patient.osca : null, patient.senior ? "Senior citizen (20%)" : null, patient.senior ? "statutory" : null, t.subtotal, t.discount, t.vat, t.vatExempt, t.total, issued, staffIds.assistant],
      );
      await q("insert into invoice_line_items (clinic_id, invoice_id, description, service_code, quantity, unit_price_cents, line_total_cents) values ($1,$2,$3,$4,1,$5,$5)", [clinicId, invoiceId, s.name, s.code, s.price]);
      await q("insert into payments (clinic_id, invoice_id, receipt_number, method, amount_cents, reference_number, paid_at) values ($1,$2,$3,$4,$5,$6,$7)", [clinicId, invoiceId, `PR-${String(seq).padStart(6, "0")}`, method, t.total, method === "cash" ? null : `REF${randomInt(100000, 999999)}`, issued]);
      await q("insert into audit_logs (clinic_id, actor_user_id, entity_type, entity_id, action, diff, created_at) values ($1,$2,'invoice',$3,'create',$4,$5)", [clinicId, userIds.assistant, invoiceId, JSON.stringify({ after: { number, totalCents: t.total, method } }), issued]);
      if (code === "RCT" || code === "FILL") {
        await q("insert into clinical_notes (clinic_id, patient_id, appointment_id, author_staff_id, note_type, data, created_at) values ($1,$2,$3,$4,'general',$5,$6)", [clinicId, patient.id, appointmentId, staffIds.practitioner, JSON.stringify({
          subjective: code === "RCT" ? "Throbbing pain lower right molar for 3 days, worse at night." : "Sensitivity to cold on upper left.",
          objective: code === "RCT" ? "Deep caries #46, tender to percussion. Radiograph: periapical radiolucency." : "Occlusal caries #25, no mobility.",
          assessment: code === "RCT" ? "Irreversible pulpitis with apical periodontitis #46." : "Moderate caries #25.",
          plan: code === "RCT" ? "RCT session 1 done. Return in 1 week for obturation, then crown." : "Composite restoration placed. Advise soft diet for 2 hours.",
        }), issued]);
      }
    }
    // A claim for the PhilHealth patient's visit, one denied, one paid
    const claims = [
      [0, "philhealth", "PhilHealth", "12-345678901-2", null, 80000, "filed", 3],
      [6, "hmo", "Maxicare", "MX-40988", "LOA-77120", 650000, "denied", 40],
      [3, "hmo", "Intellicare", "IC-22011", "LOA-55102", 150000, "paid", 70],
    ];
    for (const [who, type, payor, member, loa, amount, status, ageDays] of claims) {
      await q("insert into hmo_claims (clinic_id, patient_id, payor_type, payor_name, member_or_policy_number, loa_number, claim_amount_cents, status, filed_at, resolved_at) values ($1,$2,$3,$4,$5,$6,$7,$8,now() - ($9 || ' days')::interval,$10)", [clinicId, patients[who].id, type, payor, member, loa, amount, status, String(ageDays), status === "filed" ? null : new Date()]);
    }

    // Today's floor and tomorrow's bookings
    await appt(patients[1], 0, 10, 0, "PROPHY", "in_progress", "practitioner", "phone", 1);
    await appt(patients[2], 0, 11, 0, "CONS", "checked_in", "practitioner", "walk_in", 2);
    await appt(patients[3], 0, 13, 0, "EXT", "confirmed");
    await appt(patients[4], 0, 14, 30, "FILL", "confirmed");
    await appt(patients[10], 0, 16, 0, "CONS", "requested", "practitioner", "online");
    await appt(patients[5], 1, 9, 30, "PROPHY", "confirmed");
    await appt(patients[6], 1, 11, 0, "BRACE", "confirmed");
    await appt(patients[9], 1, 14, 0, "CONS", "confirmed");
    await appt(patients[11], 2, 10, 0, "XRAY", "requested", "practitioner", "online");

    // Stock
    for (const item of INVENTORY) {
      const itemId = randomUUID();
      await q("insert into inventory_items (id, clinic_id, name, sku, unit, reorder_threshold) values ($1,$2,$3,$4,$5,$6)", [itemId, clinicId, item.name, item.sku, item.unit, item.reorder]);
      for (const [qty, expiryDays] of item.lots) {
        await q("insert into inventory_batches (clinic_id, item_id, lot_number, quantity_on_hand, expires_on) values ($1,$2,$3,$4,(current_date + ($5 || ' days')::interval)::date)", [clinicId, itemId, `LOT-${randomInt(1000, 9999)}`, qty, String(expiryDays * 30)]);
      }
    }

    console.log(`Demo clinic ready: ${SLUG} (${patients.length} patients, ${SERVICES.length} services, ${history.length} paid visits).`);
    console.log(`Logins (same password):\n  owner        ${EMAILS.owner}\n  front desk   ${EMAILS.assistant}\n  practitioner ${EMAILS.practitioner}`);
    console.log(`Password (shown once): ${password}`);
  }
  if (DRY) {
    await q("rollback");
    console.log("Dry run: everything above was rolled back. Nothing was saved.");
  } else {
    await q("commit");
  }
  if (EMIT) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(EMIT, JSON.stringify(emitted));
    console.log(`Wrote ${emitted.length} statements to ${EMIT}.`);
  }
} catch (error) {
  await q("rollback").catch(() => {});
  throw error;
} finally {
  if (!EMIT) await pgClient.end();
}
