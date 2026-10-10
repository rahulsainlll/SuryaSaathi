/* Generated from schemas/reading.schema.json by scripts/generate.mjs. Do not edit. */

/**
 * Where a reading came from.
 */
export type DataSource = "data_logger" | "inverter_cloud" | "camera_clip" | "whatsapp_photo";

/**
 * One day's generation for one system.
 */
export interface Reading {
  systemId: string;
  /**
   * Local date the energy was generated.
   */
  date: string;
  source: DataSource;
  /**
   * Energy generated that day.
   */
  energyKwh: number;
  /**
   * Fault code reported by the inverter, if any.
   */
  faultCode?: string;
  receivedAt: string;
}
