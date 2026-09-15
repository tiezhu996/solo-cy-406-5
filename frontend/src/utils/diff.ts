import { diffWords } from 'diff';

export interface DiffToken {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface DiffRow {
  left: DiffToken[];
  right: DiffToken[];
}

export function htmlToPlainText(html: string) {
  const node = document.createElement('div');
  node.innerHTML = html;
  return node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

export function buildWordDiff(oldHtml: string, nextHtml: string): DiffToken[] {
  return diffWords(htmlToPlainText(oldHtml), htmlToPlainText(nextHtml));
}

export function buildSideBySideDiff(oldHtml: string, nextHtml: string): DiffRow {
  const parts = buildWordDiff(oldHtml, nextHtml);

  return parts.reduce<DiffRow>(
    (acc, part) => {
      if (part.added) {
        acc.right.push({ value: part.value, added: true });
      } else if (part.removed) {
        acc.left.push({ value: part.value, removed: true });
      } else {
        acc.left.push({ value: part.value });
        acc.right.push({ value: part.value });
      }
      return acc;
    },
    { left: [], right: [] }
  );
}
