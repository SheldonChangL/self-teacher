"use client";

import { useMemo } from "react";

/**
 * Tiny markdown renderer for the constrained format we generate:
 *   # H1, ## H2, **bold**, - / * list items, paragraphs, blank lines.
 * Streaming-safe: re-renders cleanly even on partial input.
 */
export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => parse(source), [source]);
  return (
    <div className="prose prose-zinc max-w-none leading-relaxed">
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

function parse(src: string): Block[] {
  const lines = src.split(/\r?\n/);
  const out: Block[] = [];
  let para: string[] = [];
  let list: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list && list.length) {
      out.push({ kind: "ul", items: list });
    }
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const li = line.match(/^[-*]\s+(.+)$/);
    if (h1) {
      flushPara();
      flushList();
      out.push({ kind: "h1", text: h1[1] });
    } else if (h2) {
      flushPara();
      flushList();
      out.push({ kind: "h2", text: h2[1] });
    } else if (li) {
      flushPara();
      if (!list) list = [];
      list.push(li[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out;
}

function inline(text: string) {
  // Split on **bold** preserving the delimiters
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p) ? (
      <strong key={i} className="font-bold text-amber-700">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function Block({ block }: { block: Block }) {
  if (block.kind === "h1")
    return (
      <h1 className="mt-2 mb-4 text-3xl font-extrabold text-amber-700">
        {inline(block.text)}
      </h1>
    );
  if (block.kind === "h2")
    return (
      <h2 className="mt-6 mb-3 text-xl font-bold text-rose-600">
        {inline(block.text)}
      </h2>
    );
  if (block.kind === "ul")
    return (
      <ul className="my-2 list-disc space-y-1 pl-6 text-zinc-800">
        {block.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </ul>
    );
  return <p className="my-3 text-zinc-800">{inline(block.text)}</p>;
}
