// The geometry of the canvas, without files: which group a node is in, and how the
// nodes around one that was placed, created or enlarged move to make room. Pure and
// deterministic: the same positions give the same result.

/** A node of the canvas as a rectangle; a group holds the nodes inside it. */
export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  group: boolean;
}

/** The space left between nodes moved to make room, and between nodes placed by the runtime. */
export const GAP = 40;
/** The margin of a group around its nodes when it grows. */
export const GROUP_PADDING = 40;

export const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const inside = (a: Box, b: Box): boolean =>
  a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height;
const centerInside = (a: Box, b: Box): boolean => {
  const cx = a.x + a.width / 2;
  const cy = a.y + a.height / 2;
  return cx >= b.x && cx <= b.x + b.width && cy >= b.y && cy <= b.y + b.height;
};
/** The order of every pass: from the top, then from the left, then by id. */
const byPlace = (a: Box, b: Box) => a.y - b.y || a.x - b.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The group of each node: the smallest group that holds it whole, as Obsidian reads a
 * group. A node in `loose` (one just placed) is in the smallest group that holds its
 * center, since it may stick out of it.
 */
export function parents(boxes: Box[], loose: ReadonlySet<string> = new Set()): Map<string, string> {
  const result = new Map<string, string>();
  const groups = boxes.filter((box) => box.group).sort((a, b) => a.width * a.height - b.width * b.height || (a.id < b.id ? -1 : 1));
  for (const box of boxes) {
    const holder = groups.find((group) => group !== box && (loose.has(box.id) ? centerInside(box, group) : inside(box, group)) && !(box.group && inside(group, box)));
    if (holder) result.set(box.id, holder.id);
  }
  return result;
}

type Direction = 'right' | 'down' | 'left' | 'up';
/** The order of the directions when two moves are as short. */
const DIRECTIONS: Direction[] = ['right', 'down', 'left', 'up'];

/** How far `box` must move in a direction to leave `from` free, with the gap. */
function distance(from: Box, box: Box, direction: Direction): number {
  switch (direction) {
    case 'right': return from.x + from.width + GAP - box.x;
    case 'down': return from.y + from.height + GAP - box.y;
    case 'left': return box.x + box.width + GAP - from.x;
    case 'up': return box.y + box.height + GAP - from.y;
  }
}
const step = (direction: Direction, length: number) =>
  direction === 'right' ? { dx: length, dy: 0 } : direction === 'down' ? { dx: 0, dy: length } : direction === 'left' ? { dx: -length, dy: 0 } : { dx: 0, dy: -length };

/**
 * Makes room around the anchors, which stay where they are: a node that overlaps one
 * moves by the shortest way out, and pushes on in the same direction the nodes it then
 * overlaps. A group moves with the nodes inside it; a group with an anchor inside first
 * makes room within itself, then grows to hold its nodes and pushes outside. Returns the
 * boxes that changed, by id. `known` gives the group of nodes whose group is known
 * already, as after arrange; the others are read from the places.
 */
export function makeRoom(all: Box[], anchors: string[], known?: ReadonlyMap<string, string | null>): Map<string, Box> {
  const boxes = new Map(all.map((box) => [box.id, { ...box }]));
  const anchorSet = new Set(anchors.filter((id) => boxes.has(id)));
  const parent = parents([...boxes.values()], anchorSet);
  for (const [id, group] of known ?? []) {
    if (group === null) parent.delete(id);
    else parent.set(id, group);
  }
  const children = new Map<string | null, string[]>();
  for (const id of boxes.keys()) {
    const key = parent.get(id) ?? null;
    children.set(key, [...(children.get(key) ?? []), id]);
  }
  const descendants = (id: string): string[] => (children.get(id) ?? []).flatMap((child) => [child, ...descendants(child)]);
  const move = (id: string, dx: number, dy: number) => {
    for (const each of [id, ...descendants(id)]) {
      const box = boxes.get(each)!;
      box.x += dx;
      box.y += dy;
    }
  };

  /** One level: the units are the nodes with the same parent; the anchors stay. */
  const settle = (level: string | null, fixed: Set<string>) => {
    const units = (children.get(level) ?? []).map((id) => boxes.get(id)!);
    const order: string[] = [...fixed].filter((id) => units.some((unit) => unit.id === id));
    const pushed = new Map<string, Direction>();
    for (let pass = 0; pass < 50; pass++) {
      let changed = false;
      const done = new Set<string>();
      const queue = [...order];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (done.has(id)) continue;
        done.add(id);
        const from = boxes.get(id)!;
        for (const other of [...units].sort(byPlace)) {
          if (other.id === id || done.has(other.id) || fixed.has(other.id) || !overlaps(from, other)) continue;
          // From an anchor, the shortest way out; from a node pushed, on in its direction.
          const direction = pushed.get(id) ?? DIRECTIONS.reduce((best, each) => (distance(from, other, each) < distance(from, other, best) ? each : best));
          const { dx, dy } = step(direction, distance(from, other, direction));
          move(other.id, dx, dy);
          if (!pushed.has(other.id)) {
            pushed.set(other.id, direction);
            order.push(other.id);
          }
          queue.push(other.id);
          changed = true;
        }
      }
      if (!changed) break;
    }
  };

  /** A group holds its nodes again: it grows, never shrinks; true if it grew. */
  const grow = (id: string): boolean => {
    const group = boxes.get(id)!;
    const inner = (children.get(id) ?? []).map((child) => boxes.get(child)!);
    if (inner.length === 0) return false;
    const left = Math.min(group.x, ...inner.map((box) => box.x - GROUP_PADDING));
    const top = Math.min(group.y, ...inner.map((box) => box.y - GROUP_PADDING));
    const right = Math.max(group.x + group.width, ...inner.map((box) => box.x + box.width + GROUP_PADDING));
    const bottom = Math.max(group.y + group.height, ...inner.map((box) => box.y + box.height + GROUP_PADDING));
    if (left === group.x && top === group.y && right === group.x + group.width && bottom === group.y + group.height) return false;
    Object.assign(group, { x: left, y: top, width: right - left, height: bottom - top });
    return true;
  };

  // From the deepest groups with an anchor inside up to the canvas: each level settles, its group grows and becomes an anchor above.
  const depth = (id: string): number => (parent.has(id) ? 1 + depth(parent.get(id)!) : 0);
  const fixedAt = new Map<string | null, Set<string>>();
  for (const id of anchorSet) {
    const level = parent.get(id) ?? null;
    fixedAt.set(level, new Set([...(fixedAt.get(level) ?? []), id]));
  }
  const levels = () => [...fixedAt.keys()].sort((a, b) => (b === null ? -1 : a === null ? 1 : depth(b) - depth(a)));
  const settled = new Set<string | null>();
  for (let level = levels().find((each) => !settled.has(each)); level !== undefined; level = levels().find((each) => !settled.has(each))) {
    settled.add(level);
    settle(level, fixedAt.get(level)!);
    if (level !== null && grow(level)) {
      const above = parent.get(level) ?? null;
      fixedAt.set(above, new Set([...(fixedAt.get(above) ?? []), level]));
    }
  }

  const changed = new Map<string, Box>();
  for (const box of all) {
    const now = boxes.get(box.id)!;
    if (now.x !== box.x || now.y !== box.y || now.width !== box.width || now.height !== box.height) changed.set(box.id, now);
  }
  return changed;
}

/** A place next to a box for a new one: to the right or below, where the new box overlaps less; to the right when even. */
export function besidePlace(target: Box, size: { width: number; height: number }, others: Box[]): { x: number; y: number } {
  const candidates = [
    { x: target.x + target.width + GAP, y: target.y },
    { x: target.x, y: target.y + target.height + GAP },
  ];
  const crowding = (at: { x: number; y: number }) => {
    const box: Box = { id: '', ...at, ...size, group: false };
    return others.filter((other) => !other.group && other.id !== target.id).reduce((sum, other) => {
      if (!overlaps(box, other)) return sum;
      const width = Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x);
      const height = Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y);
      return sum + width * height;
    }, 0);
  };
  return crowding(candidates[1]!) < crowding(candidates[0]!) ? candidates[1]! : candidates[0]!;
}

/**
 * Places around a box, nearest first: right, below, left, above, then the corners, then
 * the next ring; each slot holds a box of `size`.
 */
export function aroundPlaces(target: Box, size: { width: number; height: number }, count: number): Array<{ x: number; y: number }> {
  const stepX = Math.max(target.width, size.width) + GAP;
  const stepY = Math.max(target.height, size.height) + GAP;
  const places: Array<{ x: number; y: number }> = [];
  for (let ring = 1; places.length < count; ring++) {
    const cells: Array<[number, number]> = [];
    for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) cells.push([dx, dy]);
    // The sides before the corners, and on each side the order right, below, left, above.
    const side = ([dx, dy]: [number, number]) => (dx === ring && Math.abs(dy) < ring ? 0 : dy === ring && Math.abs(dx) < ring ? 1 : dx === -ring && Math.abs(dy) < ring ? 2 : dy === -ring && Math.abs(dx) < ring ? 3 : 4);
    cells.sort((a, b) => side(a) - side(b) || Math.abs(a[0]) + Math.abs(a[1]) - (Math.abs(b[0]) + Math.abs(b[1])) || a[1] - b[1] || a[0] - b[0]);
    for (const [dx, dy] of cells) places.push({ x: target.x + dx * stepX, y: target.y + dy * stepY });
  }
  return places.slice(0, count);
}
