import { and, eq, isNull } from "drizzle-orm";
import { db, withUser } from "@/src/server/db/client";
import { clinicStaff, platformAdmins } from "@/src/server/db/schema";

/** The user's DataBridgeSol team role, or null if they aren't (or are no longer) on the team. */
export async function platformRoleOf(userId: string) {
  const [row] = await db
    .select({ role: platformAdmins.role })
    .from(platformAdmins)
    .where(and(eq(platformAdmins.userId, userId), eq(platformAdmins.isActive, true)))
    .limit(1);
  return row?.role ?? null;
}

/** The user's live clinic memberships, read through the `member_read` RLS policy. */
export async function listActiveMemberships(userId: string) {
  return withUser(userId, (tx) =>
    tx
      .select({ staffId: clinicStaff.id, clinicId: clinicStaff.clinicId, role: clinicStaff.role })
      .from(clinicStaff)
      .where(
        and(eq(clinicStaff.userId, userId), eq(clinicStaff.isActive, true), isNull(clinicStaff.deletedAt)),
      ),
  );
}
