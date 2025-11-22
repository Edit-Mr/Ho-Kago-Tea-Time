import { createElement, useEffect, useRef, type FC } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import mapboxgl, { type Map } from "mapbox-gl";
import type GeoJSON from "geojson";
import { configureMapbox } from "../lib/mapbox";
import { useMapStore, type BackgroundMode, type NoiseTime } from "../store/mapStore";
import { icons as lucideIcons, type LucideProps } from "lucide-react";

type Facility = {
  id: string;
  name: string;
  type: string;
  typeLabel?: string;
  iconName?: string;
  grade: "A" | "B" | "C";
  lastInspection: string;
  incidentsPastYear: number;
  coordinates: [number, number];
  maintenanceStatus: "safe" | "in_progress" | "overdue";
};

type Ticket = {
  id: string;
  status: "open" | "within_sla" | "overdue";
  coordinates: [number, number];
};

type BuildingAgePoint = {
  id: string;
  name: string;
  ageYears: number;
  coordinates: [number, number];
};

type NoisePoint = {
  id: string;
  name: string;
  morning: number;
  afternoon: number;
  night: number;
  coordinates: [number, number];
};

type AreaProps = {
  id: string;
  name: string;
  risk: number;
  gender_ratio?: number;
  avg_age?: number;
  building_age?: number;
  safety_score?: number;
  noise_morning?: number;
  noise_afternoon?: number;
  noise_night?: number;
};

type MapViewProps = {
  areasGeoJson: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, AreaProps>;
  facilities: Facility[];
  tickets: Ticket[];
  buildingAges: BuildingAgePoint[];
  noisePoints: NoisePoint[];
  backgroundMode: BackgroundMode;
  noiseTime: NoiseTime;
  onAreaClick?: (id: string) => void;
  onFacilityClick?: (id: string) => void;
  onTicketClick?: (id: string) => void;
};

const areaSourceId = "areas-source";
const facilitySourceId = "facilities-source";
const ticketSourceId = "tickets-source";
const buildingAgeSourceId = "building-age-source";
const noiseSourceId = "noise-source";
const gradeColors: Record<Facility["grade"], string> = {
  A: "#22c55e",
  B: "#f59e0b",
  C: "#ef4444"
};
const statusColors: Record<Facility["maintenanceStatus"], string> = {
  safe: "#22c55e",
  in_progress: "#fbbf24",
  overdue: "#ef4444"
};
const loadingImages = new Set<string>();

function MapView({ areasGeoJson, facilities, tickets, buildingAges, noisePoints, backgroundMode, noiseTime, onAreaClick, onFacilityClick, onTicketClick }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const clickAreaRef = useRef<typeof onAreaClick>();
  const clickFacilityRef = useRef<typeof onFacilityClick>();
  const clickTicketRef = useRef<typeof onTicketClick>();
  const setViewportRef = useRef<ReturnType<typeof useMapStore.getState>["setViewport"]>();
  const viewport = useMapStore(s => s.viewport);
  const setViewport = useMapStore(s => s.setViewport);
  const activeLayers = useMapStore(s => s.activeLayers);
  const facilityTypeFilter = useMapStore(s => s.facilityTypeFilter);
  const facilityStatusFilter = useMapStore(s => s.facilityStatusFilter);

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
      maxBounds: [
        [119.0, 20.0],
        [123.5, 26.5]
      ]
    });
    mapRef.current = map;

    map.on("moveend", () => {
      const center = map.getCenter();
      setViewportRef.current?.({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bounds: map.getBounds().toArray() as mapboxgl.LngLatBoundsLike
      });
    });

    map.on("load", () => {
      map.addSource(areaSourceId, {
        type: "geojson",
        data: areasGeoJson,
        promoteId: "id"
      });
      map.addLayer({
        id: "areas-fill",
        type: "fill",
        source: areaSourceId,
        paint: areaFillPaint(backgroundMode, noiseTime)
      });
      map.addLayer({
        id: "areas-outline",
        type: "line",
        source: areaSourceId,
        paint: {
          "line-color": "#93c5fd",
          "line-width": 1.2
        }
      });

      const filteredFacilitiesOnLoad = filteredFacilities(facilities, facilityTypeFilter, facilityStatusFilter);
      map.addSource(facilitySourceId, {
        type: "geojson",
        data: facilitiesToFeatureCollection(filteredFacilitiesOnLoad),
        promoteId: "id"
      });

      // Add all facility icons upfront
      addFacilityIcons(map, facilities);

      map.addLayer({
        id: "facility-icon",
        type: "symbol",
        source: facilitySourceId,
        layout: {
          "icon-image": ["get", "icon_id"],
          "icon-size": 1.6,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true
        }
      });

      map.addSource(ticketSourceId, {
        type: "geojson",
        data: ticketsToFeatureCollection(tickets),
        promoteId: "id"
      });
      map.addLayer({
        id: "tickets",
        type: "symbol",
        source: ticketSourceId,
        layout: {
          "icon-image": ["match", ["get", "status"], "overdue", "marker-15", "within_sla", "triangle-15", "circle-15"],
          "icon-size": 1,
          "icon-allow-overlap": true
        },
        paint: {
          "icon-color": ["match", ["get", "status"], "overdue", "#ef4444", "within_sla", "#f59e0b", "#eab308"]
        }
      });

      map.addSource(buildingAgeSourceId, {
        type: "geojson",
        data: buildingAgeToFeatureCollection(buildingAges),
        promoteId: "id"
      });
      map.addLayer({
        id: "building-ages",
        type: "circle",
        source: buildingAgeSourceId,
        paint: {
          "circle-radius": 7,
          "circle-color": ["step", ["get", "age"], "#22c55e", 20, "#fbbf24", 40, "#f97316", 60, "#ef4444"],
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 1
        }
      });

      map.addSource(noiseSourceId, {
        type: "geojson",
        data: noiseToFeatureCollection(noisePoints),
        promoteId: "id"
      });
      map.addLayer({
        id: "noise-points",
        type: "circle",
        source: noiseSourceId,
        paint: {
          "circle-radius": 8,
          "circle-color": noiseCirclePaint(noiseTime),
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 1
        }
      });

      map.on("click", e => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["facility-icon", "tickets", "building-ages", "noise-points", "areas-fill"]
        });

        if (!features.length) return;

        // Prioritize icons over areas
        const facilityFeature = features.find(f => f.layer.id === "facility-icon");
        const ticketFeature = features.find(f => f.layer.id === "tickets");
        const areaFeature = features.find(f => f.layer.id === "areas-fill");

        if (facilityFeature) {
          const id = facilityFeature.id ?? facilityFeature.properties?.id;
          if (id) {
            clickFacilityRef.current?.(String(id));
            return;
          }
        }

        if (ticketFeature) {
          const id = ticketFeature.id ?? ticketFeature.properties?.id;
          if (id) {
            clickTicketRef.current?.(String(id));
            return;
          }
        }

        if (areaFeature) {
          const id = areaFeature.id ?? areaFeature.properties?.id;
          if (id) {
            clickAreaRef.current?.(String(id));
            return;
          }
        }
      });

      ["facility-icon", "tickets", "areas-fill"].forEach(layerId => {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });

      // If the style requests an icon we haven't added yet, generate it on demand.
      map.on("styleimagemissing", (e) => {
        const match = /^lucide-([A-Za-z0-9]+)-(A|B|C)$/.exec(e.id);
        if (!match) return;
        const [, iconName, grade] = match;
        const color = gradeColors[grade as Facility["grade"]] ?? "#cbd5e1";
        addLucideIcon(map, e.id, color, iconName);
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
    const filtered = filteredFacilities(facilities, facilityTypeFilter, facilityStatusFilter);
    addFacilityIcons(map, filtered);
    const areaSource = map.getSource(areaSourceId) as mapboxgl.GeoJSONSource | undefined;
    if (areaSource) areaSource.setData(areasGeoJson);
    const facilitySource = map.getSource(facilitySourceId) as mapboxgl.GeoJSONSource | undefined;
    if (facilitySource) facilitySource.setData(facilitiesToFeatureCollection(filtered));
    const ticketSource = map.getSource(ticketSourceId) as mapboxgl.GeoJSONSource | undefined;
    if (ticketSource) ticketSource.setData(ticketsToFeatureCollection(tickets));
    const buildingAgeSource = map.getSource(buildingAgeSourceId) as mapboxgl.GeoJSONSource | undefined;
    if (buildingAgeSource) buildingAgeSource.setData(buildingAgeToFeatureCollection(buildingAges));
    const noiseSource = map.getSource(noiseSourceId) as mapboxgl.GeoJSONSource | undefined;
    if (noiseSource) noiseSource.setData(noiseToFeatureCollection(noisePoints));
    const fillPaint = areaFillPaint(backgroundMode, noiseTime);
    map.setPaintProperty("areas-fill", "fill-color", fillPaint["fill-color"]);
    map.setPaintProperty("areas-fill", "fill-opacity", fillPaint["fill-opacity"]);
    map.setPaintProperty("noise-points", "circle-color", noiseCirclePaint(noiseTime));
  }, [areasGeoJson, facilities, tickets, buildingAges, noisePoints, facilityTypeFilter, facilityStatusFilter, backgroundMode, noiseTime]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers: Record<keyof typeof activeLayers, string[]> = {
      areas: ["areas-outline"],
      facilities: ["facility-icon"],
      tickets: ["tickets"],
      heatmap: ["areas-fill"],
      buildingAges: ["building-ages"],
      noisePoints: ["noise-points"]
    };
    Object.entries(layers).forEach(([key, ids]) => {
      ids.forEach(id => {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", activeLayers[key as keyof typeof activeLayers] ? "visible" : "none");
      });
    });
  }, [activeLayers]);

  return <div ref={mapContainerRef} className="w-full h-full rounded-2xl overflow-hidden" />;
}

function facilitiesToFeatureCollection(facilities: Facility[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: facilities.map(facility => ({
      type: "Feature",
      id: facility.id,
      geometry: {
        type: "Point",
        coordinates: facility.coordinates
      },
        properties: {
          id: facility.id,
          name: facility.name,
          type: facility.type,
          grade: facility.grade,
          icon_id: facility.iconName ? `lucide-${facility.iconName}-${facility.grade}` : `facility-${facility.type}-${facility.grade}`,
          status: facility.maintenanceStatus
        }
    }))
  };
}

function addFacilityIcons(map: Map, facilities: Facility[]) {
  facilities.forEach(f => {
    const iconKey = f.iconName ? `lucide-${f.iconName}-${f.grade}` : `facility-${f.type}-${f.grade}`;
    if (map.hasImage(iconKey)) return;
    const color = gradeColors[f.grade] ?? statusColors[f.maintenanceStatus] ?? "#cbd5e1";
    addLucideIcon(map, iconKey, color, f.iconName);
  });
}

function addLucideIcon(map: Map, id: string, colorHex: string, iconName?: string) {
  const iconsRecord = lucideIcons as Record<string, FC<LucideProps>>;
  const IconComponent = iconName ? iconsRecord[iconName] : undefined;
  const svgMarkup = IconComponent
    ? renderToStaticMarkup(createElement(IconComponent, { color: colorHex, size: 44, strokeWidth: 2 }))
    : `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /></svg>`;
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  if (map.hasImage(id) || loadingImages.has(id)) return;
  loadingImages.add(id);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    createImageBitmap(img)
      .then((bitmap) => {
        if (!map.hasImage(id)) {
          map.addImage(id, bitmap, { pixelRatio: 2 });
        }
      })
      .finally(() => loadingImages.delete(id))
      .catch(() => {
        loadingImages.delete(id);
      });
  };
  img.onerror = () => {
    loadingImages.delete(id);
  };
  img.src = encoded;
}

function ticketsToFeatureCollection(tickets: Ticket[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: tickets.map(ticket => ({
      type: "Feature",
      id: ticket.id,
      geometry: {
        type: "Point",
        coordinates: ticket.coordinates
      },
      properties: {
        id: ticket.id,
        status: ticket.status
      }
    }))
  };
}

function filteredFacilities(facilities: Facility[], typeFilter: string[], statusFilter: { safe: boolean; in_progress: boolean; overdue: boolean }) {
  return facilities.filter(f => {
    const typePass = typeFilter.length === 0 || typeFilter.includes(f.type);
    const statusPass = statusFilter[f.maintenanceStatus];
    return typePass && statusPass;
  });
}

function buildingAgeToFeatureCollection(points: BuildingAgePoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: points.map(p => ({
      type: "Feature",
      id: p.id,
      geometry: { type: "Point", coordinates: p.coordinates },
      properties: { id: p.id, age: p.ageYears }
    }))
  };
}

function noiseToFeatureCollection(points: NoisePoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: points.map(p => ({
      type: "Feature",
      id: p.id,
      geometry: { type: "Point", coordinates: p.coordinates },
      properties: {
        id: p.id,
        morning: p.morning,
        afternoon: p.afternoon,
        night: p.night
      }
    }))
  };
}

function areaFillPaint(mode: BackgroundMode, noiseTime: NoiseTime): mapboxgl.FillPaint {
  const valueKey =
    mode === "gender_ratio"
      ? "gender_ratio"
      : mode === "avg_age"
      ? "avg_age"
      : mode === "building_age"
      ? "building_age"
      : mode === "safety"
      ? "safety_score"
      : mode === "noise"
      ? (noiseTime === "morning" ? "noise_morning" : noiseTime === "afternoon" ? "noise_afternoon" : "noise_night")
      : "risk";

  if (mode === "gender_ratio") {
    return {
      "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", valueKey], 50], 0, "#2563eb", 50, "#a855f7", 100, "#ef4444"],
      "fill-opacity": 0.35
    };
  }
  if (mode === "avg_age") {
    return {
      "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", valueKey], 0], 0, "#1d4ed8", 35, "#f59e0b", 60, "#ef4444"],
      "fill-opacity": 0.35
    };
  }
  if (mode === "building_age") {
    return {
      "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", valueKey], 0], 0, "#22c55e", 20, "#fbbf24", 40, "#f97316", 60, "#ef4444"],
      "fill-opacity": 0.35
    };
  }
  if (mode === "safety") {
    return {
      "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", valueKey], 0], 0, "#ef4444", 30, "#fbbf24", 70, "#22c55e"],
      "fill-opacity": 0.35
    };
  }
  if (mode === "noise") {
    return {
      "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", valueKey], 0], 30, "#22c55e", 60, "#fbbf24", 75, "#ef4444"],
      "fill-opacity": 0.35
    };
  }
  return {
    "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", valueKey], 0], 0, "#10b981", 40, "#f59e0b", 70, "#ef4444"],
    "fill-opacity": 0.35
  };
}

function noiseCirclePaint(time: NoiseTime) {
  const prop = time === "morning" ? "morning" : time === "afternoon" ? "afternoon" : "night";
  return ["interpolate", ["linear"], ["coalesce", ["get", prop], 0], 30, "#22c55e", 60, "#fbbf24", 75, "#ef4444"] as mapboxgl.DataDrivenPropertyValueSpecification<string>;
}

export default MapView;
