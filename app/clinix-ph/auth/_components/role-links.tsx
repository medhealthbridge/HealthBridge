import Link from "next/link";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { AUTH_ROLES, AUTH_ROLE_COPY, type AuthRole } from "../_data";

/**
 * The design's role row: the role you're on is plain text, the rest are links.
 * On the owner screen the row is prefixed "Not an owner?" — the other three
 * just list all four.
 */
export function RoleLinks({ role }: { role: AuthRole }) {
  // Owner is the default screen, so it asks "Not an owner?" and lists only the
  // other three. The rest list all four, with the current one as plain text.
  const isOwner = role === "owner";
  const listed = isOwner ? AUTH_ROLES.filter((option) => option !== "owner") : AUTH_ROLES;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-center text-xs text-slate-600">
        {isOwner ? "Not an owner? " : null}
        {listed.map((option, index) => (
          <span key={option}>
            {index > 0 ? <span aria-hidden="true"> · </span> : null}
            {option === role ? (
              <span aria-current="page">{AUTH_ROLE_COPY[option].label}</span>
            ) : (
              <Link
                href={`${CLINIX_ROUTES.auth}?role=${option}`}
                className="font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {AUTH_ROLE_COPY[option].label}
              </Link>
            )}
          </span>
        ))}
      </p>
      <p className="text-center text-[11px] tracking-[.06em] text-slate-600 uppercase">
        {AUTH_ROLE_COPY[role].label} login
      </p>
    </div>
  );
}
