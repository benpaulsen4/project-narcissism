/**
 * The map's caption turns into a prompt to tap a node.
 *
 * With the reading panel an overlay, a visitor who lands on `/` sees only
 * the graph — and nothing on screen says the nodes are tappable. After a
 * few seconds of nothing being opened, the map's existing top-left caption
 * swaps its line for one that does. It reuses that caption rather than
 * adding furniture, because the map's other three corners are spoken for
 * and a landscape phone has no vertical room to spare.
 */

/** Long enough to be a prompt rather than an interruption. */
const HINT_DELAY_MS = 5000;

export function initHint(): void {
  const hint = document.querySelector<HTMLElement>("[data-map-hint]");
  const sheet = document.querySelector<HTMLElement>("[data-sheet]");
  if (!hint || !sheet) return;

  // A node route arrives with its panel already open, so this visitor has
  // been shown what a node does and needs no prompting.
  if (sheet.hasAttribute("data-open")) return;

  const timer = window.setTimeout(() => {
    hint.setAttribute("data-hint", "");
  }, HINT_DELAY_MS);

  // The sheet opening is the signal, whoever caused it — a tapped chip, a
  // history traversal, the core node. Watching the attribute keeps this
  // module and the map island independent of each other, with no event or
  // callback to keep in step.
  //
  // Disconnecting here is the whole of the "only once" rule, and it is
  // deliberately scoped to this page rather than to the tab. Persisting it
  // in `sessionStorage` was the obvious next step and the wrong one: the
  // first node anyone opened then silenced the prompt for the life of the
  // tab, reloads included, so on any browser that had visited the site
  // even once the prompt never appeared again.
  const observer = new MutationObserver(() => {
    if (!sheet.hasAttribute("data-open")) return;
    window.clearTimeout(timer);
    hint.removeAttribute("data-hint");
    observer.disconnect();
  });
  observer.observe(sheet, { attributes: true, attributeFilter: ["data-open"] });
}
