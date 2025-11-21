import { createElement, useEffect, useRef, type FC } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import mapboxgl, { type Map } from "mapbox-gl";
import type GeoJSON from "geojson";
import { configureMapbox } from "../lib/mapbox";
import { useMapStore } from "../store/mapStore";
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
        paint: {
          "fill-color": ["interpolate", ["linear"], ["get", "risk"], 0, "#10b981", 40, "#f59e0b", 70, "#ef4444"],
          "fill-opacity": 0.35
        }
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

      map.on("click", e => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["facility-icon", "tickets", "areas-fill"]
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
  }, [areasGeoJson, facilities, tickets, facilityTypeFilter, facilityStatusFilter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers: Record<keyof typeof activeLayers, string[]> = {
      areas: ["areas-fill", "areas-outline"],
      facilities: ["facility-icon"],
      tickets: ["tickets"],
      heatmap: ["areas-fill"]
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
  const statusColors: Record<Facility["maintenanceStatus"], string> = {
    safe: "#22c55e",
    in_progress: "#fbbf24",
    overdue: "#ef4444"
  };
  const gradeColors: Record<Facility["grade"], string> = {
    A: "#22c55e",
    B: "#f59e0b",
    C: "#ef4444"
  };

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

  map.loadImage(encoded, (error, image) => {
    if (error || !image) return;
    if (map.hasImage(id)) return;
    map.addImage(id, image);
  });
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

export default MapView;
