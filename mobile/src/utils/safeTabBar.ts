/** Bottom tab metrics that keep icons above the system navigation bar. */
export const TAB_BAR_CONTENT_HEIGHT = 64;

export function tabBarStyleForInset(bottomInset: number) {
  const paddingBottom = Math.max(8, Math.round(bottomInset || 0));
  return {
    height: TAB_BAR_CONTENT_HEIGHT + paddingBottom,
    paddingBottom,
    paddingTop: 8,
  };
}
