import { useEffect, useState } from 'react';
import { REGION_PRESETS, regionById, type RegionPreset } from '../constants/regionTour';
import { readJson, writeJson } from '../utils/storage';

export interface RegionState {
  selectedRegion: { code: string; name: string; id: string; label: string };
  setRegion: (region: { code: string; name: string; id?: string; label?: string }) => void;
}

const KEY = 'onandon-selected-region';
const DEFAULT = {
  id: 'GYEONGGI',
  code: '31',
  name: '경기도',
  label: '경기온',
};

const loaded = readJson<Partial<typeof DEFAULT>>(KEY, DEFAULT);
const preset = regionById(loaded.id);
let state = {
  id: preset.id,
  code: preset.code,
  name: preset.name,
  label: preset.label,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(next: typeof state) {
  state = next;
  writeJson(KEY, state);
  listeners.forEach((fn) => fn());
}

export function getSelectedRegion() {
  return state;
}

export function setRegion(region: { code: string; name: string; id?: string; label?: string }) {
  const found = REGION_PRESETS.find((item) => item.id === region.id || item.code === region.code || item.label === region.name)
    ?? regionById(region.id);
  emit({
    id: found.id,
    code: found.code,
    name: found.name,
    label: found.label,
  });
}

export function useRegionStore(): RegionState {
  const [selected, setSelected] = useState(state);
  useEffect(() => {
    const listen = () => setSelected(getSelectedRegion());
    listeners.add(listen);
    return () => { listeners.delete(listen); };
  }, []);
  return {
    selectedRegion: selected,
    setRegion,
  };
}

export function useSelectedRegionPreset(): RegionPreset {
  const { selectedRegion } = useRegionStore();
  return regionById(selectedRegion.id);
}
