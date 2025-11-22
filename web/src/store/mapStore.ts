import { create } from "zustand";
import type mapboxgl from "mapbox-gl";

export type Scenario =
  | "home_safety"
  | "official_priority"
  | "aging_infra"
  | "incident_hotspots"
  | "custom";

type LayerToggles = {
  areas: boolean;
  facilities: boolean;
  tickets: boolean;
  heatmap: boolean;
};

export type FacilityStatusFilter = {
  safe: boolean;
  in_progress: boolean;
  overdue: boolean;
};

type MapState = {
  viewport: {
    center: mapboxgl.LngLatLike;
    zoom: number;
    bounds?: mapboxgl.LngLatBoundsLike;
  };
  selectedScenario: Scenario;
  activeLayers: LayerToggles;
  selectedFacilityId?: string;
  selectedAreaId?: string;
  facilityTypeFilter: string[];
  facilityStatusFilter: FacilityStatusFilter;
};

type MapActions = {
  setViewport: (viewport: MapState["viewport"]) => void;
  setScenario: (scenario: Scenario) => void;
  toggleLayer: (key: keyof LayerToggles, value?: boolean) => void;
  selectFacility: (id?: string) => void;
  selectArea: (id?: string) => void;
  toggleFacilityType: (type: string) => void;
  toggleFacilityStatus: (status: keyof FacilityStatusFilter, value?: boolean) => void;
  resetFacilityTypeFilter: () => void;
};

export type MapStore = MapState & MapActions;

const defaultLayers: LayerToggles = {
  areas: true,
  facilities: true,
  tickets: true,
  heatmap: true,
};

const scenarioLayerDefaults: Record<Scenario, Partial<LayerToggles>> = {
  home_safety: { areas: true, facilities: true, tickets: true, heatmap: false },
  official_priority: { areas: true, facilities: true, tickets: true, heatmap: true },
  aging_infra: { areas: true, facilities: true, tickets: false, heatmap: true },
  incident_hotspots: { areas: true, facilities: false, tickets: true, heatmap: true },
  custom: {},
};

export const useMapStore = create<MapStore>((set) => ({
  viewport: { center: [120.642, 24.162], zoom: 11 },
  selectedScenario: "official_priority",
  activeLayers: defaultLayers,
  selectedFacilityId: undefined,
  selectedAreaId: undefined,
  facilityTypeFilter: [],
  facilityStatusFilter: { safe: true, in_progress: true, overdue: true },
  setViewport: (viewport) => set({ viewport }),
  setScenario: (selectedScenario) =>
    set((state) => ({
      selectedScenario,
      activeLayers: { ...state.activeLayers, ...scenarioLayerDefaults[selectedScenario] },
    })),
  toggleLayer: (key, value) =>
    set((state) => {
      const nextLayers = { ...state.activeLayers, [key]: value ?? !state.activeLayers[key] };
      // When the user manually toggles layers, switch to custom scenario to reflect manual overrides.
      return { activeLayers: nextLayers, selectedScenario: "custom" };
    }),
  selectFacility: (selectedFacilityId) =>
    set((state) => ({
      selectedFacilityId,
      // Clear area selection when focusing a facility to avoid stale "nearby" panels.
      selectedAreaId: selectedFacilityId ? undefined : state.selectedAreaId,
    })),
  selectArea: (selectedAreaId) => set({ selectedAreaId }),
  toggleFacilityType: (type) =>
    set((state) => {
      const hasType = state.facilityTypeFilter.includes(type);
      const next = hasType ? state.facilityTypeFilter.filter((t) => t !== type) : [...state.facilityTypeFilter, type];
      return { facilityTypeFilter: next };
    }),
  toggleFacilityStatus: (status, value) =>
    set((state) => ({
      facilityStatusFilter: { ...state.facilityStatusFilter, [status]: value ?? !state.facilityStatusFilter[status] },
    })),
  resetFacilityTypeFilter: () => set({ facilityTypeFilter: [] }),
}));
