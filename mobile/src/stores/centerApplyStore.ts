import type {
  CenterApplicationRecord,
  CenterApplyInput,
  CenterDirectorProfile,
  CenterOverlay,
  CenterReviewStatus,
} from '../constants/centerDirectors';
import { directorTitleFor, websiteForLocality, localityWebSlug } from '../constants/centerDirectors';

const KEY = 'onandon-center-applications-v2';
const LEGACY_KEY = 'onandon-center-applications';

type State = {
  applications: CenterApplicationRecord[];
  directors: Record<string, CenterDirectorProfile>;
  reviewingKeys: string[];
};

let memory: State = { applications: [], directors: {}, reviewingKeys: [] };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function persist(next: State) {
  memory = next;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  emit();
}

function read(): State {
  if (typeof localStorage === 'undefined') return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      memory = {
        applications: Array.isArray(parsed.applications) ? parsed.applications : [],
        directors: parsed.directors && typeof parsed.directors === 'object' ? parsed.directors : {},
        reviewingKeys: Array.isArray(parsed.reviewingKeys) ? parsed.reviewingKeys : [],
      };
      return memory;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const keys = JSON.parse(legacy);
      memory = {
        applications: [],
        directors: {},
        reviewingKeys: Array.isArray(keys) ? keys.map(String) : [],
      };
    }
  } catch {
    // keep memory
  }
  return memory;
}

function nextId() {
  return `APP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribeCenterApplications(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function listCenterApplications(): CenterApplicationRecord[] {
  return read().applications.map((row) => ({ ...row }));
}

export function listAppliedKeys(): string[] {
  const state = read();
  return [...new Set([
    ...state.reviewingKeys,
    ...state.applications.map((row) => row.localityKey),
    ...Object.keys(state.directors),
  ])];
}

export function centerOverlay(): CenterOverlay {
  const state = read();
  return {
    applications: state.applications,
    directors: state.directors,
    reviewingKeys: state.reviewingKeys,
  };
}

export function rememberApplication(input: CenterApplyInput | string, meta?: { localityLabel?: string; region?: string; regionLabel?: string }) {
  if (typeof input === 'string') {
    const state = read();
    persist({ ...state, reviewingKeys: [...new Set([...state.reviewingKeys, input])] });
    return;
  }
  const state = read();
  const row: CenterApplicationRecord = {
    id: input.id || nextId(),
    localityKey: input.localityKey,
    name: input.name,
    age: input.age,
    phone: input.phone,
    email: input.email,
    address: input.address,
    photoUrl: input.photoUrl,
    career: input.career,
    intro: input.intro,
    submittedAt: new Date().toISOString(),
    reviewStatus: 'submitted',
    cardApplied: false,
    localityLabel: meta?.localityLabel,
    region: meta?.region,
    regionLabel: meta?.regionLabel,
  };
  persist({
    ...state,
    applications: [...state.applications.filter((item) => item.id !== row.id), row],
  });
  return row;
}

export function hydrateRemoteApplications(rows: CenterApplicationRecord[]) {
  const state = read();
  const byId = new Map(state.applications.map((row) => [row.id, row]));
  rows.forEach((row) => {
    if (row?.id) byId.set(row.id, { ...byId.get(row.id), ...row });
  });
  persist({ ...state, applications: [...byId.values()] });
}

export function reviewLocalApplication(id: string, status: CenterReviewStatus) {
  const state = read();
  const applications = state.applications.map((row) => (
    row.id === id ? { ...row, reviewStatus: status } : row
  ));
  const target = applications.find((row) => row.id === id);
  const reviewingKeys = [...state.reviewingKeys];
  const directors = { ...state.directors };
  if (target && status === 'reviewing' && !directors[target.localityKey]) {
    reviewingKeys.push(target.localityKey);
  }
  if (target && status === 'selected') {
    directors[target.localityKey] = {
      name: target.name,
      title: directorTitleFor(target.regionLabel || '', target.localityLabel || ''),
      phone: target.phone,
      email: target.email || `${localityWebSlug(target.localityLabel || '')}@kdanji.com`,
      intro: target.intro,
      photoUrl: target.photoUrl,
      address: target.address,
      website: websiteForLocality(target.localityLabel || ''),
      age: target.age,
    };
  }
  persist({ applications, directors, reviewingKeys: [...new Set(reviewingKeys)] });
  return target;
}

export function applyLocalBusinessCard(id: string) {
  const state = read();
  const target = state.applications.find((row) => row.id === id);
  if (!target) return null;
  const applications = state.applications.map((row) => (
    row.id === id ? { ...row, reviewStatus: 'selected' as const, cardApplied: true } : row
  ));
  persist({
    applications,
    reviewingKeys: state.reviewingKeys,
    directors: {
      ...state.directors,
      [target.localityKey]: {
        name: target.name,
        title: directorTitleFor(target.regionLabel || '', target.localityLabel || ''),
        phone: target.phone,
        email: target.email || `${localityWebSlug(target.localityLabel || '')}@kdanji.com`,
        intro: target.intro,
        photoUrl: target.photoUrl,
        address: target.address,
        website: websiteForLocality(target.localityLabel || ''),
        age: target.age,
      },
    },
  });
  return { ...target, reviewStatus: 'selected' as const, cardApplied: true };
}
