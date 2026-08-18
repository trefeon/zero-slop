import type { Domain, Rule, Tier } from "../rules.js";

/** A single slop detection result. */
export interface Finding {
  /** Rule id, e.g. ZS-PROSE-019. */
  ruleId: string;
  domain: Domain;
  tier: Tier;
  /** Rule title, e.g. "Em-dash cap: max 1 per 500 words". */
  title: string;
  /** Human-readable message with the evidence and (for caps) the count. */
  message: string;
  /** Matched text snippet. */
  evidence: string;
  /** Source file when scanning a file. */
  file?: string;
  /** 1-based line. */
  line?: number;
  /** 1-based column. */
  column?: number;
  /** Number of occurrences (for caps/statistical rules). */
  count: number;
}

/** One word token with its position. */
export interface Token {
  word: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

/** One sentence with its span. */
export interface Sentence {
  text: string;
  start: number;
  end: number;
  wordCount: number;
}

/** One paragraph (blank-line separated) with its span. */
export interface Paragraph {
  text: string;
  start: number;
  end: number;
  sentenceIndexes: number[];
  wordCount: number;
}

/** Precomputed statistics used by statistical matchers. */
export interface TextStats {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  /** Words per sentence, in order. */
  sentenceLengths: number[];
  /** Words per paragraph, in order. */
  paragraphWordCounts: number[];
  emDashCount: number;
  exclamationCount: number;
  ellipsisCount: number;
  /** Count of transition phrases (list from prose rules). */
  transitionCount: number;
  /** Count of hedge markers (list from prose rules). */
  hedgeCount: number;
  /** Coefficient of variation of sentence lengths (stdev/mean). */
  sentenceLengthVariance: number;
  /** Longest run of consecutive sentences whose lengths differ by <= 2 words. */
  maxRunOfSameLengthSentences: number;
}

/** Fully tokenized scan context handed to every checker. */
export interface ScanContext {
  /** Source file path, when scanning a file. */
  file?: string;
  /** Full text being scanned. */
  content: string;
  tokens: Token[];
  sentences: Sentence[];
  paragraphs: Paragraph[];
  stats: TextStats;
  /** True when the content is markdown (prose rules apply to it). */
  isMarkdown: boolean;
  /**
   * Markdown code zones (backtick/tilde fences + inline backtick spans),
   * as [start, end) offsets. Prose matchers must not flag text inside them.
   */
  codeZones?: Array<{ start: number; end: number }>;
}

export interface ScanOptions {
  /** Drop findings below this tier. Default "info" (keep all). */
  minTier?: Tier;
  /** Cap occurrences reported per rule. Default 50. */
  maxFindingsPerRule?: number;
  /** Treat content as markdown regardless of extension. */
  isMarkdown?: boolean;
}

/** Every checker has this shape. */
export type Engine = (rules: Rule[], ctx: ScanContext, opts: ScanOptions) => Finding[];
