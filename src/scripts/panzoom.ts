/**
 * The scale the mobile map opens at, and the one the "FIT" button returns to.
 * Map.astro renders it as the initial inline transform so the map is already
 * fitted before this module runs; exported so the two cannot drift. (The e2e
 * suite reads the transform after apply() has run, so it would only ever have
 * pinned this copy — a drift in the markup would have shipped a flash of the
 * wrong scale with a green suite.)
 */
export const FIT_SCALE = 0.82;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.4;
const DRAG_THRESHOLD_PX = 6;

export function initPanZoom(): void {
  const host = document.getElementById("bpGM");
  const inner = document.getElementById("bpGMinner");
  if (!host || !inner) return;

  let scale = FIT_SCALE;
  let tx = 0;
  let ty = 0;

  const points = new Map<number, { x: number; y: number }>();
  let panBase: { x: number; y: number; tx: number; ty: number } | null = null;
  let pinchBase: { distance: number; scale: number } | null = null;
  let moved = 0;

  const apply = () => {
    inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  const clamp = (v: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));

  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    const rect = host.getBoundingClientRect();
    const ox = clientX - rect.left - rect.width / 2;
    const oy = clientY - rect.top - rect.height / 2;
    const next = clamp(scale * factor);
    const ratio = next / scale;
    tx = ox - (ox - tx) * ratio;
    ty = oy - (oy - ty) * ratio;
    scale = next;
    apply();
  };

  const distance = () => {
    const [a, b] = [...points.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  host.addEventListener("pointerdown", (event: PointerEvent) => {
    // Never capture the zoom buttons.
    if ((event.target as Element).closest("[data-zoom]")) return;

    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved = 0;

    if (points.size === 1) {
      panBase = { x: event.clientX, y: event.clientY, tx, ty };
      pinchBase = null;
    } else if (points.size === 2) {
      pinchBase = { distance: distance(), scale };
      panBase = null;
    }

    host.setPointerCapture(event.pointerId);
  });

  host.addEventListener("pointermove", (event: PointerEvent) => {
    if (!points.has(event.pointerId)) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (points.size === 1 && panBase) {
      const dx = event.clientX - panBase.x;
      const dy = event.clientY - panBase.y;
      moved = Math.max(moved, Math.hypot(dx, dy));
      tx = panBase.tx + dx;
      ty = panBase.ty + dy;
      apply();
    } else if (points.size === 2 && pinchBase && pinchBase.distance > 0) {
      moved = DRAG_THRESHOLD_PX + 1;
      scale = clamp(pinchBase.scale * (distance() / pinchBase.distance));
      apply();
    }
  });

  const endPointer = (event: PointerEvent) => {
    points.delete(event.pointerId);

    if (points.size === 0) {
      panBase = null;
      pinchBase = null;
    } else if (points.size === 1) {
      // A pinch just dropped to one finger — rebase panning from wherever
      // that finger currently is so the map doesn't jump on the transition.
      const [remaining] = [...points.values()];
      panBase = { x: remaining.x, y: remaining.y, tx, ty };
      pinchBase = null;
    }

    // Flag a drag so the click handler ignores the click that follows it.
    inner.dataset.dragged = moved > DRAG_THRESHOLD_PX ? "1" : "";
    window.setTimeout(() => {
      inner.dataset.dragged = "";
    }, 60);
  };

  host.addEventListener("pointerup", endPointer);
  host.addEventListener("pointercancel", endPointer);

  host.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      event.preventDefault();
      zoomAt(event.deltaY < 0 ? 1.12 : 0.89, event.clientX, event.clientY);
    },
    { passive: false },
  );

  for (const button of host.querySelectorAll<HTMLElement>("[data-zoom]")) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const rect = host.getBoundingClientRect();
      const kind = button.dataset.zoom;

      if (kind === "reset") {
        scale = FIT_SCALE;
        tx = 0;
        ty = 0;
        apply();
      } else {
        zoomAt(
          kind === "in" ? 1.2 : 1 / 1.2,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
      }
    });
  }

  apply();
}
