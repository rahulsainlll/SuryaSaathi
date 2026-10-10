/* Generated from schemas/system.schema.json by scripts/generate.mjs. Do not edit. */

/**
 * Where a reading came from.
 */
export type DataSource = "data_logger" | "inverter_cloud" | "camera_clip" | "whatsapp_photo";

/**
 * A rooftop solar system SuryaSaathi monitors.
 */
export interface System {
  /**
   * Opaque ID printed on the system's QR sticker. Never contains personal data.
   */
  systemId: string;
  /**
   * Digital Solar Asset Identification Number issued under the Delhi Solar Energy Policy.
   */
  dsain?: string;
  /**
   * Installed DC capacity in kW.
   */
  capacityKw: number;
  location: {
    lat: number;
    lon: number;
    /**
     * DISCOM zone the system belongs to.
     */
    zone: string;
  };
  /**
   * Installer responsible for free maintenance.
   */
  vendorId: string;
  /**
   * DISCOM the system is connected to.
   */
  discomId: string;
  inverter?: {
    make?: string;
    model?: string;
  };
  dataSource: DataSource;
  installedOn?: string;
  /**
   * The household's one-time consent, recorded at installation.
   */
  consent: {
    granted: boolean;
    recordedAt: string;
  };
}
