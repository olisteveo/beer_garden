declare module "osmtogeojson" {
  import type { FeatureCollection } from "geojson";
  export default function osmtogeojson(data: unknown): FeatureCollection;
}
