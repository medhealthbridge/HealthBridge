import Link from "next/link";
import { Panel } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { formatPesoExact } from "@/src/lib/utils";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import type { ServiceRow } from "@/src/server/services/price-list";
import { ArchiveServiceButton } from "./archive-service-button";
import { ServiceDialog } from "./service-dialog";

const PATH = `${CLINIX_ROUTES.admin}/services`;

export function ServicesTable({ rows, archivedView }: { rows: ServiceRow[]; archivedView: boolean }) {
  const toggle = (
    <Link href={archivedView ? PATH : `${PATH}?view=archived`} className={consoleButtonClass("secondary", "sm")}>
      {archivedView ? "Back to active services" : "Show archived"}
    </Link>
  );

  if (rows.length === 0) {
    return (
      <>
        <div className="flex justify-end">{toggle}</div>
        <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">
          {archivedView ? "No archived services." : "No services yet. Add the first one, with its price, to start booking and charging."}
        </Panel>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-end">{toggle}</div>
      <TableCard label={archivedView ? "Archived services" : "Services"}>
        <thead>
          <tr>
            <Th>Service</Th>
            <Th>Category</Th>
            <Th>Duration</Th>
            <Th numeric>Price</Th>
            <Th>VAT</Th>
            <Th className="w-44"><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((service) => (
            <Tr key={service.id}>
              <Td className="font-semibold">
                {service.name}
                {service.code && <span className="ml-1.5 font-data text-[11px] font-normal text-console-subtle">{service.code}</span>}
              </Td>
              <Td className="text-console-muted">{service.category ?? "—"}</Td>
              <Td className="text-console-muted">{service.durationMinutes ? `${service.durationMinutes} min` : "—"}</Td>
              <Td numeric>{formatPesoExact(service.priceCentavos / 100)}</Td>
              <Td><Pill tone={service.vatExempt ? "accent" : "neutral"}>{service.vatExempt ? "VAT-exempt" : "VATable"}</Pill></Td>
              <Td>
                <RowActions>
                  <div className="flex gap-1.5">
                    {!archivedView && <ServiceDialog service={service} />}
                    <ArchiveServiceButton id={service.id} name={service.name} archived={archivedView} />
                  </div>
                </RowActions>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableCard>
    </>
  );
}
