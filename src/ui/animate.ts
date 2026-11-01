/** Board animations (move, flirt, play) with the Web Animations API; all are skipped under prefers-reduced-motion.
 * Usage: await animateMove(fromSquare, toSquare);
 */

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';

/** Whether the user asked the system for reduced motion. */
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const centre = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** A decorative element fixed to the viewport, removed when its animation ends. */
function floater(className: string, html: string, x: number, y: number): HTMLElement {
  const el = document.createElement("div");
  el.className = `floater ${className}`;
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = html;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.append(el);
  return el;
}

/** Slide the girl on one square to another square. */
export async function animateMove(from: HTMLElement, to: HTMLElement): Promise<void> {
  const tile = from.querySelector<HTMLElement>(".tile");
  if (!tile || reducedMotion()) return;
  const a = centre(from);
  const b = centre(to);
  from.style.zIndex = "5";
  await tile.animate(
    [{ transform: "translate(0, 0)" }, { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px)` }],
    { duration: 240, easing: "ease-in-out", fill: "forwards" },
  ).finished;
}

/** Flirt: the flirter leans in, a heart pops between them, both blush and show their Composure loss; leavers fade out. */
export async function animateFlirt(
  attacker: HTMLElement, target: HTMLElement, lossAttacker: number, lossTarget: number, leaving: HTMLElement[],
): Promise<void> {
  const aTile = attacker.querySelector<HTMLElement>(".tile");
  const tTile = target.querySelector<HTMLElement>(".tile");
  if (!aTile || !tTile || reducedMotion()) return;
  const a = centre(attacker);
  const t = centre(target);
  const dx = (t.x - a.x) * 0.22;
  const dy = (t.y - a.y) * 0.22;
  attacker.style.zIndex = "5";

  const lean = aTile.animate(
    [{ transform: "translate(0, 0)" }, { transform: `translate(${dx}px, ${dy}px) rotate(${dx >= 0 ? 4 : -4}deg)`, offset: 0.45 }, { transform: "translate(0, 0)" }],
    { duration: 520, easing: "ease-in-out" },
  );
  const heart = floater("heart", HEART, (a.x + t.x) / 2, (a.y + t.y) / 2);
  const pop = heart.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0 },
      { transform: "translate(-50%, -60%) scale(1.25)", opacity: 1, offset: 0.35 },
      { transform: "translate(-50%, -160%) scale(0.9)", opacity: 0 },
    ],
    { duration: 900, easing: "ease-out", delay: 180 },
  );
  const blush = [{ boxShadow: "0 0 0 0 #ff5fa200" }, { boxShadow: "0 0 18px 6px #ff5fa2cc" }, { boxShadow: "0 0 0 0 #ff5fa200" }];
  aTile.animate(blush, { duration: 700, delay: 220 });
  tTile.animate(blush, { duration: 700, delay: 220 });
  const losses = [[attacker, lossAttacker], [target, lossTarget]] as const;
  const numbers = losses.map(([sq, n]) => {
    const c = centre(sq);
    const el = floater("loss", `-${n}`, c.x, c.y - 10);
    return el.animate(
      [{ transform: "translate(-50%, 0)", opacity: 0 }, { transform: "translate(-50%, -12px)", opacity: 1, offset: 0.3 }, { transform: "translate(-50%, -38px)", opacity: 0 }],
      { duration: 900, delay: 300, easing: "ease-out" },
    ).finished.then(() => el.remove());
  });
  await lean.finished;
  const fades = leaving.map((sq) => sq.querySelector<HTMLElement>(".tile")?.animate(
    [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.6)" }],
    { duration: 320, easing: "ease-in", fill: "forwards" },
  ).finished);
  await Promise.all([pop.finished.then(() => heart.remove()), ...numbers, ...fades]);
}

/** A newly played girl drops onto her square. */
export function animateEnter(square: HTMLElement): void {
  const tile = square.querySelector<HTMLElement>(".tile");
  if (!tile || reducedMotion()) return;
  tile.animate(
    [
      { transform: "translateY(-30px) scale(1.15)", opacity: 0 },
      { transform: "translateY(0) scale(0.96)", opacity: 1, offset: 0.7 },
      { transform: "translateY(0) scale(1)", opacity: 1 },
    ],
    { duration: 340, easing: "ease-out" },
  );
}
