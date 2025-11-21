import mapboxgl from "mapbox-gl";

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export function configureMapbox() {
  if (!MAPBOX_TOKEN) {
    // eslint-disable-next-line no-console
    console.warn("Missing VITE_MAPBOX_TOKEN; map will not load tiles.");
    return;
  }
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

export type Viewport = {
  center: mapboxgl.LngLatLike;
  zoom: number;
};
