const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "10 Oct" (locale-free, so it matches on the server and every browser). */
export function day(iso: string): string {
  const [, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]}`;
}

export function dayYear(iso: string): string {
  return `${day(iso)} ${iso.slice(0, 4)}`;
}

const grouped = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export const rupees = (n: number) => `₹${grouped.format(n)}`;
export const kwh = (n: number) => `${oneDecimal.format(n)} kWh`;
export const count = (n: number) => grouped.format(n);
export const pct = (ratio: number | null | undefined) =>
  ratio === null || ratio === undefined ? "–" : `${Math.round(ratio * 100)}%`;
export const pctValue = (value: number) => `${value.toFixed(1)}%`;

export const SOURCE_LABEL: Record<string, string> = {
  data_logger: "Data logger",
  inverter_cloud: "Inverter cloud",
  camera_clip: "Camera clip",
  whatsapp_photo: "WhatsApp photo",
};
