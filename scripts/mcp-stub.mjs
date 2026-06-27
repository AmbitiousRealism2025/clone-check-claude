/**
 * F1.5 — STUB MCP `clone_check` target (M1).
 *
 * The real MCP server is built in M2/F2.3 (VC-MCP-01/02). For M1 black-box
 * testability we only need a programmatically-invocable `clone_check(repo)` that
 * returns the SAME structured verdict the web/engine path returns — so the
 * harness can prove the MCP-path invocation exists and is wired to the pure
 * core. This stub delegates to `verdictCore.computeVerdict`, the identical
 * assembly the web/engine path uses; F2.3 will swap this stub for the real MCP
 * transport while keeping the same core, preserving parity by construction.
 */
import { computeVerdict } from './verdictCore.mjs';
import { FIXED_NOW } from './fixtures.mjs';

/**
 * Programmatic stand-in for the MCP `clone_check(repo)` tool.
 * @param {object} repoFixture - Raw input repo (see scripts/fixtures.mjs).
 * @param {object} [opts]
 * @param {number} [opts.now=FIXED_NOW] - Pinned reference time.
 * @returns {{tool:'clone_check', repo:string, verdict:object, stub:true}}
 */
export function cloneCheck(repoFixture, { now = FIXED_NOW } = {}) {
  const repoName =
    (repoFixture && repoFixture.repo && (repoFixture.repo.full_name || repoFixture.repo.name)) ||
    'unknown';
  return {
    tool: 'clone_check',
    repo: repoName,
    verdict: computeVerdict(repoFixture, now),
    // Flagged as a stub so no caller mistakes this for the M2 transport.
    stub: true,
  };
}

export default cloneCheck;
