/** Minimal markdown to HTML for the rules docs: headings, paragraphs, lists, *italic*, **bold**, \* escapes.
 * Usage: element.innerHTML = renderMarkdown(md);
 */

/** Escape HTML and apply inline emphasis. */
function inline(text: string): string {
  return text
    .replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
    .replace(/\\\*/g, "\u0000")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\u0000/g, "*");
}

/** Render a markdown document; heading levels are shifted by `headingOffset` to fit the page outline. */
export function renderMarkdown(md: string, headingOffset = 0): string {
  const out: string[] = [];
  let para: string[] = [];
  type Item = { text: string; sub: string[] };
  let list: { tag: "ul" | "ol"; start: number; items: Item[] } | null = null;
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`); para = []; };
  const item = (i: Item) =>
    `<li>${inline(i.text)}${i.sub.length ? `<ul>${i.sub.map((s) => `<li>${inline(s)}</li>`).join("")}</ul>` : ""}</li>`;
  const flushList = () => {
    if (list) {
      const start = list.tag === "ol" && list.start !== 1 ? ` start="${list.start}"` : "";
      out.push(`<${list.tag}${start}>${list.items.map(item).join("")}</${list.tag}>`);
    }
    list = null;
  };
  for (const raw of md.replace(/<!--[\s\S]*?-->/g, "").split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^(\d+)[.)]\s*(.*)$/);
    if (heading) {
      flushPara(); flushList();
      const level = Math.min(6, heading[1].length + headingOffset);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet && list?.tag === "ol") {
      list.items[list.items.length - 1].sub.push(bullet[1]);
    } else if (bullet || numbered) {
      flushPara();
      const tag = bullet ? "ul" : "ol";
      if (!list || list.tag !== tag) { flushList(); list = { tag, start: numbered ? Number(numbered[1]) : 1, items: [] }; }
      list.items.push({ text: bullet ? bullet[1] : numbered![2], sub: [] });
    } else if (!line) {
      flushPara(); flushList();
    } else if (list && raw.startsWith(" ")) {
      list.items[list.items.length - 1].text += " " + line;
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara(); flushList();
  return out.join("\n");
}
