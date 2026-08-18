import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  TRANSITION_MARKERS,
  HEDGE_MARKERS,
  tokenize,
  splitSentences,
  splitParagraphs,
  computeStats,
  buildContext,
} from "../src/engine/tokenize.js";

describe("tokenize", () => {
  it("tokenizes simple words with 1-based positions", () => {
    const tokens = tokenize("The quick brown fox.");
    expect(tokens.map((t) => t.word)).toEqual(["The", "quick", "brown", "fox"]);
    expect(tokens[0]).toMatchObject({ start: 0, end: 3, line: 1, column: 1 });
    expect(tokens[1]).toMatchObject({ start: 4, end: 9, line: 1, column: 5 });
    expect(tokens[3]).toMatchObject({ start: 16, end: 19, line: 1, column: 17 });
  });

  it("tracks line and column across newlines", () => {
    const tokens = tokenize("ab\ncd\nef");
    expect(tokens.map((t) => t.word)).toEqual(["ab", "cd", "ef"]);
    expect(tokens[0]).toMatchObject({ line: 1, column: 1 });
    expect(tokens[1]).toMatchObject({ line: 2, column: 1 });
    expect(tokens[2]).toMatchObject({ line: 3, column: 1 });
  });

  it("tracks columns after leading whitespace and CRLF line endings", () => {
    expect(tokenize("ab\n cd").map((t) => ({ line: t.line, column: t.column }))).toEqual([
      { line: 1, column: 1 },
      { line: 2, column: 2 },
    ]);
    expect(tokenize("ab\r\ncd").map((t) => t.line)).toEqual([1, 2]);
  });

  it("keeps unicode letters and diacritics as token content", () => {
    const tokens = tokenize("Café déjà vu — naïve.");
    expect(tokens.map((t) => t.word)).toEqual(["Café", "déjà", "vu", "naïve"]);
    expect(tokens[1]).toMatchObject({ column: 6 });
    expect(tokens[3]).toMatchObject({ column: 16 });
  });

  it("keeps apostrophes, curly quotes, hyphens and inner digits in tokens", () => {
    expect(tokenize("state-of-the-art, don't, it’s fine.").map((t) => t.word)).toEqual([
      "state-of-the-art",
      "don't",
      "it’s",
      "fine",
    ]);
    expect(tokenize("v2.0 released").map((t) => t.word)).toEqual(["v2", "released"]);
  });

  it("does not tokenize a leading digit (fixed regex contract)", () => {
    expect(tokenize("2FA").map((t) => t.word)).toEqual(["FA"]);
  });

  it("returns no tokens for empty or punctuation-only content", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("!!! --- ...")).toEqual([]);
  });
});

describe("splitSentences", () => {
  it("splits on sentence-final punctuation followed by whitespace", () => {
    const sentences = splitSentences("Hello world. Next sentence!", tokenize("Hello world. Next sentence!"));
    expect(sentences.map((s) => s.text)).toEqual(["Hello world.", "Next sentence!"]);
    expect(sentences.map((s) => s.wordCount)).toEqual([2, 2]);
  });

  it("does not split after Mr. / Dr. (abbreviation approximation)", () => {
    const sentences = splitSentences(
      "Mr. Smith went home. Dr. Jones agreed.",
      tokenize("Mr. Smith went home. Dr. Jones agreed."),
    );
    expect(sentences.map((s) => s.text)).toEqual(["Mr. Smith went home.", "Dr. Jones agreed."]);
    expect(sentences.map((s) => s.wordCount)).toEqual([4, 3]);
  });

  it("treats e.g. / i.e. single-letter initials as non-final", () => {
    const sentences = splitSentences("Use e.g. this tool.", tokenize("Use e.g. this tool."));
    expect(sentences).toHaveLength(1);
    expect(sentences[0]!.wordCount).toBe(5);
  });

  it("breaks on hard line breaks (line-oriented model)", () => {
    const sentences = splitSentences("First line\nSecond line", tokenize("First line\nSecond line"));
    expect(sentences.map((s) => s.text)).toEqual(["First line", "Second line"]);
    expect(sentences.map((s) => s.wordCount)).toEqual([2, 2]);
  });

  it("handles ellipsis spelled with ... or the … character", () => {
    expect(splitSentences("I mean... it's fine.", tokenize("I mean... it's fine.")).map((s) => s.text)).toEqual([
      "I mean...",
      "it's fine.",
    ]);
    expect(splitSentences("Wait… what?", tokenize("Wait… what?")).map((s) => s.text)).toEqual(["Wait…", "what?"]);
  });

  it("splits on question and exclamation marks", () => {
    expect(splitSentences("Really? Yes!", tokenize("Really? Yes!")).map((s) => s.text)).toEqual([
      "Really?",
      "Yes!",
    ]);
  });

  it("em dash does not end a sentence", () => {
    const sentences = splitSentences("Hello—world.", tokenize("Hello—world."));
    expect(sentences.map((s) => s.text)).toEqual(["Hello—world."]);
  });

  it("returns one sentence for a single line without punctuation", () => {
    const sentences = splitSentences("just words here", tokenize("just words here"));
    expect(sentences).toHaveLength(1);
    expect(sentences[0]).toMatchObject({ text: "just words here", wordCount: 3 });
  });

  it("groups CJK text per line (documented limitation)", () => {
    const content = "你好，世界。\n你好世界";
    const sentences = splitSentences(content, tokenize(content));
    expect(sentences.map((s) => s.text)).toEqual(["你好，世界。", "你好世界"]);
    expect(sentences.map((s) => s.wordCount)).toEqual([2, 1]);
  });

  it("returns no sentences for empty or punctuation-only content", () => {
    expect(splitSentences("", [])).toEqual([]);
    expect(splitSentences("!!!", tokenize("!!!"))).toEqual([]);
  });

  it("reports trimmed text with raw content offsets", () => {
    const sentences = splitSentences("A\n\n B.", tokenize("A\n\n B."));
    expect(sentences.map((s) => s.text)).toEqual(["A", "B."]);
    expect(sentences.map((s) => s.start)).toEqual([0, 4]);
  });
});

describe("splitParagraphs", () => {
  it("splits on blank lines and indexes sentences", () => {
    const content = "One.\n\nTwo.\n\nThree.";
    const paragraphs = splitParagraphs(content, tokenize(content));
    expect(paragraphs.map((p) => p.text)).toEqual(["One.", "Two.", "Three."]);
    expect(paragraphs.map((p) => p.sentenceIndexes)).toEqual([[0], [1], [2]]);
    expect(paragraphs.map((p) => p.wordCount)).toEqual([1, 1, 1]);
  });

  it("treats whitespace-only lines as blank", () => {
    const content = "A\n  \nB";
    const paragraphs = splitParagraphs(content, tokenize(content));
    expect(paragraphs.map((p) => p.text)).toEqual(["A", "B"]);
    expect(paragraphs.map((p) => p.sentenceIndexes)).toEqual([[0], [1]]);
  });

  it("keeps multi-line paragraphs together", () => {
    const content = "L1\nL2\n\nL3";
    const paragraphs = splitParagraphs(content, tokenize(content));
    expect(paragraphs.map((p) => p.text)).toEqual(["L1\nL2", "L3"]);
    expect(paragraphs.map((p) => p.sentenceIndexes)).toEqual([[0, 1], [2]]);
    expect(paragraphs.map((p) => p.wordCount)).toEqual([2, 1]);
  });

  it("ignores leading and trailing blank lines", () => {
    const content = "\n\nHello\n\n";
    const paragraphs = splitParagraphs(content, tokenize(content));
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toMatchObject({ text: "Hello", sentenceIndexes: [0], wordCount: 1 });
  });

  it("handles CRLF blank lines", () => {
    const content = "A\r\n\r\nB";
    const paragraphs = splitParagraphs(content, tokenize(content));
    expect(paragraphs.map((p) => p.text)).toEqual(["A", "B"]);
    expect(paragraphs.map((p) => p.sentenceIndexes)).toEqual([[0], [1]]);
  });
});

describe("computeStats", () => {
  it("fills every field on a hand-written mixed sample", () => {
    const content = "The cat sat down. The dog ran home. A truly enormous paragraph about many things at length.";
    const tokens = tokenize(content);
    const sentences = splitSentences(content, tokens);
    const paragraphs = splitParagraphs(content, tokens);
    const stats = computeStats(content, tokens, sentences, paragraphs);

    expect(stats.wordCount).toBe(17);
    expect(stats.sentenceCount).toBe(3);
    expect(stats.paragraphCount).toBe(1);
    expect(stats.sentenceLengths).toEqual([4, 4, 9]);
    expect(stats.paragraphWordCounts).toEqual([17]);
    expect(stats.maxRunOfSameLengthSentences).toBe(2); // mixed lengths still produce a run > 1
    expect(stats.sentenceLengthVariance).toBeCloseTo(Math.sqrt(50) / 17, 10);
    expect(stats.sentenceLengthVariance).toBeGreaterThan(0);
  });

  it("gives uniform sentences a full same-length run and zero variance", () => {
    const content = "One two. Three four. Five six.";
    const tokens = tokenize(content);
    const stats = computeStats(content, tokens, splitSentences(content, tokens), splitParagraphs(content, tokens));
    expect(stats.sentenceLengths).toEqual([2, 2, 2]);
    expect(stats.maxRunOfSameLengthSentences).toBe(3);
    expect(stats.sentenceLengthVariance).toBe(0);
  });

  it("returns zero variance for fewer than two sentences", () => {
    const content = "Only one sentence here.";
    const tokens = tokenize(content);
    const stats = computeStats(content, tokens, splitSentences(content, tokens), splitParagraphs(content, tokens));
    expect(stats.sentenceCount).toBe(1);
    expect(stats.sentenceLengthVariance).toBe(0);
    expect(stats.maxRunOfSameLengthSentences).toBe(1);
  });

  it("counts em dashes, exclamations and ellipses", () => {
    const content = "Hello—world! Wait… or...";
    const stats = computeStats(content, tokenize(content), [], []);
    expect(stats.emDashCount).toBe(1);
    expect(stats.exclamationCount).toBe(1);
    expect(stats.ellipsisCount).toBe(2);
  });

  it("counts transition markers from the prose rules database", () => {
    const content = "Furthermore, the fix is cheap; moreover, it is fast. In essence, that is the point.";
    const stats = computeStats(content, tokenize(content), [], []);
    expect(stats.transitionCount).toBe(3);
  });

  it("counts hedge markers from the prose rules database", () => {
    const content = "The tool helps ensure uptime and may be able to scale. Surprisingly, it can potentially regress.";
    const stats = computeStats(content, tokenize(content), [], []);
    expect(stats.hedgeCount).toBe(4);
  });

  it("does not match markers inside longer words", () => {
    const content = "nonadditionally furthermoreish arguablyx";
    const stats = computeStats(content, tokenize(content), [], []);
    expect(stats.transitionCount).toBe(0);
    expect(stats.hedgeCount).toBe(0);
  });
});

describe("buildContext", () => {
  it("defaults isMarkdown from the file extension", () => {
    expect(buildContext("x", { file: "README.md" }).isMarkdown).toBe(true);
    expect(buildContext("x", { file: "docs/index.mdx" }).isMarkdown).toBe(true);
    expect(buildContext("x", { file: "notes.txt" }).isMarkdown).toBe(false);
    expect(buildContext("x").isMarkdown).toBe(false);
    expect(buildContext("x", { file: "README.md", isMarkdown: false }).isMarkdown).toBe(false);
  });

  it("populates every scan-context field coherently", () => {
    const ctx = buildContext("First para line one.\nSecond line.\n\nNext para.\n", {
      file: "note.md",
    });
    expect(ctx.file).toBe("note.md");
    expect(ctx.content).toContain("First para");
    expect(ctx.tokens.length).toBe(ctx.stats.wordCount);
    expect(ctx.sentences.length).toBe(ctx.stats.sentenceCount);
    expect(ctx.paragraphs.length).toBe(ctx.stats.paragraphCount);
    expect(ctx.paragraphs.map((p) => p.sentenceIndexes)).toEqual([[0, 1], [2]]);
    // Every token belongs to exactly one sentence.
    const sentenceWords = ctx.sentences.reduce((acc, s) => acc + s.wordCount, 0);
    expect(sentenceWords).toBe(ctx.stats.wordCount);
  });
});

describe("marker lists are grounded in the real rules database", () => {
  it("TRANSITION_MARKERS matches ZS-PROSE-007 terms", () => {
    const rules = JSON.parse(
      readFileSync(new URL("../../../rules/prose.json", import.meta.url), "utf8"),
    ) as Array<{ id: string; matcher: { type: string; terms?: string[] } }>;
    const rule = rules.find((r) => r.id === "ZS-PROSE-007");
    expect(rule).toBeDefined();
    expect(TRANSITION_MARKERS).toEqual(rule!.matcher.terms);
  });

  it("HEDGE_MARKERS matches ZS-PROSE-043 terms", () => {
    const rules = JSON.parse(
      readFileSync(new URL("../../../rules/prose.json", import.meta.url), "utf8"),
    ) as Array<{ id: string; matcher: { type: string; terms?: string[] } }>;
    const rule = rules.find((r) => r.id === "ZS-PROSE-043");
    expect(rule).toBeDefined();
    expect(HEDGE_MARKERS).toEqual(rule!.matcher.terms);
  });
});
