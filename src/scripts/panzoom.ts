/**
 * The scale the mobile map opens at, and the ceiling the "FIT" button and the
 * runtime fit computation both respect. Map.astro renders it as the initial
 * inline transform so the map is already fitted before this module runs;
 * exported so the two cannot drift. (The e2e suite reads the transform after
 * apply() has run, so it would only ever have pinned this copy — a drift in
 * the markup would have shipped a flash of the wrong scale with a green
 * suite.)
 *
 * The mobile rendition now serves every box shape from a phone in portrait
 * down to a landscape phone barely 100px tall, and 0.82 only fits some of
 * them. computeFitScale() below derives the scale each box actually needs
 * and never goes ABOVE this constant — the approved phone/tablet view stays
 * exactly 0.82 — but drops BELOW it when the box is too short/narrow to fit
 * the content at 0.82 without clipping.
 */
export const FIT_SCALE = 0.82;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.4;
const DRAG_THRESHOLD_PX = 6;

// How much breathing room the fitted view leaves around the content, as a
// fraction of the host box's shorter side. Only ever shrinks the computed
// fit further below FIT_SCALE — see computeFitScale.
const FIT_PADDING_RATIO = 0.04;

interface ContentBox {
  width: number;
  height: number;
  /** Offset of the content's center from the host box's center, unscaled. */
  offsetX: number;
  offsetY: number;
}

/**
 * The scale needed to fit `content` inside `hostW`x`hostH` with a small
 * padding allowance, capped at FIT_SCALE so the approved design (deliberate
 * breathing room at 0.82) is never exceeded — only relaxed downward when the
 * box is too small for it.
 */
function computeFitScale(
  hostW: number,
  hostH: number,
  content: ContentBox | null,
): number {
  if (
    !content ||
    content.width <= 0 ||
    content.height <= 0 ||
    hostW <= 0 ||
    hostH <= 0
  ) {
    return FIT_SCALE;
  }
  const pad = Math.min(hostW, hostH) * FIT_PADDING_RATIO;
  const availW = Math.max(hostW - pad * 2, 1);
  const availH = Math.max(hostH - pad * 2, 1);
  const needed = Math.min(availW / content.width, availH / content.height);
  return Math.min(FIT_SCALE, needed);
}

/**
 * Clamps one axis of translation so the scaled content can never be panned
 * entirely off the host box: when the content is bigger than the box its
 * far edge can never move past the box's edge, and when it is smaller (the
 * fitted case) it is locked centred rather than allowed to drift.
 */
function clampAxis(
  v: number,
  offset: number,
  size: number,
  hostSize: number,
  scale: number,
): number {
  const scaledSize = size * scale;
  const half = scaledSize / 2;
  if (scaledSize <= hostSize) {
    return -offset * scale;
  }
  const min = hostSize / 2 - half - offset * scale;
  const max = half - hostSize / 2 - offset * scale;
  return Math.min(max, Math.max(min, v));
}

export function initPanZoom(): void {
  const host = document.getElementById("bpGM");
  const inner = document.getElementById("bpGMinner");
  if (!host || !inner) return;

  let scale = FIT_SCALE;
  let fitScale = FIT_SCALE;
  let tx = 0;
  let ty = 0;
  // Once the user has actively zoomed or panned, a resize should keep
  // reclamping their view instead of silently snapping it back to fit.
  let userAdjusted = false;
  let content: ContentBox | null = null;

  const points = new Map<number, { x: number; y: number }>();
  let panBase: { x: number; y: number; tx: number; ty: number } | null = null;
  let pinchBase: { distance: number; scale: number } | null = null;
  let moved = 0;

  const apply = () => {
    inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  const clamp = (v: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));

  /** Intrinsic (unscaled) bounding box of the node chips, in host-relative terms. */
  const measureContent = (): ContentBox | null => {
    const nodeEls = inner.querySelectorAll<HTMLElement>("[data-node]");
    if (nodeEls.length === 0) return null;

    const prevTransform = inner.style.transform;
    inner.style.transform = "none";
    const hostRect = host.getBoundingClientRect();

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const el of nodeEls) {
      const r = el.getBoundingClientRect();
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    inner.style.transform = prevTransform;

    if (!Number.isFinite(left)) return null;

    const hostCenterX = hostRect.left + hostRect.width / 2;
    const hostCenterY = hostRect.top + hostRect.height / 2;
    return {
      width: right - left,
      height: bottom - top,
      offsetX: (left + right) / 2 - hostCenterX,
      offsetY: (top + bottom) / 2 - hostCenterY,
    };
  };

  const clampTranslation = () => {
    if (!content) return;
    const hostRect = host.getBoundingClientRect();
    tx = clampAxis(tx, content.offsetX, content.width, hostRect.width, scale);
    ty = clampAxis(ty, content.offsetY, content.height, hostRect.height, scale);
  };

  /**
   * Re-measures content and the host box, refreshes `fitScale`, and — unless
   * the user has already taken over pan/zoom — re-snaps the view to it. In
   * every case the current translation is reclamped against the (possibly
   * new) box before applying, so a resize can never leave content stranded.
   */
  const recomputeFit = (resnap: boolean) => {
    content = measureContent();
    const hostRect = host.getBoundingClientRect();
    fitScale = computeFitScale(hostRect.width, hostRect.height, content);

    if (resnap) {
      scale = fitScale;
      tx = 0;
      ty = 0;
    }
    clampTranslation();
    apply();
  };

  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    userAdjusted = true;
    const rect = host.getBoundingClientRect();
    const ox = clientX - rect.left - rect.width / 2;
    const oy = clientY - rect.top - rect.height / 2;
    const next = clamp(scale * factor);
    const ratio = next / scale;
    tx = ox - (ox - tx) * ratio;
    ty = oy - (oy - ty) * ratio;
    scale = next;
    clampTranslation();
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
      if (moved > DRAG_THRESHOLD_PX) userAdjusted = true;
      tx = panBase.tx + dx;
      ty = panBase.ty + dy;
      clampTranslation();
      apply();
    } else if (points.size === 2 && pinchBase && pinchBase.distance > 0) {
      moved = DRAG_THRESHOLD_PX + 1;
      userAdjusted = true;
      scale = clamp(pinchBase.scale * (distance() / pinchBase.distance));
      clampTranslation();
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
        userAdjusted = false;
        scale = fitScale;
        tx = 0;
        ty = 0;
        clampTranslation();
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

  recomputeFit(true);

  let resizePending = false;
  const resizeObserver = new ResizeObserver(() => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => {
      resizePending = false;
      recomputeFit(!userAdjusted);
    });
  });
  resizeObserver.observe(host);
}
