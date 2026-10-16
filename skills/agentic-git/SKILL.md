---
name: agentic-git
description: "Use when an agent changes a repository: before the first edit in a checkout it may share with another session, when picking a branch or worktree, when writing a commit message or opening a pull request, when a landed commit turns out to be wrong, and when cleaning up merged branches or finished worktrees."
---

Isolate before the first edit, and leave history readable to the next agent.

## Goal

One unit of work owns one branch and one directory. Every commit carries one logical change and an imperative message, and each branch or worktree left behind has a stated fate. The reader is a future agent running `git log`, `git bisect`, or a revert.

## Constraints

- Read state before every mutating step: branch, `git status --porcelain`, and whether a rebase, merge, or cherry-pick is mid-flight. Test that with `git rev-parse --git-path rebase-merge`, `MERGE_HEAD`, `CHERRY_PICK_HEAD`, never a direct `.git/` probe, which reports clean inside a linked worktree (`reference/jakubkrehel-skills:skills/interface-review/scope-resolution.md`).
- History-rewriting and remote-destructive commands (`push --force`, `reset --hard`, `branch -D`, remote branch delete) wait for an explicit request (`reference/wshobson-agents:AGENTS.md`); the approval policy is `agentic-secure`.
- Message format is machine-checked by `rules/commit.json`, whose ids the sections below cite. Worktree placement, squash ancestry, and cleanup have no rule coverage, so they rest on the cited corpus.

## Isolate the unit of work

Give each unit its own branch, and concurrent units their own worktrees (`reference/agent-skills:skills/git-workflow-and-versioning/SKILL.md`). Test whether isolation already exists: `--git-dir` and `--git-common-dir` resolving differently means a linked worktree or a submodule (`reference/superpowers:skills/using-git-worktrees/SKILL.md`). Prefer the environment's own workspace facility; `git worktree add` is the fallback, and a fallback worktree inside the repository belongs in an ignored directory (`git check-ignore`) or its contents join the next commit. Failure mode: two worktrees on one branch, where the second commit is rejected as a non-fast-forward an hour later.

## Check the tree before the first edit

A checkout is shared state: an uncommitted edit, an unfinished rebase, or a conflicted merge may already live there, so refuse to write into a destination holding uncommitted changes (`reference/superpowers:scripts/sync-to-codex-plugin.sh`). Mid-merge, `git diff` still succeeds and returns something that is not the change, so staging and review look fine and are wrong (`reference/jakubkrehel-skills:skills/interface-review/scope-resolution.md`). Confirm the branch identity too (`git branch --show-current`).

## Write the message

Type from the enum, lower-case: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test (`rules/commit.json#ZS-COMMIT-001`, `#ZS-COMMIT-002`). The subject is required (`#ZS-COMMIT-003`), lower-case (`#ZS-COMMIT-004`), imperative rather than gerund (`#ZS-COMMIT-022`), specific enough that `wip` cannot replace it (`#ZS-COMMIT-021`), and the header stays under 100 characters (`#ZS-COMMIT-005`). Trailers record no provenance: a model `Co-Authored-By` or a `Generated with` line is flagged (`#ZS-COMMIT-034`), and the same reasoning retires agent, tool, or session attribution in any other spelling (`reference/vibecheck:src/rules/code-quality.ts`).

## Keep one logical change per commit

A commit bundling a rename sweep with a behavior change cannot be reviewed, reverted, or cherry-picked as a unit (`rules/commit.json#ZS-COMMIT-020`, `#ZS-COMMIT-025`). Refactors ship separately from the behavior they enable; roughly 100 lines stays reviewable, and 1000 added lines trips the size warning (`#ZS-COMMIT-023`, `reference/agent-skills:skills/git-workflow-and-versioning/SKILL.md`). Failure mode: a bisect landing on a commit that does five things, or a revert that drags an unrelated formatting pass with it.

## Revert rather than stack a fix

When a commit that already left the machine is wrong, `git revert` it and push the revert, which is the documented rollback path (`reference/agent-skills:skills/shipping-and-launch/SKILL.md`). A follow-up commit layered on top leaves the bad state in history and makes every later bisect read two changes instead of one. Keep each increment independently revertable, so a later step never has to delete and replace something at once (`reference/agent-skills:skills/incremental-implementation/SKILL.md`). `reset --hard` discards uncommitted work with no reflog recovery, so it belongs to local commits that were never pushed (`reference/wshobson-agents:plugins/developer-essentials/skills/git-advanced-workflows/SKILL.md`).

## Integrate and clean up under squash merge

Squash merging is the common default: branch commits collapse into one commit on the integration branch, so each commit still needs a conventional message even though only the PR title survives (`rules/commit.json#ZS-COMMIT-008`; `reference/claude-code-best-practice:tips/claude-boris-2-tips-25-mar-26.md`, `reference/wshobson-agents:CONTRIBUTING.md`). Shared branches take no force-push (`reference/agent-skills:skills/ci-cd-and-automation/SKILL.md`), while rewriting a branch only you pushed uses `--force-with-lease` after a fetch, never a bare `--force` (`reference/wshobson-agents:plugins/developer-essentials/skills/git-advanced-workflows/SKILL.md`). After a squash merge the branch tip is not an ancestor of the integration branch, so the deletion guard reports it unmerged and needs a deliberate `-D` (`reference/wshobson-agents:plugins/framework-migration/commands/deps-upgrade.md`), and a branch named for work already merged, cut from the pre-squash tip, reintroduces reverted content. Keep the worktree while its PR is under review, then remove it from outside the directory: a refused removal means files exist only there, so show them and ask (`reference/superpowers:skills/finishing-a-development-branch/SKILL.md`), and finish with `git worktree prune`.

## Not for

- Judging whether a diff should merge, or how to answer review: `agentic-review`.
- Proving the change works, or explaining why it fails: `agentic-verify`, `agentic-debug`.
- Secret scanning before a public push, and destructive-command approval: `agentic-secure`.
- Splitting work across agents: `agentic-delegate`.
- Release tags, version bumps, and deploy steps: outside this family.

## Definition of done

- `git status --porcelain` is empty on the branch you meant to change, and no other session's checkout was rewritten.
- `git log --format=%B` shows one imperative conventional subject per logical change and no attribution trailer.
- The integration branch carries the work; each source branch and worktree is removed or retained with a stated reason.
- `git worktree list` shows only worktrees still in use.
