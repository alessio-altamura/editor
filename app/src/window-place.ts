// Where the separate window of the preview opens: where it was, on its
// screen; if that screen is gone, or the window would no longer show on it, on the primary
// screen, centred, with its size as far as it fits. Without Electron, for the unit tests.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Screen {
  id: number;
  workArea: Rect;
}
/** What the preferences keep of the window: its bounds and the id of its screen. */
export interface SavedWindow {
  bounds: Rect;
  display: number;
}

/** At least this much of the window must be on its screen for it to open there again. */
const VISIBLE = { width: 120, height: 80 };
const DEFAULT = { width: 900, height: 1000 };

export function placeWindow(saved: SavedWindow | undefined, screens: Screen[], primary: Screen): Rect {
  const screen = saved === undefined ? undefined : screens.find((each) => each.id === saved.display);
  if (saved !== undefined && screen !== undefined) {
    const { bounds } = saved;
    const area = screen.workArea;
    const width = Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x);
    const height = Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y);
    if (width >= VISIBLE.width && height >= VISIBLE.height) return { ...bounds };
  }
  const area = primary.workArea;
  const width = Math.min(saved?.bounds.width ?? DEFAULT.width, area.width);
  const height = Math.min(saved?.bounds.height ?? DEFAULT.height, area.height);
  return { x: area.x + Math.round((area.width - width) / 2), y: area.y + Math.round((area.height - height) / 2), width, height };
}
