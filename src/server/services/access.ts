import { and, eq, isNull } from "drizzle-orm";
import { db, withUser } from "@/src/server/db/client";
import { clinicStaff, platformAdmins } from "@/src/server/db/schema";

export async function isPlatformAdmin(userId: string) {
  const [row] = await db
    .select({ id: platformAdmins.id })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId))
    .limit(1);
  return Boolean(row);
}

/** The user's live clinic memberships, read through the `member_read` RLS policy. */
export async function listActiveMemberships(userId: string) {
  return withUser(userId, (tx) =>
    tx
      .select({ clinicId: clinicStaff.clinicId, role: clinicStaff.role })
      .from(clinicStaff)
      .where(
        and(eq(clinicStaff.userId, userId), eq(clinicStaff.isActive, true), isNull(clinicStaff.deletedAt)),
      ),
  );
}
