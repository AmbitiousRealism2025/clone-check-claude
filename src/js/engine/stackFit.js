/**
 * Clone Check — Stack-fit matcher (F1.4 / VC-STACK-01).
 *
 * A PURE module (no DOM, no network). It takes already-fetched contents
 * (a parsed `package.json` and a list of config-file paths from the F1.2
 * contents API) plus the user's saved 3-chip stack, and emits:
 *   - which framework chips the repo uses (auto-detected), and
 *   - the MATCH DATA between those detected chips and the saved stack.
 *
 * F1.4 owns DETECTION + the match data and tests it. The actual visual
 * match-highlighting renders in M3; this module deliberately stops at the data.
 *
 * Scope discipline (HC-10): the recognized chip set is fixed to the seven the
 * contract names — Next.js / React / Supabase / Tailwind / shadcn / Stripe /
 * Prisma. This is not a general SBOM / dependency-graph tool.
 */

/** The fixed catalog of recognized chips, in stable display order. */
export const KNOWN_CHIPS = Object.freeze([
  { id: 'nextjs', label: 'Next.js' },
  { id: 'react', label: 'React' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'shadcn', label: 'shadcn/ui' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'prisma', label: 'Prisma' },
]);

const CHIP_IDS = Object.freeze(KNOWN_CHIPS.map((c) => c.id));

/**
 * Per-chip detection rules.
 *   deps   : npm package names that, if present, imply the chip.
 *   config : RegExps tested against each config-file path that imply the chip.
 */
const DETECTORS = Object.freeze({
  nextjs: { deps: ['next'], config: [/^next\.config\.(js|cjs|mjs|ts)$/i] },
  react: { deps: ['react'], config: [] },
  supabase: { deps: ['@supabase/supabase-js', 'supabase', '@supabase/auth-helpers-nextjs', '@supabase/ssr'], config: [] },
  tailwind: { deps: ['tailwindcss'], config: [/^tailwind\.config\.(js|cjs|mjs|ts)$/i] },
  shadcn: { deps: ['shadcn-ui', 'shadcn'], config: [/^components\.json$/i] },
  stripe: { deps: ['stripe', '@stripe/stripe-js', '@stripe/react-stripe-js'], config: [] },
  prisma: { deps: ['prisma', '@prisma/client'], config: [/(^|\/)prisma\/schema\.prisma$/i] },
});

/** Alias map for human-entered saved-stack labels -> canonical chip id. */
const ALIAS = Object.freeze({
  next: 'nextjs',
  nextjs: 'nextjs',
  reactjs: 'react',
  react: 'react',
  supabase: 'supabase',
  tailwind: 'tailwind',
  tailwindcss: 'tailwind',
  shadcn: 'shadcn',
  shadcnui: 'shadcn',
  stripe: 'stripe',
  prisma: 'prisma',
});

/**
 * Normalize an arbitrary chip label/id to a canonical chip id, or `null` if it
 * is not one of the recognized chips. Strips case and non-alphanumerics so
 * 'Next.js', 'next', 'tailwind CSS', 'shadcn/ui' all resolve.
 * @param {string} value
 * @returns {string|null}
 */
export function normalizeChipId(value) {
  if (typeof value !== 'string') return null;
  const key = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (ALIAS[key]) return ALIAS[key];
  return CHIP_IDS.includes(key) ? key : null;
}

/** Collect every declared dependency name across the dep buckets. */
function allDepNames(pkg) {
  if (!pkg || typeof pkg !== 'object') return new Set();
  const names = new Set();
  for (const bucket of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const b = pkg[bucket];
    if (b && typeof b === 'object') {
      for (const name of Object.keys(b)) names.add(name);
    }
  }
  return names;
}

/**
 * Detect which chips a repo uses from its package.json + config-file paths.
 * @param {object} packageJson - Parsed package.json (or null).
 * @param {string[]} configFiles - Config-file paths present in the repo.
 * @returns {{detected: string[], evidence: Object<string,'package.json'|'config'>}}
 */
export function detectStack(packageJson, configFiles) {
  const deps = allDepNames(packageJson);
  const configs = Array.isArray(configFiles) ? configFiles.filter((p) => typeof p === 'string') : [];

  const detected = [];
  const evidence = {};

  for (const id of CHIP_IDS) {
    const rule = DETECTORS[id];
    const depHit = rule.deps.some((d) => deps.has(d));
    const configHit = rule.config.some((re) => configs.some((p) => re.test(p)));
    if (depHit) {
      detected.push(id);
      evidence[id] = 'package.json';
    } else if (configHit) {
      detected.push(id);
      evidence[id] = 'config';
    }
  }

  return { detected, evidence };
}

/**
 * Detect the repo's stack AND match it against the saved 3-chip stack.
 *
 * @param {object} input
 * @param {object} [input.packageJson] - Parsed package.json.
 * @param {string[]} [input.configFiles] - Config-file paths present in the repo.
 * @param {string[]} [input.savedStack] - The user's saved chips (ids or labels).
 * @returns {{
 *   detected: string[],
 *   saved: string[],
 *   chips: Array<{id,label,detected,inStack,matched}>,
 *   matched: string[],
 *   matchCount: number,
 *   summary: string
 * }}
 */
export function detectStackFit(input) {
  const { packageJson, configFiles, savedStack } = input && typeof input === 'object' ? input : {};
  const { detected, evidence } = detectStack(packageJson, configFiles);

  const detectedSet = new Set(detected);
  const saved = Array.isArray(savedStack)
    ? savedStack.map(normalizeChipId).filter(Boolean)
    : [];
  const savedSet = new Set(saved);

  const chips = KNOWN_CHIPS.map(({ id, label }) => {
    const isDetected = detectedSet.has(id);
    const inStack = savedSet.has(id);
    return {
      id,
      label,
      detected: isDetected,
      inStack,
      matched: isDetected && inStack,
      evidence: evidence[id] || null,
    };
  });

  const matched = chips.filter((c) => c.matched).map((c) => c.id);
  const matchCount = matched.length;

  let summary;
  if (saved.length === 0) {
    summary = detected.length
      ? `Stack: detected ${detected.length} framework${detected.length === 1 ? '' : 's'} (set your stack to see fit)`
      : 'Stack: no recognized frameworks detected';
  } else if (matchCount === saved.length) {
    summary = `Stack fit: matches all ${saved.length} of your stack chips`;
  } else if (matchCount > 0) {
    summary = `Stack fit: matches ${matchCount} of your ${saved.length} stack chips`;
  } else {
    summary = 'Stack fit: none of your stack chips were detected';
  }

  return { detected, saved, chips, matched, matchCount, summary };
}

export default detectStackFit;
