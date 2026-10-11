// Static asset imports, as Next.js bundles them for the apps (StaticImageData).
declare module "*.svg" {
  const asset: { src: string; width: number; height: number };
  export default asset;
}
declare module "*.png" {
  const asset: { src: string; width: number; height: number };
  export default asset;
}
declare module "*.ico" {
  const asset: { src: string; width: number; height: number };
  export default asset;
}
