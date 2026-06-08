// Static regression spec for Story 83 — silent feedback loss (#186).
//
// submitFeedback() and submitBug() in App.jsx (~lines 2821, 2849) call the
// bare identifier `supabase`. If `supabase` is NOT among the named bindings
// imported from the supabase module (~lines 4-7), those calls throw a
// ReferenceError — which is swallowed by the surrounding try/catch, so coach
// feedback and bug reports are silently lost with no error surfaced.
//
// This is a STATIC spec: it reads App.jsx via fs and asserts the import
// contract, because App.jsx is a ~5,000-line monolith that cannot be unit-
// tested in isolation today. Behavioral coverage (actually invoking
// submitFeedback/submitBug and asserting the Supabase write) arrives when
// Phase 4 decomposition extracts the feedback module out of App.jsx.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_JSX = path.resolve(__dirname, "../App.jsx");
const source = readFileSync(APP_JSX, "utf8");

// Pure detector: given JS source and a module specifier, return the list of
// named bindings imported from the first matching `import { ... } from '<spec>'`.
// Matching is by basename (last path segment, ignoring a trailing `.js`), so a
// query of "supabase" matches './supabase', './supabase.js', or '../db/supabase'
// — without falsely matching e.g. './supabaseHelpers'. `x as y` aliases resolve
// to the imported name (the part before `as`). Returns [] when no import from a
// matching module is present. Kept pure (no fs) so a synthetic source string can
// drive it and prove the detector can return red — see the negative test below.
function basename(spec) {
  return spec.replace(/\.js$/, "").split("/").pop();
}

function importedBindingsFrom(src, moduleSpecifier) {
  const wanted = basename(moduleSpecifier);
  // [^}]* spans a multi-line import body (no nested braces in a named import).
  const importRe = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(src)) !== null) {
    if (basename(m[2]) === wanted) {
      return m[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        // handle `x as y` aliases — the imported name is before `as`
        .map((s) => s.split(/\s+as\s+/)[0].trim());
    }
  }
  return [];
}

describe("App.jsx supabase import contract (Story 83 / #186)", () => {
  it("precondition: App.jsx contains bare `supabase.` member usage outside the import", () => {
    // Strip the supabase import statement(s) so the './supabase.js' specifier
    // itself doesn't count as a usage.
    const withoutSupabaseImports = source.replace(
      /import\s*\{[^}]*\}\s*from\s*['"][^'"]*\bsupabase(?:\.js)?['"];?/g,
      ""
    );
    // Lowercase `supabase.` not preceded by a word char or dot — excludes
    // identifiers like `isSupabaseEnabled` and member chains like `foo.supabase`.
    const bareUsages = withoutSupabaseImports.match(/(?<![\w.])supabase\.\w/g) || [];
    expect(
      bareUsages.length,
      "expected at least one bare `supabase.` member usage in App.jsx"
    ).toBeGreaterThan(0);
  });

  it("named import from the supabase module includes the `supabase` binding", () => {
    const bindings = importedBindingsFrom(source, "supabase");
    expect(
      bindings.length,
      "no named import from a supabase module found in App.jsx"
    ).toBeGreaterThan(0);

    expect(
      bindings,
      "import from the supabase module is missing the 'supabase' binding — " +
        "submitFeedback()/submitBug() will throw a ReferenceError swallowed by try/catch"
    ).toContain("supabase");
  });

  it("detector returns red: a supabase import omitting the `supabase` binding is not matched", () => {
    // Synthetic source whose supabase import deliberately omits `supabase` —
    // exactly the Story 83 regression shape. Proves the detector can fail (the
    // assertion above is not vacuous): if App.jsx ever loses the binding, the
    // test above goes red the same way this one does.
    const broken = "import { isSupabaseEnabled, dbSaveTeams } from './supabase';";
    const bindings = importedBindingsFrom(broken, "supabase");
    expect(bindings).toEqual(["isSupabaseEnabled", "dbSaveTeams"]);
    expect(bindings).not.toContain("supabase");
  });
});
