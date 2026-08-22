export function readLiveImeValue(_fieldKey: string): string {
  return '';
}

export function setImeModalLock(_locked: boolean) {}

export function mountBodyOverlay(_html: string): { root: { querySelector: Function }; dispose: () => void } {
  return { root: { querySelector: () => null }, dispose: () => undefined };
}

export function mountBodyField(): { field: { value: string }; dispose: () => void } {
  return { field: { value: '' }, dispose: () => undefined };
}
