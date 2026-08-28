import { readJson, writeJson } from '../utils/storage';
import { downloadFeedRewardPdf, type FeedRewardRow, type FeedRewardStatus } from '../utils/feedRewardDocument';
import { METRO_LOCALITIES, REGION_LABEL } from '../constants/regions';

export type FeedPayoutMode = 'payable' | 'blocked';

export interface FeedPayoutPolicy {
  key: string;
  metro: string;
  city: string;
  festivalId?: string;
  festivalTitle?: string;
  mode: FeedPayoutMode;
}

export interface UserPointRecord extends FeedRewardRow {
  userId?: string;
}

const POLICY_KEY = 'onandon-feed-payout-policies';
const LEDGER_KEY = 'onandon-feed-point-ledger';

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeFeedPayout(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function policyKey(metro: string, city: string, festivalId?: string) {
  const base = `${metro || 'ALL'}:${city || ''}`;
  return festivalId ? `${base}:${festivalId}` : base;
}

export function listFeedPayoutPolicies(): FeedPayoutPolicy[] {
  return readJson<FeedPayoutPolicy[]>(POLICY_KEY, []);
}

export function getFeedPayoutMode(input: { metro?: string; city?: string; festivalId?: string }): FeedPayoutMode {
  const policies = listFeedPayoutPolicies();
  const metro = String(input.metro || '');
  const city = String(input.city || '');
  const festivalId = String(input.festivalId || '');
  const exact = policies.find((row) => row.key === policyKey(metro, city, festivalId) || (festivalId && row.festivalId === festivalId));
  if (exact) return exact.mode;
  const cityRow = policies.find((row) => row.metro === metro && row.city === city && !row.festivalId);
  if (cityRow) return cityRow.mode;
  return 'payable';
}

export function setFeedPayoutMode(input: {
  metro: string;
  city: string;
  festivalId?: string;
  festivalTitle?: string;
  mode: FeedPayoutMode;
}) {
  const key = policyKey(input.metro, input.city, input.festivalId);
  const next = listFeedPayoutPolicies().filter((row) => row.key !== key);
  next.unshift({
    key,
    metro: input.metro,
    city: input.city,
    festivalId: input.festivalId,
    festivalTitle: input.festivalTitle,
    mode: input.mode,
  });
  writeJson(POLICY_KEY, next);
  emit();
}

export function listUserPointRecords(): UserPointRecord[] {
  return readJson<UserPointRecord[]>(LEDGER_KEY, []);
}

export function cityFromAddress(metro: string, text: string): string {
  const hay = String(text || '');
  const locs = METRO_LOCALITIES[metro] ?? [];
  const hit = locs.find((loc) => hay.includes(loc.label) || (loc.nameTokens || []).some((token) => token.length >= 2 && hay.includes(token)));
  if (hit) return hit.label;
  const match = hay.match(/([가-힣]+(?:시|군|구))/);
  return match?.[1] || '';
}

export function recordUserPoints(input: Partial<UserPointRecord> & Pick<UserPointRecord, 'userName' | 'festival' | 'city' | 'regionalZone'>) {
  const row: UserPointRecord = {
    id: input.id || `UP-${Date.now()}`,
    userName: input.userName,
    festival: input.festival,
    city: input.city,
    regionalZone: input.regionalZone,
    regionLabel: input.regionLabel || REGION_LABEL[input.regionalZone] || input.regionalZone,
    amountWon: input.amountWon ?? input.points ?? 0,
    points: input.points ?? input.amountWon ?? 0,
    postedAt: input.postedAt || new Date().toISOString().slice(0, 10),
    status: input.status || 'PENDING',
    userId: input.userId,
  };
  const current = listUserPointRecords();
  const exists = current.some((item) => item.id === row.id);
  writeJson(LEDGER_KEY, exists ? current.map((item) => (item.id === row.id ? row : item)) : [row, ...current]);
  emit();
  return row;
}

export function downloadFeedPointsPdf(): boolean {
  const rows = listUserPointRecords();
  if (!rows.length) return false;
  return downloadFeedRewardPdf(rows, undefined, { print: false });
}

export function approveUserPoints(id: string, status: FeedRewardStatus = 'PAID') {
  const current = listUserPointRecords().map((row) => (row.id === id ? { ...row, status } : row));
  writeJson(LEDGER_KEY, current);
  emit();
}

export function mergeFeedRewardRows(base: FeedRewardRow[]): FeedRewardRow[] {
  const extra = listUserPointRecords();
  const seen = new Set(extra.map((row) => row.id));
  return [...extra, ...base.filter((row) => !seen.has(row.id))];
}

export function regionLabelOf(metro: string) {
  return REGION_LABEL[metro] || metro;
}
