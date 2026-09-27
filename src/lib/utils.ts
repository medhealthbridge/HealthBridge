const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function formatPeso(amount: number) {
  return pesoFormatter.format(amount);
}

/** "Bright Smile Dental Group" → "BS". */
export function initialsOf(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const pesoExactFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Centavo-precise peso, for receipt and cart lines where the BIR total has to foot. */
export function formatPesoExact(amount: number) {
  return pesoExactFormatter.format(amount);
}
