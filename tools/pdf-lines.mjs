/**
 * PDF 줄 단위 좌표 추출.
 *
 * 2단 조판에서 좌·우 단을 "순번"으로 짝지으면 어긋난다 — 왼쪽의 긴 능력 하나가
 * 오른쪽의 여러 능력과 나란히 놓이기 때문이다. 세로 위치(y)로 맞춰야 정확하다.
 */
import { execFileSync } from 'node:child_process';

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

const decode = (text) =>
  text.replace(/&(amp|lt|gt|quot|apos);/g, (whole) => ENTITIES[whole] || whole);

/** 페이지마다 [{x, y, text}] 를 돌려준다. y 는 위에서부터의 거리다. */
export function extractLines(pdfPath) {
  const xml = execFileSync('pdftotext', ['-bbox-layout', pdfPath, '-'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  const pages = [];
  const pagePattern = /<page[^>]*>([\s\S]*?)<\/page>/g;
  const linePattern = /<line xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>([\s\S]*?)<\/line>/g;
  const wordPattern = /<word[^>]*>([\s\S]*?)<\/word>/g;

  let pageMatch;
  while ((pageMatch = pagePattern.exec(xml))) {
    const lines = [];
    let lineMatch;

    while ((lineMatch = linePattern.exec(pageMatch[1]))) {
      const words = [];
      let wordMatch;
      while ((wordMatch = wordPattern.exec(lineMatch[3]))) words.push(decode(wordMatch[1]));

      const text = words.join(' ').replace(/\s+/g, ' ').trim();
      if (text) lines.push({ x: Number(lineMatch[1]), y: Number(lineMatch[2]), text });
    }

    lines.sort((a, b) => a.y - b.y || a.x - b.x);
    pages.push(lines);
  }

  return pages;
}

/** 가운데를 기준으로 좌·우 단을 가른다. 표처럼 폭을 다 쓰는 줄은 좌측으로 간다. */
export function splitColumns(lines, middle) {
  return {
    left: lines.filter((line) => line.x < middle),
    right: lines.filter((line) => line.x >= middle),
  };
}
