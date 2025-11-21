import { useEffect, useRef } from "react";
import mapboxgl, { type Map } from "mapbox-gl";
import { configureMapbox } from "../lib/mapbox";
import { useMapStore } from "../store/mapStore";

type Facility = {
  id: string;
  name: string;
  type: string;
  grade: "A" | "B" | "C";
  lastInspection: string;
  incidentsPastYear: number;
  coordinates: [number, number];
  icon?: string;
};

type Ticket = {
  id: string;
  status: "open" | "within_sla" | "overdue";
  coordinates: [number, number];
};

type MapViewProps = {
  areasGeoJson: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { id: string; name: string; risk: number }>;
  facilities: Facility[];
  tickets: Ticket[];
  onAreaClick?: (id: string) => void;
  onFacilityClick?: (id: string) => void;
  onTicketClick?: (id: string) => void;
};

const areaSourceId = "areas-source";
const facilitySourceId = "facilities-source";
const ticketSourceId = "tickets-source";

function MapView({ areasGeoJson, facilities, tickets, onAreaClick, onFacilityClick, onTicketClick }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const clickAreaRef = useRef<typeof onAreaClick>();
  const clickFacilityRef = useRef<typeof onFacilityClick>();
  const clickTicketRef = useRef<typeof onTicketClick>();
  const setViewportRef = useRef<ReturnType<typeof useMapStore.getState>["setViewport"]>();
  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);
  const activeLayers = useMapStore((s) => s.activeLayers);

  clickAreaRef.current = onAreaClick;
  clickFacilityRef.current = onFacilityClick;
  clickTicketRef.current = onTicketClick;
  setViewportRef.current = setViewport;

  useEffect(() => {
    configureMapbox();
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: viewport.center,
      zoom: viewport.zoom,
    });
    mapRef.current = map;

    map.on("moveend", () => {
      const center = map.getCenter();
      setViewportRef.current?.({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bounds: map.getBounds().toArray() as mapboxgl.LngLatBoundsLike,
      });
    });

    map.on("load", () => {
      map.on("styleimagemissing", (e) => {
        const id = e.id;
        if (map.hasImage(id)) return;
        addCanvasIcon(map, id, "#e2e8f0", id.substring(0, 1).toUpperCase());
      });

      map.addSource(areaSourceId, {
        type: "geojson",
        data: areasGeoJson,
        promoteId: "id",
      });
      map.addLayer({
        id: "areas-fill",
        type: "fill",
        source: areaSourceId,
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "risk"],
            0,
            "#10b981",
            40,
            "#f59e0b",
            70,
            "#ef4444",
          ],
          "fill-opacity": 0.35,
        },
      });
      map.addLayer({
        id: "areas-outline",
        type: "line",
        source: areaSourceId,
        paint: {
          "line-color": "#93c5fd",
          "line-width": 1.2,
        },
      });

      map.addSource(facilitySourceId, {
        type: "geojson",
        data: facilitiesToFeatureCollection(facilities),
        promoteId: "id",
      });
      map.addLayer({
        id: "facility-icon",
        type: "symbol",
        source: facilitySourceId,
        layout: {
          "icon-image": ["coalesce", ["get", "icon"], ["concat", "facility-", ["get", "type"]], "marker-15"],
          "icon-size": 1.25,
          "icon-allow-overlap": true,
        },
        paint: {
          "icon-color": "#0f172a",
        },
      });

      map.addSource(ticketSourceId, {
        type: "geojson",
        data: ticketsToFeatureCollection(tickets),
        promoteId: "id",
      });
      map.addLayer({
        id: "tickets",
        type: "symbol",
        source: ticketSourceId,
        layout: {
          "icon-image": [
            "match",
            ["get", "status"],
            "overdue",
            "marker-15",
            "within_sla",
            "triangle-15",
            "circle-15",
          ],
          "icon-size": 1,
          "icon-allow-overlap": true,
        },
        paint: {
          "icon-color": [
            "match",
            ["get", "status"],
            "overdue",
            "#ef4444",
            "within_sla",
            "#f59e0b",
            "#eab308",
          ],
        },
      });

      map.on("click", "areas-fill", (e) => {
        const feature = e.features?.[0];
        if (feature?.id) clickAreaRef.current?.(String(feature.id));
      });

      map.on("click", "facility-icon", (e) => {
        const feature = e.features?.[0];
        if (feature?.id) clickFacilityRef.current?.(String(feature.id));
      });

      map.on("click", "tickets", (e) => {
        const feature = e.features?.[0];
        if (feature?.id) clickTicketRef.current?.(String(feature.id));
      });

      ["facility-icon", "tickets", "areas-fill"].forEach((layerId) => {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    addFacilityIcons(map, facilities);
    const areaSource = map.getSource(areaSourceId) as mapboxgl.GeoJSONSource | undefined;
    if (areaSource) areaSource.setData(areasGeoJson);
    const facilitySource = map.getSource(facilitySourceId) as mapboxgl.GeoJSONSource | undefined;
    if (facilitySource) facilitySource.setData(facilitiesToFeatureCollection(facilities));
    const ticketSource = map.getSource(ticketSourceId) as mapboxgl.GeoJSONSource | undefined;
    if (ticketSource) ticketSource.setData(ticketsToFeatureCollection(tickets));
  }, [areasGeoJson, facilities, tickets]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers: Record<keyof typeof activeLayers, string[]> = {
      areas: ["areas-fill", "areas-outline"],
      facilities: ["facility-icon"],
      tickets: ["tickets"],
      heatmap: ["areas-fill"],
    };
    Object.entries(layers).forEach(([key, ids]) => {
      ids.forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", activeLayers[key as keyof typeof activeLayers] ? "visible" : "none");
      });
    });
  }, [activeLayers]);

  return <div ref={mapContainerRef} className="w-full h-full rounded-2xl overflow-hidden" />;
}

function facilitiesToFeatureCollection(facilities: Facility[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: facilities.map((facility) => ({
      type: "Feature",
      id: facility.id,
      geometry: {
        type: "Point",
        coordinates: facility.coordinates,
      },
      properties: {
        name: facility.name,
        type: facility.type,
        grade: facility.grade,
        icon: facility.icon,
      },
    })),
  };
}

function addFacilityIcons(map: Map, facilities: Facility[]) {
  const typeVisuals: Record<string, { color: string; label: string }> = {
    park: { color: "#22c55e", label: "P" },
    playground: { color: "#16a34a", label: "遊" },
    street_light: { color: "#fbbf24", label: "燈" },
    streetlight: { color: "#fbbf24", label: "燈" },
    road_hazard: { color: "#f87171", label: "路" },
    sidewalk: { color: "#a855f7", label: "行" },
    police_station: { color: "#60a5fa", label: "警" },
    drinking_fountain: { color: "#38bdf8", label: "水" },
    elder_center: { color: "#f97316", label: "老" },
    school_zone: { color: "#eab308", label: "學" },
  };
  const uniqueTypes = Array.from(new Set(facilities.map((f) => f.type)));
  uniqueTypes.forEach((type) => {
    const key = `facility-${type}`;
    if (map.hasImage(key)) return;
    const visual = typeVisuals[type] ?? { color: "#cbd5e1", label: type.slice(0, 1).toUpperCase() };
    addCanvasIcon(map, key, visual.color, visual.label);
  });
}

function addCanvasIcon(map: Map, id: string, color: string, label: string) {
  const size = 36;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2.4, 0, Math.PI * 2, false);
  context.fillStyle = color;
  context.fill();
  context.fillStyle = "#0f172a";
  context.font = "bold 14px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, size / 2, size / 2 + 1);
  const imageData = context.getImageData(0, 0, size, size);
  map.addImage(id, imageData, { pixelRatio: 2 });
}

function ticketsToFeatureCollection(tickets: Ticket[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: tickets.map((ticket) => ({
      type: "Feature",
      id: ticket.id,
      geometry: {
        type: "Point",
        coordinates: ticket.coordinates,
      },
      properties: {
        status: ticket.status,
      },
    })),
  };
}

export default MapView;
