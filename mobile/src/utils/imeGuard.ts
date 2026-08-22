/**
 * React/RN-web는 한글 조합 중에 input.value를 다시 써서 자모를 끊는다.
 * 조합이 끝날 때까지 DOM value setter를 막아 브라우저 IME가 완성하게 한다.
 */
export function installImeGuard() {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.onandonImeGuard === '1') return;
  document.documentElement.dataset.onandonImeGuard = '1';
  document.documentElement.lang = 'ko';

  const composing = new WeakSet<Element>();

  const lock = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      composing.add(target);
    }
  };
  const unlock = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => composing.delete(target));
    });
  };

  document.addEventListener('compositionstart', lock, true);
  document.addEventListener('compositionupdate', lock, true);
  document.addEventListener('compositionend', unlock, true);

  const patch = (proto: typeof HTMLInputElement.prototype | typeof HTMLTextAreaElement.prototype) => {
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (!desc?.get || !desc.set) return;
    Object.defineProperty(proto, 'value', {
      configurable: true,
      enumerable: desc.enumerable,
      get() {
        return desc.get!.call(this);
      },
      set(next) {
        if (composing.has(this)) {
          const current = String(desc.get!.call(this));
          const incoming = String(next);
          if (incoming.length < current.length && (current.startsWith(incoming) || incoming.length === 0)) {
            return;
          }
        }
        desc.set!.call(this, next);
      },
    });
  };

  patch(HTMLInputElement.prototype);
  patch(HTMLTextAreaElement.prototype);
}
