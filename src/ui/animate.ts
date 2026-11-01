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

/** Flirt: the flirter leans in, a heart pops between them, both blush and show their Composure loss.
 * Tempted girls then fade out; a married pair glows together and fades out at the same moment.
 */
export async function animateFlirt(
  attacker: HTMLElement, target: HTMLElement, lossAttacker: number, lossTarget: number, leaving: HTMLElement[], married: boolean,
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
  if (married) {
    await Promise.all([pop.finished.then(() => heart.remove()), ...numbers]);
    await marriageGlow(aTile, tTile, a, t);
    return;
  }
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

/** A discarded hand card sinks and fades while its slot closes, so the other cards slide together without a jump. */
export async function animateDiscard(card: HTMLElement): Promise<void> {
  if (reducedMotion()) return;
  const width = card.getBoundingClientRect().width;
  const gap = parseFloat(getComputedStyle(card.parentElement!).columnGap) || 0;
  card.style.overflow = "hidden";
  card.style.pointerEvents = "none";
  await card.animate(
    [
      { opacity: 1, transform: "translateY(0) rotate(0deg) scale(1)", width: `${width}px`, marginRight: "0px", paddingLeft: "", paddingRight: "", borderLeftWidth: "", borderRightWidth: "" },
      { opacity: 0, transform: "translateY(40px) rotate(6deg) scale(0.92)", width: "0px", marginRight: `${-gap}px`, paddingLeft: "0px", paddingRight: "0px", borderLeftWidth: "0px", borderRightWidth: "0px" },
    ],
    { duration: 380, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
  ).finished;
}

/** Both newlyweds glow together under a rising heart, then fade out at the same moment. */
async function marriageGlow(a: HTMLElement, b: HTMLElement, ca: { x: number; y: number }, cb: { x: number; y: number }): Promise<void> {
  const glow = [
    { boxShadow: "0 0 0 0 #fff4c800", filter: "brightness(1)" },
    { boxShadow: "0 0 26px 10px #fff4c8ee", filter: "brightness(1.35)", offset: 0.6 },
    { boxShadow: "0 0 30px 12px #fff4c8ff", filter: "brightness(1.5)" },
  ];
  const heart = floater("heart wedding", HEART, (ca.x + cb.x) / 2, (ca.y + cb.y) / 2);
  const rise = heart.animate(
    [{ transform: "translate(-50%, -50%) scale(0.4)", opacity: 0 }, { transform: "translate(-50%, -90%) scale(1.5)", opacity: 1 }],
    { duration: 700, easing: "ease-out", fill: "forwards" },
  );
  await Promise.all([
    a.animate(glow, { duration: 700, fill: "forwards" }).finished,
    b.animate(glow, { duration: 700, fill: "forwards" }).finished,
    rise.finished,
  ]);
  const out = [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.85)" }];
  await Promise.all([
    a.animate(out, { duration: 450, easing: "ease-in", fill: "forwards" }).finished,
    b.animate(out, { duration: 450, easing: "ease-in", fill: "forwards" }).finished,
    heart.animate([{ opacity: 1 }, { opacity: 0, transform: "translate(-50%, -140%) scale(1.6)" }], { duration: 450, fill: "forwards" }).finished,
  ]);
  heart.remove();
}

/** A girl tempted into the shown hand flies from her old square into her new hand slot. */
export function animateArrive(card: HTMLElement, from: DOMRect): void {
  if (reducedMotion()) return;
  const to = card.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const scale = Math.min(1, from.width / to.width);
  card.style.zIndex = "6";
  card.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(-8deg)`, opacity: 0.4, boxShadow: "0 0 0 0 #ff5fa200" },
      { transform: "translate(0, -18px) scale(1.04) rotate(2deg)", opacity: 1, boxShadow: "0 0 22px 6px #ff5fa2aa", offset: 0.75 },
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1, boxShadow: "0 4px 14px #0008" },
    ],
    { duration: 650, easing: "cubic-bezier(0.25, 0.8, 0.3, 1)" },
  ).finished.then(() => { card.style.zIndex = ""; });
}

/** A drawn card flies from the deck pile into its hand slot; `delay` staggers the opening hand. */
export function animateDraw(card: HTMLElement, from: DOMRect, delay: number): void {
  if (reducedMotion()) return;
  const to = card.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  card.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(0.6) rotate(-6deg)`, opacity: 0 },
      { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 30}px) scale(0.85) rotate(-2deg)`, opacity: 1, offset: 0.45 },
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
    ],
    { duration: 480, delay, easing: "cubic-bezier(0.25, 0.8, 0.3, 1)", fill: "backwards" },
  );
}
