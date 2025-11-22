import { create } from "zustand";
import type mapboxgl from "mapbox-gl";

export type Scenario =
  | "aging_infra"
  | "gender_ratio"
  | "avg_age"
  | "building_age"
  | "safety"
  | "noise"
  | "custom";

export type BackgroundMode = "risk" | "gender_ratio" | "avg_age" | "building_age" | "safety" | "noise";
export type NoiseTime = "morning" | "afternoon" | "night";

type LayerToggles = {
  areas: boolean;
  facilities: boolean;
  tickets: boolean;
  heatmap: boolean;
  buildingAges: boolean;
  noisePoints: boolean;
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
  backgroundMode: BackgroundMode;
  noiseTime: NoiseTime;
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
  setBackgroundMode: (mode: BackgroundMode) => void;
  setNoiseTime: (time: NoiseTime) => void;
};

export type MapStore = MapState & MapActions;

const defaultLayers: LayerToggles = {
  areas: true,
  facilities: true,
  tickets: true,
  heatmap: true,
  buildingAges: false,
  noisePoints: false,
};

export const useMapStore = create<MapStore>((set) => ({
  viewport: { center: [120.642, 24.162], zoom: 11 },
  selectedScenario: "aging_infra",
  activeLayers: defaultLayers,
  selectedFacilityId: undefined,
  selectedAreaId: undefined,
  facilityTypeFilter: [],
  facilityStatusFilter: { safe: true, in_progress: true, overdue: true },
  backgroundMode: "risk",
  noiseTime: "morning",
  setViewport: (viewport) => set({ viewport }),
  setScenario: (selectedScenario) =>
    set((state) => {
      const baseLayers = { ...state.activeLayers, ...defaultLayers };
      switch (selectedScenario) {
        case "aging_infra":
          return {
            selectedScenario,
            activeLayers: { ...baseLayers, facilities: true, tickets: false, buildingAges: false, noisePoints: false },
            backgroundMode: "risk",
            facilityTypeFilter: [],
          };
        case "gender_ratio":
          return {
            selectedScenario,
            activeLayers: { ...baseLayers, facilities: false, tickets: false, buildingAges: false, noisePoints: false },
            backgroundMode: "gender_ratio",
            facilityTypeFilter: [],
          };
        case "avg_age":
          return {
            selectedScenario,
            activeLayers: { ...baseLayers, facilities: false, tickets: false, buildingAges: false, noisePoints: false },
            backgroundMode: "avg_age",
            facilityTypeFilter: [],
          };
        case "building_age":
          return {
            selectedScenario,
            activeLayers: { ...baseLayers, facilities: true, tickets: false, buildingAges: true, noisePoints: false },
            backgroundMode: "building_age",
            facilityTypeFilter: ["building"],
          };
        case "safety":
          return {
            selectedScenario,
            activeLayers: { ...baseLayers, facilities: true, tickets: false, buildingAges: false, noisePoints: false },
            backgroundMode: "safety",
            facilityTypeFilter: ["cctv", "police_station"],
          };
        case "noise":
          return {
            selectedScenario,
            activeLayers: { ...baseLayers, facilities: false, tickets: false, buildingAges: false, noisePoints: true },
            backgroundMode: "noise",
          };
        case "custom":
        default:
          return { selectedScenario, activeLayers: baseLayers };
      }
    }),
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
  setBackgroundMode: (mode) =>
    set((state) => ({
      backgroundMode: mode,
      selectedScenario: state.selectedScenario === "custom" ? "custom" : state.selectedScenario,
    })),
  setNoiseTime: (time) => set({ noiseTime: time }),
}));
