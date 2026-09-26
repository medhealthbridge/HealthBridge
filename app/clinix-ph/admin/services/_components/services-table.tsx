import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { SERVICES } from "@/src/lib/mock-data/clinix-admin";
import { formatPeso } from "@/src/lib/utils";

export function ServicesTable() {
  return (
    <TableCard label="Services">
      <thead>
        <tr>
          <Th>Service</Th>
          <Th>Details</Th>
          <Th numeric>Price</Th>
          <Th numeric>30-day vol.</Th>
          <Th numeric>Revenue</Th>
          <Th>VAT</Th>
        </tr>
      </thead>
      <tbody>
        {SERVICES.map((service) => (
          <Tr key={service.name}>
            <Td className="font-semibold">{service.name}</Td>
            <Td className="text-console-muted">{service.meta}</Td>
            <Td numeric>{formatPeso(service.price)}</Td>
            <Td numeric>{service.volume}</Td>
            <Td numeric>{formatPeso(service.revenue)}</Td>
            <Td>
              <Pill tone={service.vatExempt ? "accent" : "neutral"}>{service.vatExempt ? "VAT-exempt" : "VATable"}</Pill>
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
