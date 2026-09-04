# Support / More Tab Regroup — Findings & Proposal

**Status:** Proposal, UX-approved by KK on the interactive prototype (see below). Not yet built. No GitHub Issue/Story filed yet — file one before starting implementation, per `CLAUDE.md` → Issue & Backlog Hygiene.

**Origin:** UX discovery session, 2026-09-04. KK asked for inspiration from Citi's mobile "More" screen (three labeled card-groups: Account management / Documents & Communications / Support, each a white rounded card of chevron rows) and asked how to simplify Dugout Lineup's own Support/More tab the same way.

**Prototype:** An interactive HTML comparison ("More Tab Reshuffle") was built and iterated live with KK — both the Current and Recommended states are fully clickable phone mockups (real category-pill switching, real accordion, real push/pop navigation into Help). It is a private Claude Artifact, not part of this repo; treat this doc as the source of truth since the artifact may not be reachable by a future session. The one piece of direct feedback already incorporated below: **Feedback moved from the "Get Help" group into "About & Legal"** — do not re-litigate that placement without a reason.

---

## 1. Problem, in one line

`MORE_SUBTABS` renders 7 peer-level pill tabs — `Account · Help · Feedback · Links · About · Updates · Legal` — on one horizontal scroll strip. Labels already clip at 375px ("Feedback" → "Feedb…", "Updates" → "Updat…"), and Help's own category-pill row stacks a *second* horizontal scroller directly beneath the first. Nothing on the landing view signals which destinations are related.

## 2. Current-state findings (verified against code, 2026-09-04)

All of the following was confirmed by direct file inspection — treat it as ground truth for the "before" state, not paraphrase.

- **`frontend/src/App.jsx:7484-7492`** — `MORE_SUBTABS` array, the 7 flat sub-tabs, rendered as a horizontal pill/button bar using the same `subTabStyle` as Game Day's sub-tabs.
- **`frontend/src/App.jsx:7592-7609`** — pill bar rendering.
- **`frontend/src/App.jsx:7666-7672`** — dispatch block mapping `moreTab` to each destination:
  - `"account"` → `renderAccount()`, inline function at **App.jsx:7164-7256**
  - `"feedback"` → `renderFeedback()`, inline function at **App.jsx:6514**
  - `"links"` → `<LinksTab>` (`frontend/src/components/Support/LinksTab.jsx`, 40 lines)
  - `"about"` → `renderAbout()` (there is also an `AboutTab.jsx` in `components/Support/`, 309 lines — confirm which is actually wired before touching this destination)
  - `"updates"` → `<UpdatesTab versionHistory={VERSION_HISTORY} appVersion={APP_VERSION} .../>` (`frontend/src/components/Support/UpdatesTab.jsx`, 45 lines)
  - `"legal"` → `<LegalSection initialDocId={legalInitialDoc} />` (`frontend/src/components/Support/LegalSection.jsx`, 168 lines)
  - `"faq"` → `<FAQSection />` (`frontend/src/components/Support/FAQSection.jsx`, 278 lines) — **this is the "Help" tab**; component name kept as `FAQSection` for import stability, per its own header comment (lines 24-27).
- **`frontend/src/App.jsx:30-38`** — imports: `ValidationBanner`, `OfflineIndicator` from `./components/Shared/`; `LegalSection`, `FAQSection` from `./components/Support/`.
- **Important correction:** `ValidationBanner` and `OfflineIndicator` are **not** part of the Support/More IA at all — `ValidationBanner` renders inline in the Defense/Lineups grid on the Game Day tab (`App.jsx:4627`), `OfflineIndicator` renders in the always-present header chrome (`App.jsx` ~7910). Neither should move as part of this work.
- **`legalInitialDoc`** is a one-shot deep-link: Account's "Terms of Service" row calls `setLegalInitialDoc("terms")` and jumps straight into Legal (`App.jsx:7237`), bypassing Legal's own list view. Preserve this deep-link when rebuilding Account.

### FAQSection.jsx (Help tab), 278 lines — structure to preserve untouched

1. "Help" eyebrow header (line 159).
2. Plain `<input type="search">` (lines 175-184) — not the `SearchField` primitive.
3. Not searching: **Game-Day Help** (lines 200-218, flat list of `article.gameDayCritical === true` articles, red eyebrow) then **Browse Help** (lines 220-262, horizontal `Pill` category chips from `HELP_CATEGORY_META`, articles for the active category below as accordion rows).
4. Searching: flat cross-category results, `matchesQuery` checks title+answer+keywords, each row shows its category label.
5. `renderRow` (line 114) — `ListRow` + `Stack` title + rotating `›` chevron; `openArticleId` accordion state, one open at a time.
6. Analytics: `help_search` (debounced 400ms, never sends raw query text), `help_article_open`, `help_category_view`.
7. Footer (line 266-273): "Still have questions? Use the Feedback tab to ask." — **this line's own destination changes if Feedback moves under About & Legal; update the copy/pointer if the tab label changes, otherwise leave as-is since Feedback is still reachable, just relocated.**

### `frontend/src/content/faqs.js`, 311 lines — `HELP_CATEGORY_META`

| id | label | emoji | articles |
|---|---|---|---|
| `getting-started` | Getting Started | 🚀 | 4 |
| `roster` | Players & Roster | 👥 | 5 |
| `lineups` | Lineups | ⚾ | 5 |
| `game-day` | Game Day | 🏟 | 6 (5 flagged `gameDayCritical: true`) |
| `sharing-scoring` | Sharing & Scoring | 📲 | 6 |
| `account-troubleshooting` | Account & Troubleshooting | 🔧 | 5 |

31 articles total. This structure does not change as part of this proposal.

### `renderAccount()` — App.jsx:7164-7256

Contents: editable name (`<AccountNameField>`), "Signed in as" email row, "Your teams" per-team membership cards (role pill, chevron, tap → `loadTeam()`), a "Legal" mini-section with a single "Terms of Service" deep-link row, and "Sign out" (`S.btn("danger")` — legacy inline style helper, **not** a UI primitive). Footer note about local persistence.

**This is the one section still on legacy inline styles instead of `Card`/`Stack`/`Text`/`ListRow`.** FAQSection, LegalSection, LinksTab, and UpdatesTab are already primitive-based. Migrating Account is in-scope for this work, not a separate follow-up — otherwise the new grouped landing will visually clash against its own Account group.

### UI primitives available (`frontend/src/components/ui/`) — reuse, do not invent new ones

- **`Card.jsx`** — `variant` (`default|subtle`), `padding` (`sm|md|lg`), `radius` (`sm|md|lg`), `shadow` (bool), `border` (bool).
- **`Text.jsx`** — `as`, `variant` (`display|pageTitle|sectionTitle|cardTitle|body|label|caption|button`), `size`, `weight`, `color`, `family`, `uppercase`.
- **`Stack.jsx`** — `direction` (`col|row`), `gap` (`xs|sm|md|lg`), `align`/`justify`, `wrap`. No padding/margin props by design — padding comes from `Card`.
- **`ListRow.jsx`** — always a `<button>`, 44px min-height (WCAG), `onClick`/`disabled`/`showDivider`. **This is the chevron-row primitive to use for every group row.**
- **`Pill.jsx`** — category chips, `active` prop.
- **`BottomSheet.jsx`** — not obviously needed for this work, noted for completeness.

### Design tokens — `frontend/src/theme/tokens.js` (single source, barrel at `theme/index.js`)

`color` (brand/surface/text/status/border/overlay/…), `opacity`, `space` (4px-base: `xs(4) sm(8) md(12) lg(16) xl(20) xl2(24)…`), `radius` (`xs(4) sm(6) md(8) lg(12) pill(9999) circle(50%)`), `borderWidth`, `font` (family/size/weight/role), `zIndex`, `shadow` (`subtle, subtleCard, card, elevated, overlay, sheetTop`), `motion`.

---

## 3. Recommended IA

Replace the flat `MORE_SUBTABS` pill bar with a single scrollable landing view holding **3 labeled `Card` groups**, each a stack of `ListRow` chevron rows. Tapping a row pushes the existing destination component — **none of FAQSection, LegalSection, LinksTab, UpdatesTab, or Feedback change internally.** This was proven in the interactive prototype: the "Help" detail view inside the Recommended mockup is the literal same search/category/accordion markup as the Current mockup's Help tab.

| Group | Rows | Existing source, unchanged |
|---|---|---|
| **Account** | Your teams, Profile name, Sign out | `renderAccount()` content — migrate styling only |
| **Get Help** | Help — Search & FAQs (1 row) | `FAQSection.jsx` |
| **About & Legal** | About, What's New, Terms & Privacy, Links, **Feedback** | `AboutTab`/`renderAbout()`, `UpdatesTab.jsx`, `LegalSection.jsx`, `LinksTab.jsx`, `renderFeedback()` |

Navigation pattern: landing view (3 group cards) → tap a row → push detail view with a back-chevron header (`‹ More`) → back returns to landing. One consistent push/pop pattern replaces 7 flat tab switches.

**Feedback placement — already decided, do not re-open without new input:** originally grouped under "Get Help" alongside Help; KK's explicit correction moved it to "About & Legal", leaving "Get Help" a single-row group. If a future agent finds Get Help visually thin next to two 3-5 row groups, the two known alternatives (not yet chosen) are: (a) fold Get Help entirely into About & Legal (2 groups total), or (b) leave as-is — KK was shown this exact tradeoff and did not ask for a change. Default to leaving as-is unless re-raised.

### Phase 2+ idea shown in the prototype, explicitly not MVP scope

A highlighted "Game-Day Help" quick-access strip above the 3 groups (gold left-border row, Citi-quick-action style), surfacing the 5 `gameDayCritical` articles before any tap. Shown in the prototype tagged "Phase 2" specifically so it wouldn't be read as committed. Do not build this in the same pass as the MVP regroup unless explicitly asked.

---

## 4. Execution notes for whoever builds this

- **`frontend/src/App.jsx` is a locked file** per `CLAUDE.md` → Locked Files. Gate phrase required before editing: *"all clear — App.jsx editing approved"*. Get this from KK explicitly before touching `MORE_SUBTABS`, the dispatch block, or `renderAccount()`.
- Standard repo workflow applies: cut a `feature/<topic>` branch from `develop` (not from this `claude/support-tab-design-n8y8lg` branch, which was a UX-discovery scratch branch, not a feature branch in the repo's own branch taxonomy), get a Story + GitHub Issue filed per Issue & Backlog Hygiene, build behind the normal test-first discipline, and follow the local-only-until-confirmed rule ("NEVER commit or push to main without explicit confirmation from KK" / gate phrase `"confirmed — push to main"`).
- New landing-view component belongs in `frontend/src/components/Support/` alongside its siblings (e.g. `MoreLanding.jsx`), composed from `Card` + `ListRow` + `Stack` + `Text` — no new primitives needed.
- Preserve the `legalInitialDoc` deep-link behavior (Account → Terms row → Legal detail, bypassing Legal's list).
- `renderAccount()` needs a real migration off `S.btn("danger")` and raw inline styles onto primitives as part of this work, not deferred.
- Existing test files to extend rather than duplicate: `FAQSection.test.jsx`, and whatever currently covers `renderAccount()`/Account tab (check `frontend/src/__tests__/` before assuming none exists). A new landing-view component needs its own golden-path test (renders 3 groups, tap navigates to detail, back returns to landing) — follow this repo's existing pattern of app-level integration tests for App.jsx-composed views (see `AppHomeMembershipTeams.test.jsx` for a comparable precedent).
- This is IA/navigation-only — do not touch `content/faqs.js`, `FAQSection.jsx`'s internal rendering, `LegalSection.jsx`, `LinksTab.jsx`, or `UpdatesTab.jsx` beyond what's needed to mount them inside the new push/pop shell.

## 5. Open items before implementation starts

1. File a Story in `docs/product/ROADMAP.md` + matching GitHub Issue (Issue & Backlog Hygiene rule — no story ships without one).
2. Confirm with KK which of `renderAbout()` (inline, App.jsx) vs `AboutTab.jsx` (component file) is actually the live "About" destination — the discovery pass flagged this as unconfirmed.
3. Decide whether the Phase 2 Game-Day quick-strip rides along or ships as a separate follow-up release.
