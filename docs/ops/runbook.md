# Runbook: DataBridgeSol / Clinix PH

Procedures for R-01. Each is filled in and rehearsed before launch (K-602, K-603, K-605). Steps are written as `TODO` until rehearsed.

| Situation | Reference | Steps |
|---|---|---|
| Owner locked out of own clinic (X-13) | PRD X-13 | TODO verify identity, reset credentials, record in platform audit |
| Tenant locked by mistake (X-09, X-11) | FR-014 | TODO check open invoices, unlock on S-62 with reason |
| Customer paid twice / wrong amount | FR-004, FR-005 | TODO refund in PayMongo dashboard, note on S-63 |
| PayMongo outage (X-04) | TRD section 6 | TODO confirm no lock caused, tell pilot clinics |
| Domain paid but not delivered (X-14) | FR-009 | TODO retry or refund from S-83 |
| Restore from backup (NFR-04) | FR-113 | TODO Neon point-in-time branch, compare counts, switch |
| Rotate BETTER_AUTH_SECRET | TRD section 7 | TODO re-enter AI keys afterwards |
| Privacy request | FR-104 | TODO see `compliance.md` |
| Cron failed (X-07) | FR-114 | TODO manual run route, check events |
