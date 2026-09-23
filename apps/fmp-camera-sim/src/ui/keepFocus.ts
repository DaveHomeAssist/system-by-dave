/**
 * Spread on operating controls. A mouse or touch press activates the control without moving
 * keyboard focus onto it, so Space still means Stop (and arrows still drive) after a click.
 * Keyboard users still reach the control with Tab and activate it with Enter or Space.
 */
export const keepFocus = {
  onMouseDown: (event: { preventDefault(): void }) => event.preventDefault(),
};

/** Clicking the picture or the venue view hands the keyboard back to camera control. */
export function focusWorkspace(): void {
  document.getElementById("sim-workspace")?.focus({ preventScroll: true });
}
