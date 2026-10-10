import type { DeviceSource } from "@suryasaathi/engine";

/** How a reading reaches AWS for each data source, as shown in the pipeline. */
export const SOURCES: Record<
  DeviceSource,
  {
    label: string;
    device: string;
    deviceDetail: string;
    cloud: string;
    cloudDetail: string;
    topic: string;
  }
> = {
  data_logger: {
    label: "Data logger",
    device: "Data logger",
    deviceDetail: "reads the inverter every 15 min",
    cloud: "AWS IoT Core",
    cloudDetail: "MQTT over TLS, IoT rule to Lambda",
    topic: "suryasaathi/dl/SS-DL-000123/telemetry",
  },
  inverter_cloud: {
    label: "Inverter cloud",
    device: "Inverter cloud",
    deviceDetail: "maker’s cloud stores the readings",
    cloud: "EventBridge + Lambda",
    cloudDetail: "pulls the maker’s API once a day",
    topic: "pull: inverter-cloud API → Lambda ingest",
  },
  camera_clip: {
    label: "Camera clip",
    device: "Camera clip",
    deviceDetail: "ESP32-CAM on FreeRTOS photographs the screen",
    cloud: "AWS IoT Core + S3",
    cloudDetail: "photo to S3, Bedrock reads the numbers",
    topic: "suryasaathi/cam/SS-DL-000123/snapshot",
  },
};
