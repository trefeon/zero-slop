/**
 * Zero-slop TEXT-domain engine (M1): prose + chat + integrity rules.
 *
 * scanProse() runs every rule whose domain is prose, chat, or integrity and
 * emits at most ONE finding per rule (count = total occurrences).
 *
 * Matcher coverage (rules/prose.json + chat.json + integrity.json, 102 rules):
 *   - regex (35 rules), list (31 rules), statistical (12 rules): implemented.
 *   - semantic (24 rules): skipped silently — they need a language model
 *     (colon reveals, rule-of-three, hedging seesaw, fabricated claims, ...).
 *   - ast: never appears in these domains; skipped defensively.
 *
 * Documented semantics / approximations:
 *   - List matcher: word-boundary lookarounds /(?<![\p{L}\p{N}])term(?![\p{L}\p{N}])/u,
 *     case-insensitive unless params.caseSensitive === true. One finding per
 *     rule when hits > 0; evidence = matched term(s); count = total hits.
 *   - Regex matcher: new RegExp(pattern, caseSensitive ? "g" : "gi"), with
 *     params.flags honored by appending any flags not already present (e.g.
 *     ZS-PROSE-062 carries flags "u"). Non-compilable patterns are skipped
 *     silently (none in the current database).
 *   - Cap logic (applies to regex AND list matchers), using the WHOLE-CONTENT
 *     word count (ctx.stats.wordCount):
 *       - params.maxPerPiece N      -> allowed = N; fail when hits > N.
 *       - params.maxPerWords N      -> allowed = max(1, floor(wc / (wordsWindow ?? N)));
 *         (em-dash / exclamation caps; the max(1, ...) floor keeps a single
 *         dash legal in a short piece).
 *       - params.maxPerNWords N     -> allowed = floor(wc * N / window)
 *         (e.g. maxPer500Words: 2; NO max(1) floor — below one full window
 *         the allowance is 0, so one occurrence fails; fixture-forced by
 *         ZS-PROSE-024 / ZS-PROSE-058).
 *       - no cap params -> fail on any hit.
 *     When several cap keys are present, maxPerPiece wins, then maxPerWords.
 *   - Paragraph-scoped statistical metrics (paragraphUniformity,
 *     transitionDensity, openingWordRun) fall back to SENTENCES when the
 *     content has fewer than 2 paragraphs — the canonical fail fixtures are
 *     single-paragraph strings, so sentences are the only usable unit there.
 *   - segmentalEntropy compares the coefficient of variation of sentence
 *     lengths between the OPENING half and the CLOSING half of the text
 *     (the rule speaks of intro/body/conclusion, but a 3-segment split of the
 *     pass fixture degenerates to all-zero variances; the 2-segment reading is
 *     fixture-constrained).
 *   - paragraphLayoutRun with a single paragraph treats "layout" as the
 *     sentence-length sequence and flags an exact periodic repetition of a
 *     pattern (3+ repetitions).
 *   - maxFindingsPerRule (default 50): since each rule yields at most one
 *     finding, this bounds the total findings returned (in rule order).
 *   - Line/column of a finding: the first token covering the match, falling
 *     back to the nearest preceding token (matches that are pure punctuation,
 *     e.g. em dashes, are not tokens).
 */
import type { Finding, ScanContext, ScanOptions, Sentence, Token } from "./types.js";
import type { Rule, Tier } from "../rules.js";
import { TRANSITION_MARKERS, computeStats } from "./tokenize.js";

const TIER_ORDER: Record<Tier, number> = { error: 0, warning: 1, info: 2 };
const MAX_EVIDENCE = 160;

/** Word-boundary lookaround prefix (list matcher). */
const BOUNDARY = "(?<![\\p{L}\\p{N}])";

/** Adverbial sentence openers counted by the transitionDensity metric (ZS-PROSE-053). */
const ADVERBIAL_OPENERS: Record<string, true> = {
  however: true, moreover: true, furthermore: true, additionally: true,
  therefore: true, thus: true, hence: true, consequently: true, meanwhile: true,
  nevertheless: true, nonetheless: true, similarly: true, likewise: true,
  accordingly: true, subsequently: true, overall: true, ultimately: true,
  finally: true, first: true, firstly: true, second: true, secondly: true,
  third: true, thirdly: true, next: true, then: true, also: true, indeed: true,
  notably: true, interestingly: true, importantly: true, certainly: true,
  clearly: true, obviously: true, generally: true, typically: true, usually: true,
  currently: true, eventually: true, besides: true, instead: true, otherwise: true,
  rather: true, admittedly: true, arguably: true, conversely: true,
  alternatively: true, "in addition": true, "as a result": true,
  "for example": true, "for instance": true, "in contrast": true,
  "on the other hand": true, "in summary": true, "in conclusion": true,
};

/** Transition phrases (1-3 words) usable as a paragraph/sentence opener. */
const TRANSITION_OPENERS: Record<string, true> = { ...ADVERBIAL_OPENERS };
for (const marker of TRANSITION_MARKERS) {
  if (marker.split(/\s+/).length <= 3) TRANSITION_OPENERS[marker] = true;
}

/**
 * Hedging markers for ZS-PROSE-056 (per the rule's own notes: may, might,
 * could, potentially, probably, generally, usually, arguably, likely,
 * it seems, it appears, unclear, remains to be seen).
 */
const HEDGE_RE = /\b(?:may|might|could|potentially|probably|generally|usually|arguably|likely|unclear|appears?|seems?)\b|\bremains to be seen\b/gi;

/** Cap evaluation result: null = within cap (no finding). */
interface CapResult {
  allowed: number;
  label: string;
}

export function scanProse(rules: Rule[], ctx: ScanContext, opts: ScanOptions = {}): Finding[] {
  const minTier = opts.minTier ?? "info";
  const maxFindings = opts.maxFindingsPerRule ?? 50;
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (rule.domain !== "prose" && rule.domain !== "chat" && rule.domain !== "integrity") continue;
    const finding = runRule(rule, ctx);
    if (!finding) continue;
    if (TIER_ORDER[finding.tier] > TIER_ORDER[minTier]) continue; // below minTier
    findings.push(finding);
    if (findings.length >= maxFindings) break;
  }
  return findings;
}

function runRule(rule: Rule, ctx: ScanContext): Finding | null {
  switch (rule.matcher.type) {
    case "list":
      return matchList(rule, ctx);
    case "regex":
      return matchRegex(rule, ctx);
    case "statistical":
      return matchStatistical(rule, ctx);
    case "semantic":
    case "ast":
      return null; // skipped silently (see header)
  }
}

/* ------------------------------------------------------------------ */
/* List matcher                                                        */
/* ------------------------------------------------------------------ */

/**
 * Iterate every match of a global regex over `text`.
 *
 * Do NOT rely on lastIndex auto-advancement: V8/JSC reset lastIndex to 0
 * after exec() on a pattern containing a lookbehind (observed with the list
 * matcher's `(?<!...)term(?!...)` boundaries), which otherwise loops forever.
 * The index is advanced manually by match length (1 for zero-length matches).
 */
function* matchAll(re: RegExp, text: string): Generator<{ index: number; text: string }> {
  let from = 0;
  re.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    yield { index: m.index, text: m[0] };
    const next = m.index + Math.max(1, m[0].length);
    if (next <= from) break; // defensive: never go backwards
    from = next;
    re.lastIndex = from;
  }
}

function matchList(rule: Rule, ctx: ScanContext): Finding | null {
  if (rule.matcher.type !== "list") return null;
  const { terms, params = {} } = rule.matcher;
  const caseSensitive = params.caseSensitive === true;
  const flags = "u" + (caseSensitive ? "" : "i");
  let totalHits = 0;
  const matchedTerms: string[] = [];
  let firstIndex = Infinity;

  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${BOUNDARY}${escaped}(?![\\p{L}\\p{N}])`, flags);
    let termHits = 0;
    for (const m of matchAll(re, ctx.content)) {
      if (inCodeZone(ctx, m.index)) continue; // ZS-PROSE-067: exclude code spans
      termHits++;
      if (m.index < firstIndex) firstIndex = m.index;
    }
    if (termHits > 0) {
      totalHits += termHits;
      matchedTerms.push(term);
    }
  }
  if (totalHits === 0) return null;

  const cap = applyCap(ctx, totalHits, params);
  if (!cap) return null;
  return makeFinding(rule, ctx, matchedTerms.join(", "), firstIndex, totalHits, cap);
}

/* ------------------------------------------------------------------ */
/* Regex matcher                                                       */
/* ------------------------------------------------------------------ */

function matchRegex(rule: Rule, ctx: ScanContext): Finding | null {
  if (rule.matcher.type !== "regex") return null;
  const { pattern, params = {} } = rule.matcher;
  const caseSensitive = params.caseSensitive === true;
  let flags = caseSensitive ? "g" : "gi";
  if (typeof params.flags === "string") {
    for (const ch of params.flags) if (!flags.includes(ch)) flags += ch;
  }
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch {
    return null; // non-compilable pattern: skipped silently (documented)
  }
  const matches: Array<{ index: number; text: string }> = [];
  for (const m of matchAll(re, ctx.content)) {
    if (inCodeZone(ctx, m.index)) continue; // ZS-PROSE-067: exclude code spans
    matches.push(m);
  }
  if (matches.length === 0) return null;

  const cap = applyCap(ctx, matches.length, params);
  if (!cap) return null;
  return makeFinding(rule, ctx, matches[0]!.text, matches[0]!.index, matches.length, cap);
}

/* ------------------------------------------------------------------ */
/* Shared cap logic                                                    */
/* ------------------------------------------------------------------ */

function applyCap(ctx: ScanContext, hits: number, params: Record<string, unknown>): CapResult | null {
  const wc = ctx.stats.wordCount;

  if (typeof params.maxPerPiece === "number") {
    if (hits > params.maxPerPiece) return { allowed: params.maxPerPiece, label: "per piece" };
    return null;
  }
  if (typeof params.maxPerWords === "number") {
    const window = typeof params.wordsWindow === "number" ? params.wordsWindow : params.maxPerWords;
    const allowed = Math.max(1, Math.floor(wc / window));
    if (hits > allowed) return { allowed, label: `per ${window} words` };
    return null;
  }
  const perWordsKey = Object.keys(params).find((k) => /^maxPer\d+Words$/.test(k));
  if (perWordsKey) {
    const window = Number(perWordsKey.slice("maxPer".length, -"Words".length));
    const capN = Number(params[perWordsKey]);
    const allowed = Math.floor((wc * capN) / window);
    if (hits > allowed) return { allowed, label: `per ${window} words` };
    return null;
  }
  if (hits > 0) return { allowed: 0, label: "" }; // no cap: any hit fails
  return null;
}

/* ------------------------------------------------------------------ */
/* Statistical matcher                                                 */
/* ------------------------------------------------------------------ */

function matchStatistical(rule: Rule, ctx: ScanContext): Finding | null {
  if (rule.matcher.type !== "statistical") return null;
  const params = rule.matcher.params ?? {};
  const c = codeVisibleContext(ctx); // stats over prose only, code zones excluded
  switch (rule.matcher.metric) {
    case "shortSentenceRun": return statShortSentenceRun(rule, c, params);
    case "uniformSentenceLength": return statUniformSentenceLength(rule, c, params);
    case "burstiness": return statBurstiness(rule, c, params);
    case "paragraphUniformity": return statParagraphUniformity(rule, c, params);
    case "transitionDensity": return statTransitionDensity(rule, c, params);
    case "openingWordRun": return statOpeningWordRun(rule, c, params);
    case "segmentalEntropy": return statSegmentalEntropy(rule, c, params);
    case "hedgingDensity": return statHedgingDensity(rule, c, params);
    case "bulletRun": return statBulletRun(rule, c, params);
    case "paragraphLayoutRun": return statParagraphLayoutRun(rule, c, params);
    case "sentenceCount": return statSentenceCount(rule, c, params);
    case "listItemsPerSide": return statListItemsPerSide(rule, c, params);
    case "typeTokenRatio": return statTypeTokenRatio(rule, c, params);
    case "wordCount": return statWordCount(rule, c, params);
    case "corroboratingSignals": return statCorroboratingSignals(rule, c, params);
    default:
      return null; // metric not implementable from ScanContext (documented)
  }
}

/**
 * Statistical metrics must only see prose: markdown code zones (fences, inline
 * spans) are code, not copy, and skew rhythm/entropy/density signals. When no
 * zones exist (plain text), returns ctx unchanged.
 */
function codeVisibleContext(ctx: ScanContext): ScanContext {
  const zones = ctx.codeZones;
  if (!zones || zones.length === 0) return ctx;
  const inZone = (start: number, end: number) =>
    zones.some((z) => !(end <= z.start || start >= z.end));
  const tokens = ctx.tokens.filter((t) => !inZone(t.start, t.end));
  // Markdown headings and fence markers are structure, not prose — never
  // rhythm/entropy/density units. Keep the same predicate for the index map.
  const keepSentence = (s: Sentence): boolean => {
    if (inZone(s.start, s.end)) return false;
    const head = s.text.trimStart();
    return !(head.startsWith("#") || head.startsWith("```") || head.startsWith("~~~"));
  };
  // Remap sentence indexes so paragraph.sentenceIndexes stay valid.
  const sentIdxMap = new Map<number, number>();
  let nextIdx = 0;
  for (let i = 0; i < ctx.sentences.length; i++) {
    if (keepSentence(ctx.sentences[i]!)) {
      sentIdxMap.set(i, nextIdx++);
    }
  }
  const sentences = ctx.sentences.filter(keepSentence);
  const paragraphs = ctx.paragraphs
    .filter((p) => !inZone(p.start, p.end))
    .map((p) => ({
      ...p,
      sentenceIndexes: p.sentenceIndexes
        .filter((i) => sentIdxMap.has(i))
        .map((i) => sentIdxMap.get(i)!),
    }));
  if (sentences.length === ctx.sentences.length && paragraphs.length === ctx.paragraphs.length) {
    return ctx;
  }
  return { ...ctx, tokens, sentences, paragraphs, stats: computeStats(ctx.content, tokens, sentences, paragraphs) };
}

/** ZS-PROSE-039: run of consecutive short sentences (<= maxWords) longer than maxRun. */
function statShortSentenceRun(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const maxWords = num(params.maxWords, 8);
  const maxRun = num(params.maxRun, 2);
  const { start, run } = longestRun(ctx.sentences, (s) => s.wordCount <= maxWords);
  if (run <= maxRun) return null;
  return statFinding(rule, ctx, run, ctx.sentences[start]!.text, ctx.sentences[start]!.start, `${run} consecutive short sentences (<= ${maxWords} words each); allowed run: ${maxRun}`);
}

/** ZS-PROSE-050: run of consecutive sentences whose adjacent lengths differ by <= tolerance. */
function statUniformSentenceLength(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const runLength = num(params.runLength, 3);
  const tolerance = num(params.toleranceWords, 0);
  const { start, run } = longestRun(ctx.sentences, (s, i, all) =>
    i === 0 || Math.abs(s.wordCount - all[i - 1]!.wordCount) <= tolerance,
  );
  if (run < runLength) return null;
  return statFinding(rule, ctx, run, ctx.sentences[start]!.text, ctx.sentences[start]!.start, `${run} consecutive sentences within ${tolerance} words of each other in length; allowed run: ${runLength - 1}`);
}

/** ZS-PROSE-051: a block where NO sentence is under minWords or over maxWords lacks burstiness. */
function statBurstiness(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const minW = num(params.minWords, 8);
  const maxW = num(params.maxWords, 30);
  const window = num(params.windowWords, 500);
  if (ctx.sentences.length < 2) return null;
  if (ctx.sentences.some((s) => s.wordCount < minW || s.wordCount > maxW)) return null;
  const first = ctx.sentences[0]!;
  return statFinding(rule, ctx, ctx.sentences.length, first.text, first.start,
    `no sentence under ${minW} or over ${maxW} words in the ${window}-word block (${ctx.sentences.length} mid-range sentences); lacks human burstiness`);
}

/** ZS-PROSE-052: all units within maxRelativeDeviation (CV) of the mean length. */
function statParagraphUniformity(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const maxDev = num(params.maxRelativeDeviation, 0.15);
  const useParagraphs = ctx.stats.paragraphCount >= 2;
  const units = useParagraphs ? ctx.paragraphs : ctx.sentences;
  if (units.length < 2) return null;
  const counts = units.map((u) => u.wordCount);
  const mean = counts.reduce((a, n) => a + n, 0) / counts.length;
  if (mean <= 0) return null;
  // Population coefficient of variation (matches tokenize's convention).
  const cv = Math.sqrt(counts.reduce((a, n) => a + (n - mean) ** 2, 0) / counts.length) / mean;
  if (cv > maxDev) return null;
  const first = units[0]!;
  return statFinding(rule, ctx, units.length, first.text, first.start,
    `all ${units.length} ${useParagraphs ? "paragraphs" : "sentences"} within ${Math.round(maxDev * 100)}% of the mean length (CV ${cv.toFixed(3)}); section reads uniform`);
}

/** ZS-PROSE-053: share of units opening with a transition word exceeds threshold. */
function statTransitionDensity(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const threshold = num(params.threshold, 0.3);
  const units = ctx.stats.paragraphCount >= 2 ? ctx.paragraphs : ctx.sentences;
  if (units.length < 3) return null;
  const openers = units.map((u) => openingPhrase(u.text));
  const transitions = units.filter((_, i) => TRANSITION_OPENERS[openers[i]!] === true);
  if (transitions.length / units.length <= threshold) return null;
  const first = transitions[0]!;
  return statFinding(rule, ctx, transitions.length, first.text, first.start,
    `${Math.round((transitions.length / units.length) * 100)}% of ${units.length} units start with a transition word (threshold ${Math.round(threshold * 100)}%); structurally artificial`);
}

/** ZS-PROSE-054: run of consecutive units opening with the same word. */
function statOpeningWordRun(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const runLength = num(params.runLength, 3);
  const units = ctx.stats.paragraphCount >= 2 ? ctx.paragraphs : ctx.sentences;
  if (units.length < runLength) return null;
  let maxRun = 1;
  let maxRunStart = 0;
  let run = 1;
  let runStart = 0;
  let prev = firstWord(units[0]!.text);
  for (let i = 1; i < units.length; i++) {
    const cur = firstWord(units[i]!.text);
    if (cur !== "" && cur === prev) {
      run++;
      if (run > maxRun) {
        maxRun = run;
        maxRunStart = runStart;
      }
    } else {
      run = 1;
      runStart = i;
    }
    prev = cur;
  }
  if (maxRun < runLength) return null;
  const first = units[maxRunStart]!;
  return statFinding(rule, ctx, maxRun, first.text, first.start,
    `${maxRun} consecutive units start with "${firstWord(first.text)}"; allowed run: ${runLength - 1}`);
}

/** ZS-PROSE-055: sentence-length variance (CV) differs by <= maxVarianceDiff between halves. */
function statSegmentalEntropy(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const maxDiff = num(params.maxVarianceDiff, 0.1);
  // Needs real distributions: with < 4 sentences a half is size 1 and both CVs
  // are trivially 0, so every short text would "fail" flat pacing.
  if (ctx.sentences.length < 4) return null;
  const mid = Math.floor(ctx.sentences.length / 2);
  const cv = (counts: number[]): number => {
    if (counts.length === 0) return 0;
    const mean = counts.reduce((a, n) => a + n, 0) / counts.length;
    if (mean <= 0) return 0;
    return Math.sqrt(counts.reduce((a, n) => a + (n - mean) ** 2, 0) / counts.length) / mean;
  };
  const opening = cv(ctx.sentences.slice(0, mid).map((s) => s.wordCount));
  const closing = cv(ctx.sentences.slice(mid).map((s) => s.wordCount));
  const diff = Math.abs(opening - closing);
  if (diff > maxDiff) return null;
  const first = ctx.sentences[0]!;
  return statFinding(rule, ctx, ctx.sentences.length, first.text, first.start,
    `sentence-length variance differs by only ${(diff * 100).toFixed(1)}% between the opening and closing halves (threshold ${Math.round(maxDiff * 100)}%); pacing is flat`);
}

/** ZS-PROSE-056: more than perParagraph hedging markers in one paragraph, or per1000Words overall. */
function statHedgingDensity(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const perParagraph = num(params.perParagraph, 3);
  const per1000Words = num(params.per1000Words, 8);
  if (ctx.paragraphs.length === 0) return null;
  let total = 0;
  for (const para of ctx.paragraphs) {
    const n = countMatches(HEDGE_RE, para.text);
    total += n;
    if (n > perParagraph) {
      return statFinding(rule, ctx, total, para.text, para.start,
        `${n} hedging markers in one paragraph (allowed: ${perParagraph})`);
    }
  }
  const allowed = Math.max(1, Math.floor(ctx.stats.wordCount / 1000)) * per1000Words;
  if (total > allowed) {
    const first = ctx.paragraphs[0]!;
    return statFinding(rule, ctx, total, first.text, first.start,
      `${total} hedging markers overall (allowed: ${allowed} per 1000 words)`);
  }
  return null;
}

/** ZS-PROSE-060: run of consecutive bullet lines longer than maxConsecutiveBullets. */
function statBulletRun(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const maxBullets = num(params.maxConsecutiveBullets, 7);
  const lines = ctx.content.split("\n");
  let run = 0;
  let maxRun = 0;
  let maxRunStart = 0;
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\s*[-*+]\s+/.test(line)) {
      run++;
      if (run > maxRun) {
        maxRun = run;
        maxRunStart = offset;
      }
    } else {
      run = 0;
    }
    offset += line.length + 1;
  }
  if (maxRun <= maxBullets) return null;
  return statFinding(rule, ctx, maxRun, truncate(ctx.content.slice(maxRunStart, maxRunStart + 80)), maxRunStart,
    `${maxRun} consecutive bullet lines (allowed: ${maxBullets})`);
}

/** ZS-PROSE-070: repeated identical paragraph layout (sentence-length pattern). */
function statParagraphLayoutRun(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const runLength = num(params.runLength, 3);

  if (ctx.stats.paragraphCount >= 2) {
    const vectors = ctx.paragraphs.map((p) => p.sentenceIndexes.map((si) => ctx.sentences[si]!.wordCount));
    let maxRun = 1;
    let maxRunStart = 0;
    let run = 1;
    let runStart = 0;
    for (let i = 1; i < vectors.length; i++) {
      const prev = vectors[i - 1]!;
      const cur = vectors[i]!;
      const sameLayout = cur.length === prev.length && cur.every((v, j) => v === prev[j]);
      if (sameLayout) {
        run++;
        if (run > maxRun) {
          maxRun = run;
          maxRunStart = runStart;
        }
      } else {
        run = 1;
        runStart = i;
      }
    }
    if (maxRun >= runLength) {
      const first = ctx.paragraphs[maxRunStart]!;
      return statFinding(rule, ctx, maxRun, first.text, first.start,
        `${maxRun} consecutive paragraphs share the same sentence-length layout (allowed run: ${runLength - 1})`);
    }
    return null;
  }

  // Single paragraph: identical layout = an exact periodic sentence-length
  // pattern (3+ reps), or — when the tokenizer merges sentences (e.g. the
  // single-letter abbreviation heuristic turns "2k/s." into a non-boundary)
  // — the same sentences recurring runLength+ times.
  const lens = ctx.sentences.map((s) => s.wordCount);
  for (let period = 1; period <= Math.floor(lens.length / runLength); period++) {
    let periodic = true;
    for (let i = 0; i < lens.length; i++) {
      if (lens[i] !== lens[i % period]) {
        periodic = false;
        break;
      }
    }
    if (periodic) {
      const reps = Math.floor(lens.length / period);
      const first = ctx.sentences[0]!;
      return statFinding(rule, ctx, reps, first.text, first.start,
        `sentence-length pattern repeats ${reps} times (${period}-sentence period); identical layout`);
    }
  }
  const byText = new Map<string, { count: number; sentence: Sentence }>();
  for (const s of ctx.sentences) {
    const key = s.text.toLowerCase().trim();
    const entry = byText.get(key) ?? { count: 0, sentence: s };
    entry.count++;
    byText.set(key, entry);
  }
  let mostRepeated: { count: number; sentence: Sentence } | undefined;
  for (const entry of byText.values()) {
    if (!mostRepeated || entry.count > mostRepeated.count) mostRepeated = entry;
  }
  if (mostRepeated && mostRepeated.count >= runLength) {
    return statFinding(rule, ctx, mostRepeated.count, mostRepeated.sentence.text, mostRepeated.sentence.start,
      `${mostRepeated.count} identical sentences; mechanically repeated layout`);
  }
  return null;
}

/** ZS-CHAT-006: explanation longer than threshold sentences. */
function statSentenceCount(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const threshold = num(params.threshold, 5);
  const count = ctx.stats.sentenceCount;
  if (count <= threshold) return null;
  const first = ctx.sentences[0]!;
  return statFinding(rule, ctx, count, first.text, first.start,
    `${count} sentences (allowed: ${threshold}); explanations should be 3-5 sentences max`);
}

/** ZS-INTEGRITY-024: type-token ratio below threshold on long-enough prose. */
function statTypeTokenRatio(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const threshold = num(params.threshold, 0.4);
  const minWords = num(params.minWords, 200);
  if (ctx.stats.wordCount < minWords) return null;
  const unique = new Set(ctx.tokens.map((t) => t.word.toLowerCase()));
  const ttr = unique.size / ctx.stats.wordCount;
  if (ttr >= threshold) return null;
  const first = ctx.tokens[0]!;
  return statFinding(rule, ctx, ctx.stats.wordCount, first.word, first.start,
    `type-token ratio ${ttr.toFixed(2)} below ${threshold} over ${ctx.stats.wordCount} words (repetitive vocabulary)`);
}

/** ZS-INTEGRITY-025: high-confidence AI verdicts need >= 200 words.
 * Only fires when the text actually claims a detection verdict — plain short
 * prose is not a verdict and must not be flagged. */
function statWordCount(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const threshold = num(params.threshold, 200);
  const verdictRe = /(?:is|was|were|appears to be|seems to be)\s+AI[- ]?(?:generated|written|authored|created)|(?:this|it|the text|the passage)\s+is\s+AI\b/i;
  const m = verdictRe.exec(ctx.content);
  if (!m) return null;
  if (ctx.stats.wordCount >= threshold) return null;
  const first = ctx.tokens[0]!;
  return statFinding(rule, ctx, ctx.stats.wordCount, m[0], m.index,
    `AI verdict "${m[0]}" on only ${ctx.stats.wordCount} words — high-confidence claims need ${threshold}+`);
}

/** ZS-INTEGRITY-026: detection verdicts need >= 2 corroborating signals (false-positive guard).
 * Deterministic approximation: find a verdict claim ("...is AI-generated", "was written by AI",
 * "this is AI"), then count distinct signal categories in the same document. Fewer than
 * `threshold` signals alongside the verdict → finding. No verdict claim → no finding. */
function statCorroboratingSignals(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const threshold = num(params.threshold, 2);
  const verdictRe = /(?:is|was|were|appears to be|seems to be)\s+AI[- ]?(?:generated|written|authored|created)|(?:this|it|the text|the passage)\s+is\s+AI\b/i;
  const m = verdictRe.exec(ctx.content);
  if (!m) return null;
  // Distinct signal categories present in the document (not counting the verdict itself).
  const categories = [
    /\b(delve|tapestry|furthermore|moreover|seamlessly|elevate)\b/i,        // vocabulary
    /\b(certainly|obviously|undoubtedly|notably|interestingly)\b/i,          // confidence adverbs
    /—|–|…/,                                                                 // punctuation tics
    /(?:\d+\.\s+){2,}/,                                                       // structured lists
    /\b(however|therefore|thus|additionally)\b/i,                             // transitions
    /\b(may|might|could|potentially|probably)\b/i,                            // hedging
  ];
  const signalCount = categories.reduce((n, re) => n + (re.test(ctx.content) ? 1 : 0), 0);
  if (signalCount >= threshold) return null;
  const first = ctx.tokens[0]!;
  return statFinding(rule, ctx, signalCount, m[0], m.index,
    `AI verdict "${m[0]}" backed by only ${signalCount} signal categor${signalCount === 1 ? "y" : "ies"} (need ${threshold}+)`);
}

/** ZS-CHAT-012: more than threshold numbered/bulleted list items. */
function statListItemsPerSide(rule: Rule, ctx: ScanContext, params: Record<string, unknown>): Finding | null {
  const threshold = num(params.threshold, 4);
  const itemRe = /\b\d+(?:[.)]?)\s+[A-Za-z][A-Za-z-]*\b/g;
  const bulletRe = /^\s*[-*+]\s+/gm;
  itemRe.lastIndex = 0;
  const itemHit = itemRe.exec(ctx.content);
  bulletRe.lastIndex = 0;
  const bulletHit = bulletRe.exec(ctx.content);
  const firstItem = itemHit ?? bulletHit;
  const count = countMatches(itemRe, ctx.content) + countMatches(bulletRe, ctx.content);
  if (count <= threshold) return null;
  const index = firstItem?.index ?? 0;
  return statFinding(rule, ctx, count, truncate(firstItem?.[0] ?? ctx.content), index,
    `${count} list items (allowed: ${threshold} per side)`);
}

/* ------------------------------------------------------------------ */
/* Finding construction                                                */
/* ------------------------------------------------------------------ */

/** Build a standard finding from a rule + hit data. */
function makeFinding(
  rule: Rule,
  ctx: ScanContext,
  evidence: string,
  index: number,
  count: number,
  cap: CapResult,
): Finding {
  const pos = positionAt(ctx, index);
  const capText = cap.label ? `; cap allows ${cap.allowed} ${cap.label}` : "";
  return {
    ruleId: rule.id,
    domain: rule.domain,
    tier: rule.tier,
    title: rule.title,
    message: `Found ${count} occurrence${count === 1 ? "" : "s"}${capText}.`,
    evidence: truncate(evidence),
    file: ctx.file,
    line: pos?.line,
    column: pos?.column,
    count,
  };
}

/** Build a statistical finding; `detail` is the metric-specific message tail. */
function statFinding(
  rule: Rule,
  ctx: ScanContext,
  count: number,
  evidence: string,
  startIndex: number,
  detail: string,
): Finding {
  const pos = positionAt(ctx, startIndex);
  return {
    ruleId: rule.id,
    domain: rule.domain,
    tier: rule.tier,
    title: rule.title,
    message: detail,
    evidence: truncate(evidence),
    file: ctx.file,
    line: pos?.line,
    column: pos?.column,
    count,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** ZS-PROSE-067: exclude matches inside markdown code zones (fences/inline). */
function inCodeZone(ctx: ScanContext, index: number): boolean {
  const zones = ctx.codeZones;
  if (!zones || zones.length === 0) return false;
  return zones.some((z) => z.start <= index && index < z.end);
}

/** 1-based line/column of the token covering `index`, else nearest preceding token. */
function positionAt(ctx: ScanContext, index: number): { line: number; column: number } | undefined {
  const tokens = ctx.tokens;
  if (tokens.length === 0) return undefined;
  for (const t of tokens) {
    if (t.start <= index && index < t.end) return { line: t.line, column: t.column };
  }
  let prev: Token | undefined;
  for (const t of tokens) {
    if (t.start > index) break;
    prev = t;
  }
  const p = prev ?? tokens[0]!;
  return { line: p.line, column: p.column };
}

/** Longest run of consecutive sentences satisfying `pred`; returns start index + length. */
function longestRun(
  sentences: Sentence[],
  pred: (s: Sentence, i: number, all: Sentence[]) => boolean,
): { start: number; run: number } {
  if (sentences.length === 0) return { start: 0, run: 0 };
  let maxRun = 1;
  let maxRunStart = 0;
  let run = 1;
  let runStart = 0;
  for (let i = 1; i < sentences.length; i++) {
    if (pred(sentences[i]!, i, sentences)) {
      run++;
      if (run > maxRun) {
        maxRun = run;
        maxRunStart = runStart;
      }
    } else {
      run = 1;
      runStart = i;
    }
  }
  return { start: maxRunStart, run: maxRun };
}

/** First 1-3 words of a unit, lowercased (opening phrase). */
function openingPhrase(text: string): string {
  return text.match(/[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){0,2}/u)?.[0]?.toLowerCase() ?? "";
}

/** First word of a unit, lowercased. */
function firstWord(text: string): string {
  return text.match(/[\p{L}\p{N}]+/u)?.[0]?.toLowerCase() ?? "";
}

function countMatches(re: RegExp, text: string): number {
  let count = 0;
  for (const _ of matchAll(re, text)) count++;
  return count;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function truncate(text: string, max = MAX_EVIDENCE): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}
