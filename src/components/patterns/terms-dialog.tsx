"use client";

import { X } from "@phosphor-icons/react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./terms-dialog.module.css";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; rows: string[][] };

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|https?:\/\/\S+)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part)) return <a key={index} href={part} target="_blank" rel="noreferrer">{part}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) { index++; continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) { blocks.push({ type: "heading", level: heading[1].length, text: heading[2] }); index++; continue; }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) items.push(lines[index++].trim().slice(2));
      blocks.push({ type: "list", items }); continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const cells = lines[index++].trim().slice(1, -1).split("|").map(cell => cell.trim());
        if (!cells.every(cell => /^:?-+:?$/.test(cell))) rows.push(cells);
      }
      blocks.push({ type: "table", rows }); continue;
    }
    if (line.startsWith("> ")) { blocks.push({ type: "quote", text: line.slice(2) }); index++; continue; }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s+|^- |^\||^> /.test(lines[index].trim())) paragraph.push(lines[index++].trim());
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}

function TermsContent({ markdown }: { markdown: string }) {
  return parseMarkdown(markdown).map((block, index) => {
    if (block.type === "heading") {
      if (block.level === 1) return <h2 key={index}>{inline(block.text)}</h2>;
      if (block.level === 2) return <h3 key={index}>{inline(block.text)}</h3>;
      return <h4 key={index}>{inline(block.text)}</h4>;
    }
    if (block.type === "paragraph") return <p key={index}>{inline(block.text)}</p>;
    if (block.type === "quote") return <blockquote key={index}>{inline(block.text)}</blockquote>;
    if (block.type === "list") return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>;
    return <div className={styles.tableWrap} key={index}><table><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex}>{inline(cell)}</th> : <td key={cellIndex}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>;
  });
}

/** Accessible legal disclosure that loads the repository Markdown when opened. */
export function TermsDialog({ open, onClose, onAgree }: { open: boolean; onClose: () => void; onAgree?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    if (!open || markdown) return;
    const controller = new AbortController();
    setError("");
    fetch("/api/legal/terms", { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.text(); })
      .then(setMarkdown)
      .catch(reason => { if (reason instanceof Error && reason.name !== "AbortError") setError("Terms and conditions are unavailable. Please try again."); });
    return () => controller.abort();
  }, [open, markdown]);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="terms-title" onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.panel}>
      <header><h2 id="terms-title">Terms &amp; Conditions</h2><button type="button" onClick={onClose} aria-label="Close terms and conditions"><X size={22} /></button></header>
      <div className={styles.content}>{error ? <div role="alert" className={styles.state}>{error}<button type="button" onClick={() => { setError(""); setMarkdown(""); }}>Try again</button></div> : markdown ? <TermsContent markdown={markdown} /> : <p role="status" className={styles.state}>Loading terms and conditions...</p>}</div>
      <footer><button type="button" onClick={() => { onAgree?.(); onClose(); }}>I Agree</button></footer>
    </div>
  </dialog>;
}
