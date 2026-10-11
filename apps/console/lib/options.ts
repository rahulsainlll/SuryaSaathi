/** Distinct zones in a list, as filter options. */
export function ZONE_OPTIONS(rows: { zone: string }[]) {
  return [...new Set(rows.map((r) => r.zone))].sort().map((zone) => ({ id: zone, label: zone }));
}
