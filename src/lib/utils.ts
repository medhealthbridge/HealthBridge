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
