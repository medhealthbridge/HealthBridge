# Clinix PH — MVP demo guide and gap list

Status as of 2026-10-04. Everything below that says "real" reads and writes the database.

## 1. Load the demo clinic (one command)

The demo seeder creates one clinic, **Sunrise Dental (Demo)**, at subdomain `demo`, with three real logins:

| Role | Email | Lands on |
|---|---|---|
| Owner | `owner@demo.invalid` | Owner console (`/clinix-ph/admin`) |
| Front desk | `frontdesk@demo.invalid` | Today / Queue / Billing |
| Practitioner | `dentist@demo.invalid` | My schedule / patients / notes |

```bash
npm run db:seed:demo -- --dry-run   # runs everything, then rolls back: proves it works, saves nothing
npm run db:seed:demo                # adds the demo clinic; prints the shared password once
npm run db:seed:demo -- --remove    # deletes the demo clinic and its three users
```

Set `DEMO_PASSWORD` first if you want to choose the password. The script is idempotent (it does nothing if the demo owner exists) and every row belongs to the `demo` clinic or an `@demo.invalid` user, so removal is exact. It needs `DATABASE_URL` in `.env.local`.

What it loads: 8 dental services, 12 patients (two seniors with OSCA IDs, one PhilHealth member), custom patient fields, 8 paid visits with receipts (cash, GCash, Maya, card, senior discount maths), today's floor (in chair, waiting, booked, one online request), tomorrow's bookings, 6 stock items (one low, one with an expired lot), 3 claims (filed, denied, paid), two visit notes.

## 2. A 10-minute demo script

1. **Owner → Overview.** Revenue today vs last week, today's appointments, collections by payment method, stock alerts.
2. **Services & pricing.** Show the price list; change a price.
3. **Patients → Ben Cruz (senior).** Chart, custom fields ("More details"), medical alerts; invite to portal.
4. **Appointments.** Book for tomorrow; reschedule; show the practitioner-busy refusal.
5. **Billing.** New checkout for Ben Cruz with the senior discount: VAT backed out first, then 20%. Open the receipt (OR-0000xx). Void needs a reason and is owner-only.
   Then try pay-later: set "Paying now" lower than the total (or ₱0), split the rest into installments, and record the next payment from the receipt (PR- numbers). Billing → On account lists who owes. Discounts beyond senior/PWD: owner creates saved ones in Settings → Discounts, or types a one-off with its own description at checkout.
   **Dental flow.** Patients → open a chart: *Tooth chart* (owner and dentist only) has a 3D model (drag, pinch, tap a tooth) and a flat tab; record findings and work per tooth and surface, void with a reason. *Treatment plans*: create a plan with phases, add items from the price list, mark shown/agreed (the front desk can do this), mark items done (charts the work on the tooth), then Bill from plan at checkout. *Recalls*: optional "remind them to come back" at checkout, or add one manually; a reminder list, never a booking.
6. **Inventory.** Record use of Lidocaine; see "Composite resin" low and "Fluoride varnish" with an expired lot.
7. **Claims.** File a Maxicare claim; move the denied one to resubmitted.
8. **Settings → Patient fields.** Built-ins read-only; add a field from the dental suggestions; retire one and show the answers are kept.
9. **Log in as front desk.** No clinical notes, no medical fields, can't void.
10. **Log in as practitioner.** Own schedule, write a SOAP note, add an add-on field.
11. **Activity log + Import/Export.** Every action above is recorded; export receipts as CSV.

Optional, needs keys: switch on the AI assistant (admin → AI settings) and ask "how is the clinic doing today?" then "receive 20 lidocaine".

## 3. What is real

Staff invites and roles · services & prices · patients (add, edit, archive, restore) · configurable patient fields · appointments and queue · clinical notes · checkout (discounts, pay later, installments), receipts, payments, void · treatment plans · 3D tooth chart · recalls · inventory · claims · activity log · overview · patient portal (read-only) · email reminders (daily cron + send now) · CSV export and patient import · tenants, company staff, AI settings in the company admin · the three-layer assistant (rules → Gemini → Claude, confirm-first writes).

## 4. What is still missing (in the order I would do it)

**Before any real clinic uses it**
1. **Database security.** Done on the database side (policies hardened, restricted `clinix_app` role created and tested). **Still to do: the cutover** — set its password and point `DATABASE_URL` at it in Vercel (5 minutes, see `docs/db-app-role.md`). Until then the app still connects as the owner and the policies are not enforced.
2. **Live verification** — never exercised against real services: invite and reminder emails (Resend), PayMongo/Xendit checkout, domain purchase through Vercel, the AI keys. Run the checklist in section 5.
3. **Subscription billing after month 1** — renewals, failed-payment handling, the past-due lockout.
4. **Legal pages and consent copy** — Terms, Privacy Policy, data-processing notice; NPC/DPO details (RA 10173).
5. **Backups and monitoring** — Neon point-in-time restore window, error tracking, uptime check.

**Product gaps**
6. Console **Modules** and **Feedback** pages, and company admin **Overview, Billing, Support, Audit, Feedback, Modules**, still show sample data.
7. **SMS / Viber reminders** (needs a provider; email only today).
8. ~~Add-patient form and CSV import don't read the clinic's custom fields~~ — done: the add form asks them (role-filtered, required enforced) and the import fills them from columns named like the fields.
9. Practitioners can't see invoices or edit contact details for their own patients.
10. The AI assistant doesn't see custom fields and has no tools for the patient portal.
11. No automated browser tests (only unit tests).

## 5. First live-test checklist

- [ ] `CRON_SECRET` set in Vercel (reminders job refuses to run without it).
- [ ] Redeploy so functions run in Singapore (`vercel.json`), then check the Functions region in project settings.
- [ ] Rotate the two Resend keys that were exposed earlier.
- [ ] Paste the Gemini key in **admin → AI settings**; turn on the patient-data switch; grant the demo account AI access.
- [ ] Send a staff invite and a patient-portal invite to a real inbox; confirm both arrive.
- [ ] Add a patient reminder email, enable daily reminders, press **Send now**.
- [ ] Run one test payment through PayMongo or Xendit with test keys.
