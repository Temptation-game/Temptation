/** Player settings (AI difficulty, animations, font), saved in localStorage and applied as classes on <html>.
 * Usage: const s = loadSettings(); applySettings(s); saveSettings({ ...s, font: "dyslexic" });
 */
import type { Difficulty } from "../ai/greedy.ts";

export interface Settings {
  difficulty: Difficulty;
  /** "system" follows the operating system's reduced-motion preference. */
  motion: "system" | "on" | "off";
  font: "standard" | "dyslexic";
}

const KEY = "temptation.settings";
export const DEFAULTS: Settings = { difficulty: "normal", motion: "system", font: "standard" };

const OPTIONS = {
  difficulty: ["easy", "normal", "hard"],
  motion: ["system", "on", "off"],
  font: ["standard", "dyslexic"],
} as const;

/** Read saved settings, falling back to defaults for anything missing or invalid. */
export function loadSettings(): Settings {
  let saved: Partial<Record<keyof Settings, string>> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { saved = {}; }
  const pick = <K extends keyof Settings>(k: K): Settings[K] =>
    ((OPTIONS[k] as readonly string[]).includes(saved[k] ?? "") ? saved[k] : DEFAULTS[k]) as Settings[K];
  return { difficulty: pick("difficulty"), motion: pick("motion"), font: pick("font") };
}

/** Save settings and apply them to the page. */
export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: settings last for this visit */ }
  applySettings(s);
}

const systemReduce = matchMedia("(prefers-reduced-motion: reduce)");
let current: Settings = DEFAULTS;

/** Set the <html> classes that the styles and animations read: reduce-motion and font-dyslexic. */
export function applySettings(s: Settings): void {
  current = s;
  const reduce = s.motion === "off" || (s.motion === "system" && systemReduce.matches);
  document.documentElement.classList.toggle("reduce-motion", reduce);
  document.documentElement.classList.toggle("font-dyslexic", s.font === "dyslexic");
}

systemReduce.addEventListener("change", () => applySettings(current));
