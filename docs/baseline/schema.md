# Database inventory: Clinix PH (repo /home/claude/work/hb)

Sources read: `src/server/db/schema/*.ts` (15 files), `src/server/db/client.ts`, `src/server/db/migrations/0000..0020 *.sql` + `meta/_journal.json` + `meta/0020_snapshot.json`, `docs/db-app-role.md`, `scripts/create-app-role.sql`, `drizzle.config.ts`. Service-layer greps for audit inserts and helper usage.

Conventions that apply to every table unless stated:
- Postgres (Neon), Drizzle ORM, `pg` Pool. Schema public. 40 tables, 1 pgEnum.
- All timestamps are `timestamp with time zone`. All `uuid` PKs are `default gen_random_uuid()`.
- Every FK is `ON DELETE no action ON UPDATE no action` EXCEPT `session.user_id` and `account.user_id` (both `ON DELETE cascade`).
- No CHECK constraints exist anywhere (snapshot `checkConstraints` empty on all 40 tables). All status/type lists are `text` + app-side validation, except `staff_role` (pgEnum).
- Money is integer centavos/cents (`*_cents`, `*_centavos`), except `domain_orders.vercel_price_usd` numeric(10,2).
- Tenant-safe composite FKs: child tables FK to `(clinic_id, id)` of the parent (parents carry `UNIQUE(clinic_id, id)`), so a child can never point at another clinic's row. Because the staff/appointment/etc. reference column is nullable, a NULL passes the composite FK (MATCH SIMPLE).
- Column format below: `name | type | null? | default | unique/check | FK -> target (on delete)`. "NN" = NOT NULL, "Y" = nullable. FKs shown as `-> x` all mean ON DELETE no action unless noted.

---------------------------------------------------------------------
## 1. Entities

Tenant-column summary
- `clinic_id`: clinic_staff, staff_invites, patients, patient_attachments, clinical_notes, recalls, patient_invites, patient_field_definitions, appointments, invoices, invoice_line_items, payments, hmo_claims, invoice_installments, discount_types, inventory_items, inventory_batches, audit_logs, reminder_log, services, treatment_plans, treatment_plan_items, dental_chart_entries, domain_lookups, domain_orders (also account_id), agent_actions (nullable).
- `account_id` only: subscriptions, inventory_transfers (plus from_clinic_id/to_clinic_id). `clinics.account_id`. `accounts.id` is itself the tenant key.
- NO tenant column (global): user, session, account, verification, platform_admins, platform_invites, platform_secrets, platform_settings, agent_usage, rate_limits. `agent_actions.clinic_id` is nullable (null = company-admin action).

### 1.1 better-auth tables (auth.ts; owned by better-auth, ids are text not uuid)

**user** : login identity for everyone (staff, owners, patients, platform admins).
| col | type | null | default | unique/check | FK |
|---|---|---|---|---|---|
| id | text | NN | | PK | |
| name | text | NN | | | |
| email | text | NN | | UNIQUE | |
| email_verified | boolean | NN | false | | |
| image | text | Y | | | |
| created_at | timestamptz | NN | now() | | |
| updated_at | timestamptz | NN | now() | | |

**session** : better-auth sessions.
| id | text | NN | | PK | |
| user_id | text | NN | | | -> user.id (CASCADE) |
| token | text | NN | | UNIQUE | |
| expires_at | timestamptz | NN | | | |
| ip_address | text | Y | | | |
| user_agent | text | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |

**account** (singular; better-auth OAuth/credential link, NOT the billing `accounts`) 
| id | text | NN | | PK | |
| user_id | text | NN | | | -> user.id (CASCADE) |
| provider_id | text | NN | | | |
| account_id | text | NN | | | |
| access_token, refresh_token, id_token, scope | text | Y | | | |
| access_token_expires_at, refresh_token_expires_at | timestamptz | Y | | | |
| password | text | Y | | | (credential hash) |
| created_at / updated_at | timestamptz | NN | now() | | |

**verification** : better-auth email/OTP tokens.
| id | text | NN | | PK |
| identifier | text | NN | | |
| value | text | NN | | |
| expires_at | timestamptz | NN | | |
| created_at / updated_at | timestamptz | NN | now() | |

### 1.2 Tenancy / billing-account (tenancy.ts)

**accounts** : billing entity, one per owner; owns 1..n clinics. Tenant key = `id`. No deleted_at (never deleted; "masterlock" instead).
| id | uuid | NN | gen_random_uuid() | PK | |
| owner_user_id | text | NN | | UNIQUE (`accounts_owner_user_id_unique`) | -> user.id |
| company_name | text | NN | | | |
| ai_assistant_enabled | boolean | NN | false | | (granted by platform admin; added 0010) |
| created_at | timestamptz | NN | now() | | |
| updated_at | timestamptz | NN | now() ($onUpdate) | | |

**clinics** : a tenant (one clinic/branch, one subdomain).
| id | uuid | NN | gen_random_uuid() | PK | |
| account_id | uuid | NN | | | -> accounts.id |
| name | text | NN | | | |
| subdomain | text | NN | | UNIQUE | |
| specialty | text | NN | | | (comment: 'dental'\|'eye'\|'vet'\|'derma'\|'general'; see enum section) |
| address, phone | text | Y | | | |
| timezone | text | NN | 'Asia/Manila' | | |
| business_hours | jsonb | Y | | | |
| reminders_enabled | boolean | NN | false | | (0016) |
| branding_primary_color, branding_accent_color | text | Y | | | |
| branding_font | text | Y | | | (FONT_PAIRINGS key; 0002) |
| logo_url | text | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |
Indexes: `clinics_account_id_idx(account_id)`; `UNIQUE clinics_account_id_id_unique(account_id,id)` (target of inventory_transfers composite FKs).

**subscriptions** : one per account.
| id | uuid | NN | gen_random_uuid() | PK | |
| account_id | uuid | NN | | UNIQUE | -> accounts.id |
| tier | text | NN | | | 'tier_1'..'tier_4' \| 'enterprise' (comment) |
| billing_interval | text | NN | | | 'monthly' \| 'annual' (comment) |
| status | text | NN | | | 'trialing'\|'active'\|'past_due'\|'masterlocked'\|'canceled' (comment) |
| clinic_slot_limit | integer | NN | | | |
| trial_ends_at, current_period_ends_at | timestamptz | Y | | | |
| stripe_customer_id, stripe_subscription_id | text | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |

**domain_lookups** : host -> clinic routing (subdomain now, custom domains later).
| domain | text | NN | | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| created_at | timestamptz | NN | now() | | |
Index: `domain_lookups_clinic_id_idx(clinic_id)`.

**domain_orders** : onboarding purchase (first plan month + custom domain), driven by payment webhook.
| id | uuid | NN | gen_random_uuid() | PK | |
| account_id | uuid | NN | | | -> accounts.id |
| clinic_id | uuid | NN | | | -> clinics.id |
| domain | text | NN | | partial unique (below) | |
| years | integer | NN | 1 | | |
| vercel_price_usd | numeric(10,2) | NN | | | |
| plan_centavos, domain_centavos, total_centavos | integer | NN | | | |
| provider | text | NN | | | 'paymongo' \| 'xendit' (comment) |
| provider_ref | text | Y | | | checkout/invoice id |
| status | text ($type DomainOrderStatus) | NN | 'pending_payment' | | see enums |
| vercel_order_id, failure_reason | text | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |
| deleted_at | timestamptz | Y | | | (0006; "billing-row convention", orders never deleted) |
Indexes: `domain_orders_clinic_id_idx(clinic_id)`; `UNIQUE domain_orders_domain_live_idx(domain) WHERE status in ('pending_payment','paid','purchasing','active','needs_review')`; `domain_orders_provider_ref_idx(provider, provider_ref)`.

### 1.3 Staff / platform team (staff.ts)

Enum **staff_role** = ('owner','practitioner','assistant') (pgEnum).

**clinic_staff** : membership of a user at one clinic.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| user_id | text | NN | | | -> user.id |
| role | staff_role | NN | | | |
| pin_hash | text | Y | | | front-desk quick PIN |
| is_active | boolean | NN | true | | |
| invited_at, joined_at | timestamptz | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |
| deleted_at | timestamptz | Y | | | |
Indexes: `clinic_staff_clinic_id_idx(clinic_id)`; `UNIQUE clinic_staff_clinic_id_id_unique(clinic_id,id)`; `UNIQUE clinic_staff_clinic_user_active_idx(clinic_id,user_id) WHERE deleted_at is null`.

**staff_invites** : emailed staff invitation (token hash only).
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| email | text | NN | | | |
| role | staff_role | NN | | | |
| invited_by_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) via `staff_invites_invited_by_fk` |
| token_hash | text | NN | | UNIQUE (`staff_invites_token_hash_unique`) | (SHA-256 hex; renamed from `token` in 0004, existing rows hashed in place) |
| status | text | NN | 'pending' | | 'pending'\|'accepted'\|'revoked'\|'expired' (comment) |
| expires_at | timestamptz | NN | | | |
| created_at | timestamptz | NN | now() | | |
Index: `staff_invites_clinic_id_idx(clinic_id)`.

**platform_admins** : DataBridgeSol team. Global.
| id | uuid | NN | gen_random_uuid() | PK | |
| user_id | text | NN | | UNIQUE | -> user.id |
| role | text ($type PlatformRole) | NN | 'staff' | | 'super_admin'\|'staff' |
| is_active | boolean | NN | true | | |
| created_at | timestamptz | NN | now() | | |

**platform_invites** : emailed invite to join platform team. Global.
| id | uuid | NN | gen_random_uuid() | PK | |
| email | text | NN | | | |
| token_hash | text | NN | | UNIQUE | |
| status | text ($type PlatformInviteStatus) | NN | 'pending' | | 'pending'\|'accepted'\|'revoked' |
| invited_by_user_id | text | NN | | | -> user.id |
| expires_at | timestamptz | NN | | | |
| created_at | timestamptz | NN | now() | | |
Index: `platform_invites_email_idx(email)`.

### 1.4 Patients (patients.ts)

**patients** : core patient record (human or animal).
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| medical_record_number | text | NN | | partial unique | |
| patient_kind | text | NN | 'human' | | 'human'\|'animal' (comment) |
| first_name, last_name, display_name | text | Y | | | |
| date_of_birth | date | Y | | | |
| sex | text | Y | | | app validates 'F'\|'M' |
| species_breed, guardian_or_owner_name | text | Y | | | vet fields |
| contact_phone, contact_email, address | text | Y | | | |
| osca_id, pwd_id, philhealth_member_pin | text | Y | | | |
| data_privacy_consent_at | timestamptz | Y | | | RA 10173 |
| portal_user_id | text | Y | | partial unique | -> user.id |
| custom_fields | jsonb ($type Record<string,unknown>) | NN | '{}' | | (0017) |
| created_at / updated_at | timestamptz | NN | now() | | |
| deleted_at | timestamptz | Y | | | |
Indexes: `patients_clinic_id_idx`; `UNIQUE patients_clinic_id_id_unique(clinic_id,id)`; `patients_clinic_name_idx(clinic_id,last_name,first_name)`; `UNIQUE patients_clinic_mrn_active_idx(clinic_id,medical_record_number) WHERE deleted_at is null`; `UNIQUE patients_portal_user_id_idx(portal_user_id) WHERE portal_user_id is not null`.

**patient_attachments** : file metadata (private bucket key). NOTE: not referenced by any code outside the schema (unused table).
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| patient_id | uuid | NN | | | -> patients(clinic_id,id) `patient_attachments_patient_fk` |
| uploaded_by_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) `patient_attachments_uploaded_by_fk` |
| file_type | text | NN | | | 'xray'\|'lab'\|'photo'\|'document' (comment) |
| label | text | Y | | | |
| storage_key | text | NN | | | (renamed from file_url in 0004) |
| created_at | timestamptz | NN | now() | | |
| deleted_at | timestamptz | Y | | | |
Index: `patient_attachments_clinic_patient_idx(clinic_id,patient_id)`.

**clinical_notes** : encounter documentation keyed by note_type, `data` jsonb.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| patient_id | uuid | NN | | | -> patients(clinic_id,id) `clinical_notes_patient_fk` |
| appointment_id | uuid | Y | | | -> appointments(clinic_id,id) `clinical_notes_appointment_fk` |
| author_staff_id | uuid | NN | | | -> clinic_staff(clinic_id,id) `clinical_notes_author_fk` |
| note_type | text | NN | | | 'general'\|'odontogram'\|'refraction'\|'vaccine_card'\|'treatment_plan' (comment) |
| data | jsonb | NN | '{}' | | |
| created_at / updated_at | timestamptz | NN | now() | | |
| deleted_at | timestamptz | Y | | | (used as "void": audit says `voided: true`) |
Index: `clinical_notes_clinic_patient_idx(clinic_id,patient_id)`.

**recalls** : dental recalls, vaccine due, post-procedure check-ins.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| patient_id | uuid | NN | | | -> patients(clinic_id,id) `recalls_patient_fk` |
| recall_type | text | NN | | | 'dental_recall'\|'vaccine_due'\|'post_procedure_checkin' (comment) |
| due_date | date | NN | | | |
| status | text | NN | 'pending' | | 'pending'\|'notified'\|'completed'\|'cancelled' (comment) |
| notified_at, completed_at | timestamptz | Y | | | |
| notes | text | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |
Indexes: `recalls_clinic_due_date_idx(clinic_id,due_date)`; `recalls_clinic_patient_idx(clinic_id,patient_id)`. No deleted_at (cancel via status).

**patient_invites** : emailed patient-portal invite (0015).
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| patient_id | uuid | NN | | | -> patients(clinic_id,id) `patient_invites_patient_fk` |
| email | text | NN | | | |
| token_hash | text | NN | | UNIQUE (`patient_invites_token_hash_unique`) | |
| status | text | NN | 'pending' | | 'pending'\|'accepted'\|'revoked' (comment) |
| invited_by_staff_id | uuid | Y | | | NO FK declared (plain uuid; unlike staff_invites) |
| expires_at | timestamptz | NN | | | |
| created_at | timestamptz | NN | now() | | |
Index: `patient_invites_clinic_patient_idx(clinic_id,patient_id)`.

**patient_field_definitions** : clinic-defined custom patient fields (0017).
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| key | text | NN | | UNIQUE with clinic_id | |
| label | text | NN | | | |
| type | text | NN | | | see enums (FIELD_TYPES) |
| options | jsonb ($type string[]) | NN | '[]' | | |
| required, medical | boolean | NN | false | | |
| section | text | NN | 'Other details' | | |
| sort_order | integer | NN | 0 | | |
| scope | text | NN | 'standard' | | 'standard'(owner)\|'addon'(practitioner) |
| created_by_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) `patient_field_definitions_created_by_fk` |
| archived_at | timestamptz | Y | | | soft-archive |
| created_at / updated_at | timestamptz | NN | now() | | |
Indexes: `UNIQUE patient_field_definitions_clinic_key_idx(clinic_id,key)`; `patient_field_definitions_clinic_order_idx(clinic_id,sort_order)`.

### 1.5 Scheduling (appointments.ts, reminders.ts, services.ts)

**appointments** : bookings + walk-in queue.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| patient_id | uuid | NN | | | -> patients(clinic_id,id) `appointments_patient_fk` |
| practitioner_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) `appointments_practitioner_fk` |
| service_id | uuid | Y | | | -> services(clinic_id,id) `appointments_service_fk` (0013) |
| confirmed_by_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) `appointments_confirmed_by_fk` |
| chair_or_room | text | Y | | | |
| starts_at, ends_at | timestamptz | NN | | | no CHECK ends_at > starts_at |
| status | text | NN | 'requested' | | see enums |
| source | text | NN | 'walk_in' | | 'walk_in'\|'online'\|'phone' (comment) |
| queue_number | integer | Y | | | |
| notes | text | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |
| deleted_at | timestamptz | Y | | | |
Indexes: `appointments_clinic_starts_at_idx(clinic_id,starts_at)`; `appointments_clinic_patient_idx(clinic_id,patient_id)`; `UNIQUE appointments_clinic_id_id_unique(clinic_id,id)`. No double-booking constraint.

**reminder_log** : one row per reminder attempt (0016). Dedup by unique index.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| appointment_id | uuid | NN | | | -> appointments(clinic_id,id) `reminder_log_appointment_fk` |
| kind | text | NN | 'day_before' | | |
| channel | text | NN | 'email' | | |
| status | text | NN | | | 'sent'\|'failed' (comment) |
| error | text | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |
Indexes: `UNIQUE reminder_log_appointment_kind_idx(appointment_id,kind,channel)`; `reminder_log_clinic_created_idx(clinic_id,created_at)`.

**services** : clinic price list (0011).
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| name | text | NN | | partial unique | |
| code, category | text | Y | | | |
| duration_minutes | integer | Y | | | |
| price_centavos | integer | NN | | | |
| vat_exempt | boolean | NN | false | | |
| is_active | boolean | NN | true | | |
| created_at / updated_at | timestamptz | NN | now() | | |
| deleted_at | timestamptz | Y | | | |
Indexes: `services_clinic_id_idx`; `UNIQUE services_clinic_id_id_unique(clinic_id,id)`; `UNIQUE services_clinic_name_active_idx(clinic_id, lower(name)) WHERE deleted_at is null`.

### 1.6 Billing (billing.ts)

**invoices** : one BIR official receipt per invoice.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| patient_id | uuid | NN | | | -> patients(clinic_id,id) `invoices_patient_fk` |
| appointment_id | uuid | Y | | | -> appointments(clinic_id,id) `invoices_appointment_fk` |
| invoice_number | text | NN | | UNIQUE with clinic_id | |
| discount_type | text | NN | 'none' | | 'none'\|'senior_citizen'\|'pwd' (comment; app also accepts 'saved','custom' in input) |
| discount_id_number | text | Y | | | |
| subtotal_cents | integer | NN | | | |
| discount_cents, vat_cents, vat_exempt_cents | integer | NN | 0 | | |
| total_cents | integer | NN | | | |
| status | text | NN | 'draft' | | 'draft'\|'paid'\|'void' (comment) |
| issued_at | timestamptz | Y | | | |
| discount_label | text | Y | | | (0019) |
| discount_kind | text | Y | | | 'statutory'\|'percent'\|'fixed'\|null |
| discount_value | integer | Y | | | percent 1-100 or centavos |
| paid_cents | integer | NN | 0 | | (0019) kept in step with payments |
| void_reason | text | Y | | | (0014) |
| voided_at | timestamptz | Y | | | (0014) |
| created_by_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) `invoices_created_by_fk` |
| created_at / updated_at | timestamptz | NN | now() | | |
Indexes: `UNIQUE invoices_clinic_invoice_number_idx(clinic_id,invoice_number)`; `invoices_clinic_patient_idx`; `invoices_clinic_issued_at_idx(clinic_id,issued_at)`; `UNIQUE invoices_clinic_id_id_unique(clinic_id,id)`.

**invoice_line_items**
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| invoice_id | uuid | NN | | | -> invoices(clinic_id,id) `invoice_line_items_invoice_fk` |
| description | text | NN | | | |
| service_code | text | Y | | | |
| tooth | text | Y | | | FDI (0019) |
| plan_item_id | uuid | Y | | | NO FK declared (0019) |
| quantity | integer | NN | 1 | | |
| unit_price_cents, line_total_cents | integer | NN | | | |
Index: `invoice_line_items_clinic_invoice_idx(clinic_id,invoice_id)`. No timestamps.

**payments** : all tenders settle here.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| invoice_id | uuid | NN | | | -> invoices(clinic_id,id) `payments_invoice_fk` |
| receipt_number | text | Y | | | 'PR-000001' (0019); NOT unique-indexed |
| method | text | NN | | | 'cash'\|'gcash'\|'maya'\|'card'\|'hmo' (comment) vs PAYMENT_METHODS (see enums) |
| amount_cents | integer | NN | | | |
| reference_number | text | Y | | | |
| paid_at | timestamptz | NN | now() | | |
| created_at | timestamptz | NN | now() | | |
Index: `payments_clinic_invoice_idx(clinic_id,invoice_id)`.

**hmo_claims** : PhilHealth/HMO claims.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| patient_id | uuid | NN | | | -> patients(clinic_id,id) `hmo_claims_patient_fk` |
| invoice_id | uuid | Y | | | -> invoices(clinic_id,id) `hmo_claims_invoice_fk` |
| payor_type | text | NN | | | 'hmo'\|'philhealth' |
| payor_name | text | NN | | | |
| member_or_policy_number, loa_number | text | Y | | | |
| claim_amount_cents | integer | NN | | | |
| status | text | NN | 'filed' | | see enums |
| filed_at, resolved_at | timestamptz | Y | | | |
| notes | text | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |
Indexes: `hmo_claims_clinic_status_idx(clinic_id,status)`; `hmo_claims_clinic_patient_idx`.

**invoice_installments** (0019)
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| invoice_id | uuid | NN | | | -> invoices(clinic_id,id) `invoice_installments_invoice_fk` |
| sequence | integer | NN | | | |
| due_on | date | NN | | | |
| amount_cents | integer | NN | | | |
Indexes: `invoice_installments_clinic_invoice_idx`; `invoice_installments_clinic_due_idx(clinic_id,due_on)`. Paid-ness derived from invoices.paid_cents (no paid flag).

**discount_types** : owner-defined discounts (0019). Senior/PWD are NOT rows (hard-coded by law).
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| name | text | NN | | partial unique | |
| description | text | Y | | | |
| kind | text | NN | | | 'percent'\|'fixed' |
| value | integer | NN | | | percent 1-100 or centavos (no CHECK) |
| requires_id | boolean | NN | false | | |
| archived_at | timestamptz | Y | | | |
| created_at | timestamptz | NN | now() | | |
Index: `UNIQUE discount_types_clinic_name_idx(clinic_id, lower(name)) WHERE archived_at is null`.

### 1.7 Inventory (inventory.ts)

**inventory_items**
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| name | text | NN | | | |
| sku | text | Y | | partial unique | |
| unit | text | NN | 'unit' | | |
| reorder_threshold | integer | NN | 0 | | |
| is_active | boolean | NN | true | | |
| created_at / updated_at | timestamptz | NN | now() | | |
| deleted_at | timestamptz | Y | | | |
Indexes: `inventory_items_clinic_id_idx`; `UNIQUE inventory_items_clinic_id_id_unique(clinic_id,id)`; `UNIQUE inventory_items_clinic_sku_active_idx(clinic_id,sku) WHERE sku is not null and deleted_at is null`.

**inventory_batches** : lot-level stock; quantity on hand is the sum of batches.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| item_id | uuid | NN | | | -> inventory_items(clinic_id,id) `inventory_batches_item_fk` |
| lot_number | text | Y | | | |
| quantity_on_hand | integer | NN | 0 | | no CHECK >= 0 |
| expires_on | date | Y | | | |
| received_at | timestamptz | NN | now() | | |
| created_at | timestamptz | NN | now() | | |
Indexes: `inventory_batches_clinic_item_idx`; `inventory_batches_clinic_expires_on_idx(clinic_id,expires_on)`.

**inventory_transfers** : inter-branch transfer, account-scoped. NOTE: not referenced by any code outside the schema (unused table).
| id | uuid | NN | gen_random_uuid() | PK | |
| account_id | uuid | NN | | | -> accounts.id |
| from_clinic_id, to_clinic_id | uuid | NN | | | -> clinics(account_id,id) `inventory_transfers_from_clinic_fk` / `_to_clinic_fk` |
| item_id | uuid | NN | | | -> inventory_items(clinic_id,id) using (from_clinic_id,item_id) `inventory_transfers_item_fk` |
| quantity | integer | NN | | | no CHECK > 0 |
| status | text | NN | 'pending' | | 'pending'\|'approved'\|'rejected'\|'completed' (comment) |
| requested_by_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) using (from_clinic_id,...) `inventory_transfers_requested_by_fk` |
| approved_by_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) using (to_clinic_id,...) `inventory_transfers_approved_by_fk` |
| requested_at | timestamptz | NN | now() | | |
| resolved_at | timestamptz | Y | | | |
| notes | text | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |
Indexes: `inventory_transfers_account_id_idx`, `_from_clinic_id_idx`, `_to_clinic_id_idx`. Nothing stops from_clinic_id = to_clinic_id.

### 1.8 Dental (dental.ts, 0019/0020)

**treatment_plans**
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| patient_id | uuid | NN | | | -> patients(clinic_id,id) `treatment_plans_patient_fk` |
| title | text | NN | | | |
| status | text ($type PlanStatus) | NN | 'draft' | | PLAN_STATUSES |
| phase_labels | jsonb (string[]) | NN | '[]' | | |
| notes | text | Y | | | |
| created_by_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) `treatment_plans_created_by_fk` |
| accepted_at | timestamptz | Y | | | |
| created_at / updated_at | timestamptz | NN | now() | | |
Indexes: `treatment_plans_clinic_patient_idx`; `UNIQUE treatment_plans_clinic_id_id_unique(clinic_id,id)`. No deleted_at (cancel via status).

**treatment_plan_items**
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| plan_id | uuid | NN | | | -> treatment_plans(clinic_id,id) `treatment_plan_items_plan_fk` |
| phase | integer | NN | 1 | | |
| service_id | uuid | Y | | | -> services(clinic_id,id) `treatment_plan_items_service_fk` |
| description | text | NN | | | |
| tooth | integer | Y | | | FDI; null = whole mouth |
| surfaces | text | Y | | | |
| chart_code | text | Y | | | (0020) |
| quantity | integer | NN | 1 | | |
| unit_price_cents | integer | NN | | | snapshot |
| vat_exempt | boolean | NN | false | | |
| status | text ($type PlanItemStatus) | NN | 'planned' | | PLAN_ITEM_STATUSES |
| done_at | timestamptz | Y | | | |
| done_by_staff_id | uuid | Y | | | NO FK declared |
| invoice_id | uuid | Y | | | -> invoices(clinic_id,id) `treatment_plan_items_invoice_fk` |
| sort_order | integer | NN | 0 | | |
| created_at | timestamptz | NN | now() | | |
Index: `treatment_plan_items_clinic_plan_idx(clinic_id,plan_id)`.

**dental_chart_entries** : append-only tooth chart; mistakes are voided.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| patient_id | uuid | NN | | | -> patients(clinic_id,id) `dental_chart_entries_patient_fk` |
| tooth | integer | NN | | | FDI two-digit |
| surfaces | text | Y | | | e.g. "MO" |
| kind | text | NN | | | CHART_KINDS 'condition'\|'procedure' |
| code | text | NN | | | see src/lib/dental-chart.ts |
| note | text | Y | | | |
| occurred_on | date | NN | | | |
| appointment_id | uuid | Y | | | -> appointments(clinic_id,id) `dental_chart_entries_appointment_fk` |
| plan_item_id | uuid | Y | | | NO FK declared |
| author_staff_id | uuid | Y | | | -> clinic_staff(clinic_id,id) `dental_chart_entries_author_fk` |
| voided_at | timestamptz | Y | | | |
| void_reason | text | Y | | | |
| created_at | timestamptz | NN | now() | | |
Index: `dental_chart_entries_clinic_patient_idx`.

### 1.9 Audit (audit.ts)

**audit_logs** : append-only audit trail.
| id | uuid | NN | gen_random_uuid() | PK | |
| clinic_id | uuid | NN | | | -> clinics.id |
| actor_user_id | text | NN | | | -> user.id |
| entity_type | text | NN | | | free text; see section 6 |
| entity_id | uuid | NN | | | no FK (polymorphic) |
| action | text | NN | | | 'create'\|'update'\|'delete'\|'view' |
| diff | jsonb | Y | | | |
| created_at | timestamptz | NN | now() | | |
Index: `audit_logs_clinic_entity_idx(clinic_id,entity_type,entity_id)`. No index on (clinic_id, created_at) though the Activity log page presumably sorts by time.

### 1.10 Platform / AI / infra (agent.ts, rate-limits.ts)

**agent_actions** : AI assistant proposals awaiting human approval. Global-ish.
| id | uuid | NN | gen_random_uuid() | PK | |
| user_id | text | NN | | | -> user.id |
| clinic_id | uuid | Y | | | -> clinics.id (null for company-admin proposals; 0010) |
| kind | text | NN | | | e.g. 'invite_admin','update_patient','archive_patient' |
| risk | text ($type 'create'\|'edit'\|'delete') | NN | 'edit' | | (0010) |
| args | jsonb | NN | | | |
| summary | text | NN | | | |
| status | text ($type AgentActionStatus) | NN | 'pending' | | AGENT_ACTION_STATUSES |
| result | text | Y | | | |
| expires_at | timestamptz | NN | | | |
| created_at | timestamptz | NN | now() | | |
| decided_at | timestamptz | Y | | | |
Index: `agent_actions_user_id_idx(user_id,created_at)`.

**agent_usage** : one row per assistant answer (no text stored).
| id | uuid | NN | gen_random_uuid() | PK | |
| user_id | text | NN | | | -> user.id |
| feature | text | NN | 'admin_assistant' | | |
| layer | text | NN | | | 'rule'\|'ai' |
| provider | text | Y | | | 'gemini'\|'anthropic' |
| model | text | Y | | | |
| input_tokens, output_tokens | integer | NN | 0 | | |
| created_at | timestamptz | NN | now() | | |
Index: `agent_usage_user_created_idx(user_id,created_at)`.

**platform_secrets** : encrypted API keys (AES-256-GCM).
| key | text ($type SecretKey) | NN | | PK | |
| value_encrypted | text | NN | | | |
| last4 | text | NN | | | |
| updated_by_user_id | text | NN | | | -> user.id |
| updated_at | timestamptz | NN | now() | | (no $onUpdate) |

**platform_settings** : company-wide switches.
| key | text | NN | | PK | |
| value | text | NN | | | |
| updated_by_user_id | text | NN | | | -> user.id |
| updated_at | timestamptz | NN | now() | | |

**rate_limits** : fixed-window counters.
| key | text | NN | | PK | (SHA-256 of bucket+subject) |
| count | integer | NN | | | |
| window_start | timestamptz | NN | | | |

---------------------------------------------------------------------
## 2. Enumerations

DB-level enum (only one):
- `staff_role` pgEnum: `owner`, `practitioner`, `assistant` -> `clinic_staff.role`, `staff_invites.role`. App constants: `STAFF_ROLES = ["owner","assistant","practitioner"]` (src/lib/clinic-app-nav.ts), `INVITABLE_STAFF_ROLES = ["practitioner","assistant"]` (src/lib/constants.ts).

Const tuples in schema files (all stored in `text` columns, no DB enforcement):
- `PLATFORM_ROLES` = super_admin, staff -> `platform_admins.role` (default staff).
- `PLATFORM_INVITE_STATUSES` = pending, accepted, revoked -> `platform_invites.status`.
- `DOMAIN_ORDER_STATUSES` = pending_payment, paid, purchasing, active, needs_review, expired -> `domain_orders.status`.
- `AGENT_ACTION_STATUSES` = pending, executed, cancelled, failed -> `agent_actions.status`. `agent_actions.risk` $type create|edit|delete.
- `SECRET_KEYS` = gemini_api_key, anthropic_api_key -> `platform_secrets.key`.
- `PLAN_STATUSES` = draft, proposed, accepted, in_progress, completed, cancelled -> `treatment_plans.status`. (Zod `planStatusSchema` only permits draft, proposed, accepted, cancelled; completed/in_progress set elsewhere, `z.enum(["completed","cancelled"])` outcome in actions/dental.ts:160.)
- `PLAN_ITEM_STATUSES` = planned, done, cancelled -> `treatment_plan_items.status`.
- `CHART_KINDS` = condition, procedure -> `dental_chart_entries.kind` (declared but column typed plain text).

Const tuples elsewhere that map to columns:
- `FIELD_TYPES` (src/lib/patient-fields.ts) = text, long_text, number, date, yes_no, select, multi_select -> `patient_field_definitions.type`.
- `CLAIM_STATUSES` (src/lib/schemas/claim.ts) = filed, pending, approved, denied, resubmitted, paid, withdrawn -> `hmo_claims.status`. NOTE schema comment omits `withdrawn`.
- `PAYOR_TYPES` = hmo, philhealth -> `hmo_claims.payor_type`.
- `PAYMENT_METHODS` (src/lib/schemas/invoice.ts) = cash, gcash, maya, card -> `payments.method`. NOTE schema comment also lists 'hmo' but the app tuple does not.
- `TENANT_TIERS` = tier_1..tier_4; `TENANT_PLANS` = trial, active (src/lib/schemas/tenant.ts) -> `subscriptions.tier` (schema comment also lists 'enterprise') and subscription lifecycle.
- `SPECIALTIES` (src/lib/constants.ts) = dental, vet, eye, derma -> `clinics.specialty` (schema comment also lists 'general').
- `FONT_PAIRINGS` = modern, classic, friendly, luxury -> `clinics.branding_font`.
- `SETTING_KEYS` = allow_patient_data_ai -> `platform_settings.key`.
- `EXPORT_KINDS` = patients, receipts, inventory, claims (audit entity 'export').
- Appointment status transitions (src/lib/schemas/clinic-app.ts): to = confirmed, checked_in, in_progress, completed, cancelled, no_show; column default 'requested' (full list in schema comment: requested, confirmed, checked_in, in_progress, completed, cancelled, no_show). `source`: walk_in, online, phone.
- Invoice `status`: draft, paid, void (comment only). Invoice `discount_type` comment: none, senior_citizen, pwd; Zod input: none, senior_citizen, pwd, saved, custom. `discount_kind`: statutory, percent, fixed.
- `discount_types.kind`: percent, fixed.
- Subscription statuses (comment): trialing, active, past_due, masterlocked, canceled. UI `TENANT_STATUSES` = Active, Trial, Past due, Cancelled. Agent action uses status "masterlocked"|"active".
- Other comment-only lists: staff_invites.status, patient_invites.status, recalls.recall_type/status, patient_attachments.file_type, clinical_notes.note_type, inventory_transfers.status, patients.patient_kind, reminder_log.status, patient_field_definitions.scope, domain_orders.provider (paymongo|xendit), agent_usage.layer/provider.
- Dental: `SURFACES` in src/lib/dental-chart.ts = M, D, B, L, O but schema comment says "M D O I B F L P" (mismatch). `PERMANENT_TEETH` / `PRIMARY_TEETH` FDI lists.
- Ambiguity: `audit_logs.action` allowed set (create, update, delete, view) is comment-only; "delete" is used to mean archive/void/cancel/revoke (see section 6).

---------------------------------------------------------------------
## 3. Row-level security

Final state is the result of 0001 (create), 0004/0005/0006/0008/0010/0012/0015/0011/0016/0017/0019 (additions), and 0018 (all 0001 policies dropped and recreated with `nullif(...,'')::uuid`). All policies are PERMISSIVE (default) and apply to ALL commands unless "FOR X". Where no WITH CHECK is written, Postgres reuses USING for INSERT/UPDATE checks. Policies are hand-written SQL: drizzle snapshots show `isRLSEnabled=false` and no policies for every table (snapshot does not track RLS), so `drizzle-kit` cannot detect RLS drift.

Notation: CLINIC = `nullif(current_setting('app.current_clinic_id', true),'')::uuid`; ACCOUNT = same with `app.current_account_id`.

| Table | RLS enabled / FORCE | Policies (name: command: logic) |
|---|---|---|
| accounts | yes / yes | `tenant_isolation` ALL: id = ACCOUNT. `platform_admin_read` SELECT: app.platform_admin = 'on'. `platform_admin_update` UPDATE (USING and WITH CHECK): app.platform_admin='on' (0010). |
| clinics | yes / yes | `tenant_isolation` ALL: account_id = ACCOUNT OR id = CLINIC. `platform_admin_read` SELECT. |
| subscriptions | yes / yes | `tenant_isolation` ALL: account_id = ACCOUNT. `platform_admin_read` SELECT. `platform_admin_update` UPDATE (0008). |
| domain_lookups | yes / yes | `tenant_isolation` ALL: clinic_id = CLINIC. `public_resolve` SELECT: USING (true) (0005). |
| domain_orders | yes / yes (0006) | `tenant_isolation` ALL: clinic_id = CLINIC OR id = nullif(app.current_order_id,'')::uuid. `platform_admin_read` SELECT. |
| clinic_staff | yes / yes | `tenant_isolation` ALL: clinic_id = CLINIC. `member_read` SELECT: user_id = current_setting('app.current_user_id', true) (0004). |
| staff_invites | yes / yes | `tenant_isolation` ALL: clinic_id = CLINIC. `invite_by_token` ALL (USING and WITH CHECK): token_hash = nullif(app.current_invite_hash,'') (0012). |
| patients | yes / yes | `tenant_isolation` ALL: clinic_id = CLINIC. `patient_self_read` SELECT: portal_user_id = current_setting('app.current_user_id', true) (0015). |
| patient_invites | yes / yes | `tenant_isolation` ALL (explicit USING + WITH CHECK clinic_id = CLINIC). `patient_invite_by_token` ALL: token_hash = nullif(app.current_invite_hash,''). |
| patient_attachments, clinical_notes, recalls, appointments, invoices, invoice_line_items, payments, hmo_claims, inventory_items, inventory_batches, audit_logs | yes / yes | `tenant_isolation` ALL: clinic_id = CLINIC (0001, re-created in 0018; no explicit WITH CHECK, defaults to USING). |
| services, reminder_log, patient_field_definitions, discount_types, invoice_installments, dental_chart_entries, treatment_plans, treatment_plan_items | yes / yes | `tenant_isolation` ALL: clinic_id = CLINIC, explicit USING and WITH CHECK (0011/0016/0017/0019). |
| inventory_transfers | yes / yes | `tenant_isolation` ALL: account_id = ACCOUNT. (Only account is checked; a clinic-context session sees none.) |
| user, session, account, verification | NO | none |
| platform_admins, platform_invites, platform_secrets, platform_settings | NO | none (by design; "reached only after requireSuperAdmin()/requirePlatformAdmin()" in code) |
| agent_actions, agent_usage | NO | none (agent_actions has a nullable clinic_id and is queried via bare `db`) |
| rate_limits | NO | none |

Count: 29 tables with RLS enabled+forced, 11 without (user, session, account, verification, platform_admins, platform_invites, platform_secrets, platform_settings, agent_actions, agent_usage, rate_limits).

Flags / things that look permissive or odd
1. 11 tables have no RLS (list above). The sensitive ones: `account` (OAuth tokens, password hashes), `session` (live tokens), `platform_secrets` (encrypted AI keys), `agent_actions` (carries clinic_id plus args jsonb which can contain patient data/proposed edits). Protection is app-layer only. The restricted role gets full SELECT/INSERT/UPDATE/DELETE on all of them (create-app-role.sql grants on ALL TABLES).
2. `domain_lookups.public_resolve` is `FOR SELECT USING (true)`: any connection can enumerate every host -> clinic_id mapping. Intentional (routing data) but it is the one world-readable table.
3. `staff_invites.invite_by_token` and `patient_invite_by_token` are FOR ALL (not just SELECT/UPDATE): a session that sets `app.current_invite_hash` can also INSERT/DELETE rows whose hash it chose. Only reachable through `withInviteToken`.
4. `patient_self_read` returns the entire patient row (all PII, custom_fields, ids) for any clinic where `portal_user_id` matches, across clinics, with no column limit.
5. `clinic_staff.member_read` compares `user_id` with raw `current_setting(...)` (no nullif) which is fine for text, but lets a user read all their memberships (including `pin_hash`) across clinics.
6. `clinics.tenant_isolation` lets a session scoped by ACCOUNT read AND write every clinic of the account (USING reused as WITH CHECK); a CLINIC-scoped session can also UPDATE its own clinic row.
7. Platform-admin policies exist only for accounts, clinics, subscriptions, domain_orders (SELECT) and accounts, subscriptions (UPDATE). Platform admins cannot read clinic data through RLS, as intended. But `app.platform_admin='on'` is a plain GUC: any code path that can run `set local` (only client.ts and 2 seed scripts today) bypasses; the safety is that `withPlatformAdmin` is called only after `requirePlatformAdmin()` (not enforced by the DB).
8. `domain_orders.tenant_isolation` mixes CLINIC and order-id; order-id access is both read and write (used by the payment webhook).
9. `audit_logs.tenant_isolation` is FOR ALL: an owner-role connection (or any role that has UPDATE/DELETE grant) can edit/delete audit rows. Append-only is enforced only by `REVOKE UPDATE, DELETE ON audit_logs FROM clinix_app` in `scripts/create-app-role.sql`, which matters only after the cutover below. No trigger enforces immutability.
10. Cutover status: `docs/db-app-role.md` (2026-10-04) says the app was STILL connecting as `neondb_owner` (BYPASSRLS) pending password/DATABASE_URL change. FORCE RLS does not bind a BYPASSRLS role. I cannot see Vercel env, so whether the cutover happened is UNKNOWN from the repo.
11. Inconsistency in code docs: client.ts `withAccount` JSDoc says `domain_lookups` is account-scoped; the actual policy reads `app.current_clinic_id`. Migration 0001 header comment says the same. Also the 0001 header says `inventory_transfers` etc. Policies are authoritative.
12. 0001-era policies lack explicit WITH CHECK; behavior is correct because Postgres defaults to USING. Not a bug.
13. Nothing prevents `clinic_id` on a child row differing from the parent's: the composite FKs cover that (patient/appointment/staff/invoice/service/plan/item refs), EXCEPT plain-uuid columns with no FK: `patient_invites.invited_by_staff_id`, `invoice_line_items.plan_item_id`, `treatment_plan_items.done_by_staff_id`, `dental_chart_entries.plan_item_id`.

---------------------------------------------------------------------
## 4. DB access (src/server/db/client.ts)

Pool: `pg.Pool({connectionString: process.env.DATABASE_URL, max: 8, keepAlive: true, idleTimeoutMillis: 60000, connectionTimeoutMillis: 10000})`; `export const db = drizzle(pool, { schema })`.
Roles/env:
- App runtime uses `DATABASE_URL`. Target design: role `clinix_app` (LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOBYPASSRLS; SELECT/INSERT/UPDATE/DELETE on all public tables + default privileges on future tables; UPDATE/DELETE on audit_logs revoked; no password set in the script). Per docs it is "created, no password yet"; current deployed DATABASE_URL is documented as still the owner `neondb_owner` (BYPASSRLS) until the cutover.
- Admin/owner role: `DATABASE_ADMIN_URL` (fallback `DATABASE_URL`) used by `drizzle.config.ts` (migrations, direct non-pooled Neon string), and by seed scripts `scripts/seed-demo-clinic.mjs`, `seed-demo-tenants.mjs`, `seed-super-admin.mjs`. Seed scripts set `app.current_account_id`/`app.current_clinic_id` through `set_config(..., true)` themselves.
- All helpers open `db.transaction` and use transaction-local settings (`set local` / `set_config(...,true)`), safe with pooled connections. UUID-typed ids are regex-validated by `assertUuid` before interpolation (SET LOCAL cannot be parameterized); `withUser`/`withInviteToken` use parameterized `set_config` because their values are not uuids.

| Helper | Sets (transaction-local) | Used for / callers | Who may use |
|---|---|---|---|
| `withTenant(clinicId, fn)` | `app.current_clinic_id` | every clinic-scoped query; used in 21 files. | Caller must have authorized clinicId via src/server/auth.ts first (not checked in helper). |
| `withAccount(accountId, fn)` | `app.current_account_id` | account/subscription/inventory_transfers; callers: workspace.ts, ai-access.ts, domain-orders.ts (post-payment). | Authorized account owner flow / server code. |
| `withUser(userId, fn)` | `app.current_user_id` (set_config, text) | membership lookup (clinic_staff.member_read) and patient portal lookup (patients.patient_self_read); callers: access.ts, patient-portal.ts. | Must come from verified session. |
| `withAccountAndClinic(accountId, clinicId, fn)` | both account and clinic ids | creating account + first clinic atomically (onboarding.ts, tenant-admin.ts). Required because FORCE RLS has no bypass: new row ids must be set before insert. | Onboarding flow; platform admin creating a tenant. |
| `withOrder(orderId, fn)` | `app.current_order_id` | payment webhook acting on exactly one `domain_orders` row (domain-orders.ts, 4 calls). | Only with order id from a signed provider payload. |
| `withPlatformAdmin(fn)` | `app.platform_admin = 'on'` | SELECT across accounts/clinics/subscriptions/domain_orders, UPDATE on accounts/subscriptions; callers: tenants.ts, tenant-admin.ts, domain-orders.ts, plus reminders.ts and recalls.ts (cron jobs listing clinics). | Only after `requirePlatformAdmin()`; the DB cannot verify. Cron callers use it without a human admin session (note). |
| `withInviteToken(tokenHash, fn)` | `app.current_invite_hash` | redeeming staff_invites / patient_invites (clinic-staff.ts, patient-portal.ts). | Must pass SHA-256 hash, never raw token. |

Direct `db` (no helper, so no RLS context; fine for no-RLS tables, but flag if the app role is a non-owner and the table has RLS): `platform_secrets`, `platform_settings`, `agent_usage`, `agent_actions` (services/agent-actions.ts, clinic-agent-actions.ts), `user` lookups for invites (actions/*, join pages), `platform-staff.ts` transactions on platform_admins/platform_invites. All of these are no-RLS tables. A grep found no bare `db.select/insert/update/delete` against an RLS table outside client.ts.
Also `better-auth` itself writes user/session/account/verification through its own adapter (not through the helpers).

---------------------------------------------------------------------
## 5. Migrations (src/server/db/migrations; journal `meta/_journal.json`, dialect postgresql, version 7)

Journal has 21 entries (idx 0..20) and 21 .sql files and 21 snapshots (0000..0020). Tags match file names 1:1. No orphan SQL, no missing journal entry. `when` timestamps are monotonic increasing. Files `0002_clinic_branding_font.sql` and `0020_plan_item_chart_code.sql` are single-statement files without trailing newline (wc shows 0 lines) but non-empty.

| # | file | what it does |
|---|---|---|
| 0000 | flimsy_red_hulk | Baseline: `staff_role` enum; creates 24 tables (account, session, user, verification, accounts, clinics, domain_lookups, subscriptions, clinic_staff, platform_admins, staff_invites, clinical_notes, patient_attachments, patients, recalls, appointments, hmo_claims, invoice_line_items, invoices, payments, inventory_batches, inventory_items, inventory_transfers, audit_logs), single-column FKs, indexes. |
| 0001 | enable_row_level_security | ENABLE+FORCE RLS and `tenant_isolation` policy on 19 tables (accounts, clinics, subscriptions, domain_lookups, clinic_staff, staff_invites, patients, patient_attachments, clinical_notes, recalls, appointments, invoices, invoice_line_items, payments, hmo_claims, inventory_items, inventory_batches, inventory_transfers, audit_logs). Hand-written, not drizzle-generated, but present in journal. |
| 0002 | clinic_branding_font | `clinics.branding_font`. |
| 0003 | tenant_safe_fks_and_rate_limits | Creates `rate_limits`; drops 22 single-column FKs and adds composite `(clinic_id, x_id)` tenant-safe FKs + `UNIQUE(clinic_id,id)` on clinics(account_id,id), clinic_staff, patients, appointments, invoices, inventory_items; adds `accounts_owner_user_id_unique`. |
| 0004 | hash_invite_tokens_and_member_rls | staff_invites.token -> token_hash and rehash existing rows (SHA-256); patient_attachments.file_url -> storage_key; policy `clinic_staff.member_read`. |
| 0005 | domain_orders | Creates `domain_orders` (deliberately no RLS at this point); policy `domain_lookups.public_resolve`. |
| 0006 | domain_orders_rls_and_admin_read | `domain_orders.deleted_at`; ENABLE+FORCE RLS on domain_orders with CLINIC-or-order-id policy; `platform_admin_read` on accounts, clinics, subscriptions, domain_orders. |
| 0007 | platform_staff_roles_and_invites | Creates `platform_invites`; platform_admins.role + is_active; marks existing admins super_admin. |
| 0008 | agent_actions_and_usage | Creates `agent_actions`, `agent_usage` (no RLS); `platform_admin_update` on subscriptions. |
| 0009 | platform_secrets | Creates `platform_secrets` (no RLS). |
| 0010 | tenant_ai_access_and_clinic_actions | Creates `platform_settings`; accounts.ai_assistant_enabled; agent_actions.clinic_id + risk; `platform_admin_update` on accounts. |
| 0011 | services_price_list | Creates `services` with RLS (+WITH CHECK, nullif). |
| 0012 | staff_invite_redeem | Policy `staff_invites.invite_by_token`. |
| 0013 | appointments_service | appointments.service_id + composite FK to services. |
| 0014 | invoice_void | invoices.void_reason, voided_at. |
| 0015 | patient_portal | Creates `patient_invites` with RLS + `patient_invite_by_token`; policy `patients.patient_self_read`. |
| 0016 | reminders | Creates `reminder_log` with RLS; clinics.reminders_enabled. |
| 0017 | patient_fields | Creates `patient_field_definitions` with RLS; patients.custom_fields. |
| 0018 | rls_nullif_guard | Drops/recreates the 19 tenant_isolation policies from 0001 with `nullif(...,'')::uuid` (no explicit WITH CHECK, as in 0001). Doc says "19 policies". |
| 0019 | dental_flow | Creates discount_types, invoice_installments, dental_chart_entries, treatment_plan_items, treatment_plans (all RLS); invoice/payment/line-item columns (discount_label/kind/value, paid_cents, receipt_number, tooth, plan_item_id); backfills payments.receipt_number ('PR-' + 6-digit per-clinic order) and invoices.paid_cents. |
| 0020 | plan_item_chart_code | treatment_plan_items.chart_code. |

Drift notes
- Table count in 0020 snapshot = 40 = number of `pgTable` declarations in schema/*.ts (auth 4, tenancy 5, staff 4, patients 6, appointments 1, billing 6, inventory 3, audit 1, agent 4, rate-limits 1, reminders 1, services 1, dental 3). No schema/snapshot mismatch found by inspection; I did NOT run `drizzle-kit generate/check` (would write files / need DB), so column-level drift was checked only by reading, plus spot checks of `chart_code`, tooth and policies.
- RLS and policies are invisible to drizzle snapshots; they exist only in hand-written SQL inside migrations. Re-generating from snapshot would not reproduce them. A fresh DB built from the migration folder is complete (policies included), but `scripts/create-app-role.sql` (role + grants + audit_logs revoke) is NOT a migration: it is run manually once, and not tracked in the journal.
- Migration 0003 comment and 0001 header describe account-scoped `domain_lookups`; actual policy is clinic-scoped (documentation drift only).
- Schema comments out of sync with code tuples: hmo_claims.status lacks 'withdrawn'; payments.method comment lists 'hmo' but PAYMENT_METHODS does not; clinics.specialty comment includes 'general' but SPECIALTIES does not; dental SURFACES vs comment; subscriptions.tier comment includes 'enterprise' but TENANT_TIERS does not.

---------------------------------------------------------------------
## 6. Soft-delete / archive / void and audit

Per table
| Table | Mechanism |
|---|---|
| patients | `deleted_at` (never hard-deleted; "archive" in UI = deletedAt set; list filters isNull/isNotNull(deletedAt)) |
| appointments | `deleted_at` |
| clinic_staff | `deleted_at` AND `is_active` (deactivation = is_active=false; unique index only over non-deleted) |
| patient_attachments | `deleted_at` (table unused) |
| clinical_notes | `deleted_at` (service "void": audit action 'delete' with `{voided:true, reason}`; reason is only in the audit diff, no column) |
| services | `deleted_at` + `is_active` ("archive"; service audit action delete when archived) |
| inventory_items | `deleted_at` + `is_active` |
| domain_orders | `deleted_at` (convention only; terminal `status` used instead: expired/needs_review) |
| patient_field_definitions | `archived_at` |
| discount_types | `archived_at` |
| invoices | void via `status='void'` + `void_reason` + `voided_at` (never deleted; BIR series) |
| dental_chart_entries | void via `voided_at` + `void_reason` (append-only, never edited/deleted) |
| claims (hmo_claims) | status 'withdrawn' (app-level; no deleted_at) |
| recalls | status 'cancelled' |
| treatment_plans / treatment_plan_items | status 'cancelled' |
| staff_invites / patient_invites / platform_invites | status 'revoked' (also 'expired' for staff_invites) |
| platform_admins | `is_active` |
| agent_actions | status 'cancelled'/'failed' |
| accounts, clinics, subscriptions | explicitly NO delete column (masterlock instead) |
| payments, invoice_line_items, invoice_installments, inventory_batches, reminder_log, audit_logs, inventory_transfers | no soft-delete column (payments are never voided individually; only the invoice is voided; no payment reversal flow exists in the schema) |

Hard deletes performed by code: `db.delete(platformSecrets)` (platform-secrets.ts:27) only. Hard-delete grants exist for the app role on all tables.

### audit_logs shape
`id uuid, clinic_id uuid NN -> clinics, actor_user_id text NN -> user, entity_type text NN, entity_id uuid NN, action text NN (create|update|delete|view), diff jsonb null, created_at`. Index (clinic_id, entity_type, entity_id). Inserted by the service layer inside the same `withTenant` transaction as the mutation (ca. 60 call sites). Note `clinic_id` NOT NULL means platform-level actions cannot be audited without a clinic; `agent_*`, `platform_*` writes are not audited in audit_logs.

Entity types written (entityType value -> services that insert; action values used):
- `patient`: clinic-app.ts (several create/update/archive inserts at lines ~314-645, exact actions not individually verified; 'view' at line 686 = patient view), patient-fields.ts (customFieldsChanged), patient-portal.ts (portalInvite, portalLinked), actions/reminders.ts (contactEmail set/cleared).
- `appointment`: clinic-app.ts (exact actions not individually verified), reminders.ts (reminder sent/failed, only when actorUserId present).
- `invoice`: billing.ts (create at checkout; update on payment; 'delete' on void).
- `claim`: claims.ts (create, update, status; 'delete' when withdrawn).
- `clinical_note`: clinical-notes.ts (create, update, 'delete' = void).
- `dental_chart`: dental-chart.ts (create, 'delete' = void).
- `treatment_plan`: treatment-plans.ts (create, status update/'delete' on cancel, item added/cancelled/done/undone).
- `service`: price-list.ts. `discount_type`: discount-types.ts. `inventory_item`: inventory.ts (create, update, archive, stockIn, used, writtenOff). `recall`: recalls.ts. `patient_field`: patient-fields.ts. `staff`: clinic-staff.ts (create via invite, role change, activate/deactivate). `staff_invite`: clinic-staff.ts (create, revoke).
- `domain_order`: domain-orders.ts (create only; later status transitions by webhook are not audited).
- `account`: tenant-admin.ts (platform admin creates tenant; clinicId = new clinic, entityId = accountId, actor = admin) and reminders.ts:118 (toggle remindersEnabled; entityId = clinic.id, so entity_type 'account' holds a clinic id there, inconsistent).
- `export`: exports.ts (action 'view', diff {kind}) for CSV exports.
Gaps (writes with no audit row): hmo_claims reads, payments reading, invoice views, appointment/patient list views, inventory_transfers (unused), platform_admins/platform_invites/platform_secrets/platform_settings changes, subscription/AI-access changes made by platform admins or the agent (agent_actions keeps its own decision record), domain_order status changes after creation, login/logout, patient_attachments (unused), clinical_notes views (only patient view is logged).
`audit_logs` immutability: only via role grants (REVOKE UPDATE, DELETE for `clinix_app`), not by trigger/policy.

---------------------------------------------------------------------
## 7. Relationships (text ERD; arrow = parent -> children)

```
user (text id)
 |- session (CASCADE), account[oauth] (CASCADE), verification (no FK)
 |- accounts.owner_user_id (1:1, UNIQUE)
 |- clinic_staff.user_id (N)       patients.portal_user_id (0..1 per user, partial unique)
 |- platform_admins.user_id (1:1)  platform_invites.invited_by_user_id
 |- agent_actions.user_id, agent_usage.user_id, platform_secrets.updated_by_user_id, platform_settings.updated_by_user_id
 `- audit_logs.actor_user_id

accounts
 |- subscriptions (1:1 UNIQUE account_id)
 |- clinics (1:N)
 |- domain_orders.account_id
 `- inventory_transfers.account_id  (also composite (account_id, from/to_clinic_id) -> clinics(account_id,id))

clinics
 |- domain_lookups (host -> clinic), domain_orders
 |- clinic_staff -> staff_invites (invited_by composite), and all "…_staff_id" columns (composite FKs)
 |- patients
 |    |- patient_attachments, clinical_notes, recalls, patient_invites, appointments,
 |    |  invoices, hmo_claims, treatment_plans, dental_chart_entries   (all via (clinic_id, patient_id))
 |- services -> appointments.service_id, treatment_plan_items.service_id
 |- appointments -> clinical_notes.appointment_id, invoices.appointment_id, dental_chart_entries.appointment_id, reminder_log.appointment_id
 |- invoices -> invoice_line_items, payments, invoice_installments, hmo_claims.invoice_id, treatment_plan_items.invoice_id
 |- treatment_plans -> treatment_plan_items  (plan_item_id on invoice_line_items / dental_chart_entries has no FK)
 |- inventory_items -> inventory_batches; inventory_transfers.item_id (via from_clinic_id)
 |- patient_field_definitions, discount_types, audit_logs, reminder_log
 `- agent_actions.clinic_id (nullable)

Standalone: rate_limits, platform_settings, platform_secrets (only FK to user)
```
Cardinality notes: one account per owner user, one subscription per account (so "multi-clinic" = more clinics under the same account, bounded by `subscriptions.clinic_slot_limit` in app code only). A user can be staff at many clinics (unique per clinic among non-deleted). A patient is bound to exactly one clinic (no cross-clinic patient identity); portal user -> at most one patient row.

---------------------------------------------------------------------
## Summary of red flags
1. 11 of 40 tables have no RLS (auth tables, platform_*, agent_*, rate_limits).
2. App still documented as connecting as BYPASSRLS owner until cutover; unverified from the repo.
3. audit_logs immutability depends solely on the unapplied-by-default `clinix_app` grants.
4. `inventory_transfers` and `patient_attachments` have schema + RLS but zero code references.
5. Plain-uuid columns with no FK: patient_invites.invited_by_staff_id, invoice_line_items.plan_item_id, treatment_plan_items.done_by_staff_id, dental_chart_entries.plan_item_id.
6. No CHECK constraints at all (money >= 0, ends_at > starts_at, quantities, status lists are unenforced in DB); payments.receipt_number not unique.
7. `domain_lookups` world-readable by design; invite-token policies are FOR ALL.
8. Doc/comment drift (domain_lookups scope comment, status lists, SURFACES).
