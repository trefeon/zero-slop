import type { Paragraph, ScanContext, Sentence, TextStats, Token } from "./types.js";

/**
 * Zero-slop tokenizer + text statistics for the engine layer (M1).
 *
 * This module is pure text analysis: it owns no rules and no findings. The
 * runner builds one ScanContext via buildContext() and hands it to every
 * checker, so token/line/column and the derived stats are the single source
 * of truth for positional and statistical matchers.
 *
 * Documented approximations / limitations:
 * - Tokens follow the fixed pattern WORD_PATTERN (below) exactly: a token must
 *   START with a letter, so "2FA" yields "FA" and punctuation is never part of
 *   a token.
 * - Sentence splitting is line-oriented by design: every hard line break
 *   (\n) ends the current sentence because much scanned text is written
 *   one-line-per-sentence. Within a line, a sentence ends after sentence-final
 *   punctuation (. ! ? …) that is followed by whitespace or end of content.
 * - Abbreviation handling is an approximation: a bare "." directly after a
 *   known abbreviation stem (Mr, Dr, etc.) or after a single letter (e, i, U)
 *   does NOT end a sentence. Everything else after a "." is treated as final.
 * - CJK text has no reliable sentence boundary: ideographs tokenize as one
 *   run per unbroken span, so CJK is grouped per line (one sentence per line).
 * - Sentence/paragraph `start`/`end` are raw content offsets; `text` is
 *   whitespace-trimmed. Paragraph `sentenceIndexes` refer to the order
 *   produced by splitSentences(content, tokens).
 * - sentenceLengthVariance is the population coefficient of variation
 *   (stdev / mean) and is 0 for fewer than 2 sentences.
 *
 * TRANSITION_MARKERS / HEDGE_MARKERS are derived from the canonical list rules
 * in rules/prose.json (M0 database):
 * - TRANSITION_MARKERS <- ZS-PROSE-007 "Banned transition phrases" (kind: list)
 * - HEDGE_MARKERS      <- ZS-PROSE-043 "Weasel words and hedge qualifiers" (kind: list)
 * The grounding test test/tokenize.test.ts re-loads the real rules file and
 * fails if these arrays drift from the database.
 */
export const TRANSITION_MARKERS: string[] = [
  "furthermore",
  "moreover",
  "notwithstanding",
  "that being said",
  "with that in mind",
  "it's worth mentioning that",
  "it is worth mentioning that",
  "it's worth noting that",
  "it is worth noting that",
  "at its core",
  "to put it simply",
  "in essence",
  "this begs the question",
  "in the landscape of",
  "additionally",
  "firstly",
  "secondly",
  "thirdly",
];

export const HEDGE_MARKERS: string[] = [
  "helps ensure",
  "help ensure",
  "may be able to",
  "can potentially",
  "could potentially",
  "remarkably",
  "surprisingly",
  "arguably",
  "apparently",
  "seems to",
];

/** Word token: starts with a letter, may continue with letters/digits/apostrophes/hyphens. */
const WORD_PATTERN = /\p{L}[\p{L}\p{N}'’-]*/gu;

/** Sentence-final punctuation. */
const SENTENCE_FINAL: Record<string, true> = { ".": true, "!": true, "?": true, "…": true };

/**
 * Abbreviation stems after which a bare "." does not end a sentence
 * (approximation — see module doc). Single letters (e.g. the "e" of "e.g.",
 * the "I" of "I.") are handled separately in isAbbreviationEnd.
 */
const ABBREVIATIONS: Record<string, true> = {
  mr: true, mrs: true, ms: true, mx: true, dr: true, prof: true, sr: true,
  jr: true, st: true, rev: true, fr: true, etc: true, vs: true, approx: true,
  fig: true, no: true, vol: true, est: true, inc: true, ltd: true, co: true,
  jan: true, feb: true, mar: true, apr: true, jun: true, jul: true,
  aug: true, sep: true, sept: true, oct: true, nov: true, dec: true,
  al: true, cf: true, dept: true, govt: true, misc: true, mt: true,
  sec: true, sen: true, sq: true, tel: true, univ: true, phd: true,
};

/**
 * Tokenize content into words with 1-based line/column positions.
 * Line and column are counted in UTF-16 code units (JS string indices).
 */
export function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  const re = WORD_PATTERN;
  let line = 1;
  let lineStart = 0;
  let scanPos = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    // Advance line bookkeeping across the gap since the previous token.
    for (; scanPos < m.index; scanPos++) {
      if (content.charCodeAt(scanPos) === 10 /* \n */) {
        line++;
        lineStart = scanPos + 1;
      }
    }
    tokens.push({
      word: m[0],
      start: m.index,
      end: m.index + m[0].length,
      line,
      column: m.index - lineStart + 1,
    });
    scanPos = m.index + m[0].length;
  }
  return tokens;
}

/** True when a bare "." directly after `word` should not end a sentence. */
function isAbbreviationEnd(word: string): boolean {
  const stem = word.toLowerCase();
  return ABBREVIATIONS[stem] === true || /^[a-z]$/.test(stem);
}

/**
 * Split tokens into sentences. See module doc for the line-oriented model,
 * abbreviation approximation, and CJK behavior.
 */
export function splitSentences(content: string, tokens: Token[]): Sentence[] {
  const sentences: Sentence[] = [];
  if (tokens.length === 0) return sentences;

  let rawStart = 0; // raw content offset where the current sentence begins
  let wordCount = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    wordCount++;
    const nextStart = i + 1 < tokens.length ? tokens[i + 1]!.start : content.length;
    const gap = content.slice(tok.end, nextStart);

    let boundaryEnd: number | null = null;
    if (tok.end === content.length) {
      boundaryEnd = content.length;
    } else if (gap.includes("\n")) {
      // Hard line break always ends the sentence (line-oriented model).
      boundaryEnd = tok.end + gap.indexOf("\n");
    } else {
      const trimmed = gap.trimEnd();
      const last = trimmed[trimmed.length - 1];
      if (last !== undefined && SENTENCE_FINAL[last] === true && !(trimmed === "." && isAbbreviationEnd(tok.word))) {
        boundaryEnd = tok.end + trimmed.length;
      }
    }

    if (boundaryEnd !== null) {
      const rawText = content.slice(rawStart, boundaryEnd);
      const text = rawText.trim();
      sentences.push({
        text,
        start: rawStart + (rawText.length - rawText.trimStart().length),
        end: boundaryEnd,
        wordCount,
      });
      rawStart = boundaryEnd;
      wordCount = 0;
    }
  }

  // Trailing whitespace with no final punctuation: close the last sentence.
  if (wordCount > 0) {
    const rawText = content.slice(rawStart);
    const text = rawText.trim();
    sentences.push({
      text,
      start: rawStart + (rawText.length - rawText.trimStart().length),
      end: content.length,
      wordCount,
    });
  }

  return sentences;
}

/**
 * Split content into paragraphs on blank lines (a line containing only
 * whitespace). sentenceIndexes are the indexes of the sentences (per
 * splitSentences) contained in each paragraph.
 */
export function splitParagraphs(content: string, tokens: Token[]): Paragraph[] {
  // Sentence segmentation is recomputed from the same tokens so that
  // sentenceIndexes are consistent with the externally produced sentences.
  const sentences = splitSentences(content, tokens);

  // Line spans: [start, end) where `end` is the \n position (or content.length).
  const lines: Array<{ start: number; end: number; blank: boolean }> = [];
  let lineStart = 0;
  let nl = content.indexOf("\n");
  while (nl !== -1) {
    lines.push({ start: lineStart, end: nl, blank: /^\s*$/.test(content.slice(lineStart, nl)) });
    lineStart = nl + 1;
    nl = content.indexOf("\n", lineStart);
  }
  lines.push({ start: lineStart, end: content.length, blank: /^\s*$/.test(content.slice(lineStart)) });

  const paragraphs: Paragraph[] = [];
  let paraStart = -1; // raw start of the current paragraph's first line
  let paraEnd = 0; // content offset just past the current paragraph's last line
  for (const line of lines) {
    if (line.blank) {
      if (paraStart !== -1) {
        paragraphs.push({ start: paraStart, end: paraEnd, text: "", sentenceIndexes: [], wordCount: 0 });
        paraStart = -1;
      }
    } else if (paraStart === -1) {
      paraStart = line.start;
      paraEnd = line.end + (line.end < content.length ? 1 : 0);
    } else {
      paraEnd = line.end + (line.end < content.length ? 1 : 0);
    }
  }
  if (paraStart !== -1) {
    paragraphs.push({ start: paraStart, end: paraEnd, text: "", sentenceIndexes: [], wordCount: 0 });
  }

  // Assign sentence indexes (sentences never cross blank lines, so a greedy
  // pointer over the sorted, disjoint paragraphs is exact).
  let s = 0;
  for (const para of paragraphs) {
    const indexes: number[] = [];
    while (s < sentences.length && sentences[s]!.end <= para.end) {
      indexes.push(s);
      s++;
    }
    para.sentenceIndexes = indexes;
    para.wordCount = indexes.reduce((acc, si) => acc + sentences[si]!.wordCount, 0);
    para.text = content.slice(para.start, para.end).trim();
  }

  return paragraphs;
}

function countMarkers(content: string, markers: string[]): number {
  const lower = content.toLowerCase();
  let count = 0;
  for (const marker of markers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu");
    const matches = lower.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

/** Longest run of consecutive sentences where each adjacent pair differs by <= 2 words. */
function maxSameLengthRun(lengths: number[]): number {
  if (lengths.length === 0) return 0;
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < lengths.length; i++) {
    if (Math.abs(lengths[i]! - lengths[i - 1]!) <= 2) {
      run++;
      if (run > maxRun) maxRun = run;
    } else {
      run = 1;
    }
  }
  return maxRun;
}

/** Precompute every statistic described by TextStats. */
export function computeStats(
  content: string,
  tokens: Token[],
  sentences: Sentence[],
  paragraphs: Paragraph[],
): TextStats {
  const sentenceLengths = sentences.map((s) => s.wordCount);
  const mean =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((acc, n) => acc + n, 0) / sentenceLengths.length
      : 0;
  // Population standard deviation, then coefficient of variation.
  let variance = 0;
  if (sentenceLengths.length >= 2 && mean > 0) {
    const sumSq = sentenceLengths.reduce((acc, n) => acc + (n - mean) ** 2, 0);
    variance = Math.sqrt(sumSq / sentenceLengths.length) / mean;
  }
  return {
    wordCount: tokens.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    sentenceLengths,
    paragraphWordCounts: paragraphs.map((p) => p.wordCount),
    emDashCount: (content.match(/—/g) ?? []).length,
    exclamationCount: (content.match(/!/g) ?? []).length,
    ellipsisCount: (content.match(/…|\.\.\./g) ?? []).length,
    transitionCount: countMarkers(content, TRANSITION_MARKERS),
    hedgeCount: countMarkers(content, HEDGE_MARKERS),
    sentenceLengthVariance: variance,
    maxRunOfSameLengthSentences: maxSameLengthRun(sentenceLengths),
  };
}

/** Build the full scan context consumed by every checker. */
export function buildContext(
  content: string,
  opts: { file?: string; isMarkdown?: boolean } = {},
): ScanContext {
  const tokens = tokenize(content);
  const sentences = splitSentences(content, tokens);
  const paragraphs = splitParagraphs(content, tokens);
  const isMarkdown = opts.isMarkdown ?? /\.mdx?$/i.test(opts.file ?? "");
  return {
    file: opts.file,
    content,
    tokens,
    sentences,
    paragraphs,
    stats: computeStats(content, tokens, sentences, paragraphs),
    isMarkdown,
    codeZones: isMarkdown ? findCodeZones(content) : undefined,
  };
}

/**
 * Markdown code zones: ```/~~~ fenced blocks and `inline code` spans.
 * Prose matchers must not flag terms inside these (example lists, JSON
 * samples, and identifiers are code, not copy).
 */
export function findCodeZones(content: string): Array<{ start: number; end: number }> {
  const zones: Array<{ start: number; end: number }> = [];
  // Fenced blocks: triple backticks or tildes (3+), with optional info string.
  const fenceRe = /(^|\n)[ \t]*(\`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n[ \t]*\2/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(content)) !== null) {
    // Cover the whole fence, markers included, so fence lines are never prose.
    const start = m.index + (m[1]!.length > 0 ? 1 : 0);
    const end = m.index + m[0].length;
    zones.push({ start, end });
  }
  // Inline code spans: single backticks (skip when inside a fence, already cut).
  const inlineRe = /`([^`\n]+)`/g;
  while ((m = inlineRe.exec(content)) !== null) {
    const innerStart = m.index + 1;
    const innerEnd = m.index + m[1]!.length + 1;
    if (zones.some((z) => z.start <= innerStart && innerEnd <= z.end)) continue;
    zones.push({ start: innerStart, end: innerEnd });
  }
  // Markdown table rows (`| ... |`) are data, not prose — never flagged.
  const tableRe = /^[ \t]*\|.*\n/gm;
  while ((m = tableRe.exec(content)) !== null) {
    zones.push({ start: m.index, end: m.index + m[0].length });
  }
  return zones;
}
