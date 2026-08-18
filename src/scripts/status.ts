import { careerYears, statusWord } from "../lib/dates";

const TICK_MS = 60_000;

export function initStatus(): void {
  const render = () => {
    const word = statusWord();
    for (const el of document.querySelectorAll<HTMLElement>("[data-status]")) {
      el.textContent =
        el.dataset.status === "short"
          ? `currently ${word}`
          : `brisbane · currently ${word}`;
    }
  };

  for (const el of document.querySelectorAll<HTMLElement>(
    "[data-career-years]"
  )) {
    el.textContent = String(careerYears());
  }

  render();
  window.setInterval(render, TICK_MS);
}
