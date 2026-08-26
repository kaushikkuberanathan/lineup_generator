// frontend/src/theme/tokens.js
//
// Semantic design tokens for Dugout Lineup.
// Values sourced from a recon audit of App.jsx and frontend/src/components/
// on 2026-04-30. Full provenance in docs/product/DESIGN_AUDIT.md.
//
// RULES:
//   - Tokens are named by ROLE, not appearance. Never add a token
//     named after a color (e.g. "navyBlue"). Name it for what it does.
//   - All values are strings or numbers — no computed expressions.
//   - The opacity group is a reference scale. color.overlay holds
//     pre-mixed rgba values for direct use in React inline styles.
//
// Nothing imports from this file yet. Consumers arrive in v2.5.0 (primitives).

export const tokens = {

  // ─── COLOR ──────────────────────────────────────────────────────────────────

  color: {

    brand: {
      navy: '#0F1F3D',  // 63x — dominant header/nav/card bg
      gold: '#F5C842',  // 59x — primary accent, badges, CTAs
      red:  '#C8102E',  // 19x — brand red, jersey-style (intentionally ≠ status.error)

      // ─── Story 110 (#296) — legacy C-object DIVERGENT/ORPHAN resolution ────
      navyLight: '#1a3260',  // 5x App.jsx — header/nav gradient partner for brand.navy (was C.navyLight; ORPHAN, no prior token — differs from surface.chrome #1E3A5F, not a substitute)
      redDark:   '#9b0c22',  // 3x App.jsx — primary-CTA gradient partner for brand.red (was C.redDark; ORPHAN, no prior token)

      // Story 119 (#530) — 1x App.jsx (line ~7856), third stop of the app-shell
      // root background gradient shown on the "more" tab (`linear-gradient(160deg,
      // brand.navy 0%, brand.navyLight 55%, gradientDark 100%)`). No existing
      // token matched; named by role (dark gradient endpoint), not appearance,
      // same principle as Story 113's cream mint. Approved 2026-08-05.
      gradientDark: '#2a0a0a',
    },

    surface: {
      page:        '#F8FAFC',  // slate-50, 9x — app page bg (#F9FAFB 10x → drift, collapsed here)
      card:        '#FFFFFF',  // resolves #FFF (121x) + #FFFFFF (21x) → canonical 6-char
      dark:        '#0B1524',  // 12x — Game Mode header gradient, deepest navy surface
      tableHeader: '#F5EFE4',  // 13x — table thead row band (Defense/Batting/Scoring grids)
      chrome:      '#1E3A5F',  // 5x — mid-tone navy band; game-day strips (NowBattingStrip, BattingOrderStrip) + Toast notification bg

      // Story 113 (#496) — 5x App.jsx (was C.cream), the literal app-wide page
      // background (S.app.background + App's own root <div>). Never audited by
      // Story 109's disposition table — surface.page (#F8FAFC, cool slate) is not
      // close (visible cool-vs-warm cast shift on a full-page background);
      // surface.tableHeader (#F5EFE4) is value-close but wrong-domain (table
      // header band, not page background) — noted for design input, not a
      // substitute. Mint preserves the current value exactly.
      cream: '#fdf6ec',
    },

    text: {
      primary:   '#0F1F3D',  // alias of brand.navy — primary text on light surfaces
      body:      '#374151',  // gray-700 — body copy on light surfaces (Story 60; FAQ answer body, EmptyState title)
      muted:     '#6b7280',  // gray-500 — ParentView muted labels/captions (Story 82)
      secondary: '#64748B',  // 46x — slate-500, muted body text
      tertiary:  '#94A3B8',  // 58x — slate-400, placeholder/caption
      onDark:    '#FFFFFF',  // all #FFF on dark surfaces
      disabled:  '#9CA3AF',  // 13x — gray-400, disabled states

      // Story 110 (#296) — 20x App.jsx (was C.text), DIVERGENT from text.primary (near-black
      // vs navy — App.jsx root `color:` prop, i.e. the whole app's inherited default text
      // color). Highest blast-radius key in the #296 batch.
      // !! When this eventually migrates at the App.jsx call sites (a separate, later Story —
      // #296 itself makes no App.jsx edits), do NOT assume "provably no-op" like the other 7
      // resolutions in this batch. Run a full visual smoke pass across every screen before
      // merging that migration — 20 call sites through CSS inheritance is exactly the shape
      // of change a snapshot diff can miss.
      ink: '#1a1a2e',
    },

    status: {
      success: '#27AE60',  // 40x — primary success green
      warning: '#D4A017',  // 26x — dark amber, warning states (intentionally ≠ brand.gold)
      error:   '#DC2626',  // 32x — Tailwind red-600, alert/error UI (intentionally ≠ brand.red)
      errorBg: '#FEE2E2',  // 6x — red-50, error chip/alert backgrounds
      info:    '#2563EB',  // 22x — Tailwind blue-600, informational UI

      // ─── Story 110 (#296) — legacy C-object DIVERGENT/ORPHAN resolution ────
      neutral: '#7f8c8d',  // 1x App.jsx — game-canceled status badge (was C.canceled; ORPHAN — text.tertiary #94A3B8 is a cooler, lighter slate, not a substitute)
      ready:   '#2e7d32',  // 1x App.jsx — team-readiness "Ready" status badge (was C.greenField; DIVERGENT from field.grass #2d7a3a — near-identical hex but NOT field/SVG-domain; the real call site is a Home-screen status badge, not the diamond SVG, so field.grass would be a role-mismatch despite the close value; status.success #27AE60 is a distinct, brighter green, also not a substitute)

      // ─── Status surface tints (Story 88 — ValidationBanner family) ─────────
      successBg:        '#d1fae5',               // 1x ValidationBanner.jsx — green-100 card background
      warningBg:        '#fef3c7',               // 1x ValidationBanner.jsx — amber-100 card background
      successBorder:    'rgba(16,185,129,0.3)',  // 1x ValidationBanner.jsx — emerald-500 0.3 card border
      warningBorder:    'rgba(217,119,6,0.3)',   // 1x ValidationBanner.jsx — amber-600 0.3 card border
      errorBorder:      'rgba(220,38,38,0.3)',   // Auth screens (Story 131/#690) — status.error (#DC2626) 0.3, mirrors successBorder's pattern; no existing token expressed an error-banner border role

      successText:      '#065f46',               // 1x ValidationBanner.jsx — emerald-800 success heading text
      warningText:      '#92400e',               // 1x ValidationBanner.jsx — amber-800 warning heading text
      warningTextLight: '#78350f',               // 1x ValidationBanner.jsx — amber-900 warning list item text
    },

    border: {
      subtle:  'rgba(15,31,61,0.08)',  // 23x — faint navy tint, card dividers on light surfaces
      default: '#E2E8F0',              // 14x — slate-200, standard dividers/outlines
      strong:  '#94A3B8',              // selective — visible borders, input outlines, focus rings

      // Story 110 (#296) — legacy C-object DIVERGENT resolution
      neutral: 'rgba(0,0,0,0.06)',  // 15x App.jsx — generic 1px divider/border (was C.border; DIVERGENT from border.subtle — black vs navy tint, plus differing opacity 0.06 vs 0.08)
    },

    // Pre-mixed rgba tints — directly usable in React inline styles without a helper.
    // The opacity reference scale below documents the normalized set; these are empirical values.
    // navyWash uses 0.04 which is not in the opacity reference scale (0.04 → drift);
    // the name reflects visual weight, not alignment to opacity.subtle (which is 0.06).
    overlay: {
      navyWash:   'rgba(15,31,61,0.04)',    // 22x — barely-there navy wash
      navyFaint:  'rgba(15,31,61,0.08)',    // 23x — card hover tints, subtle fills
      navyMedium: 'rgba(15,31,61,0.15)',    // 24x — mid-weight overlays, border tints
      navyStrong: 'rgba(15,31,61,0.45)',    // 6x LockFlow.jsx (Story 111 / #297; was local `var textMuted`) — muted caption text on light surfaces, distinct from text.muted (gray-500, solid). rgba format keeps this in the overlay family per theme.tokens.test.js's hex-only contract on color.text; preserves LockFlow's original appearance exactly.
      whiteFaint: 'rgba(255,255,255,0.08)', // 32x — lighten elements on dark surfaces
      whiteLight: 'rgba(255,255,255,0.15)', // 16x — on-dark borders, highlights
      whiteMedium:'rgba(255,255,255,0.25)', // 1x MaintenanceScreen.jsx — dim version chip text on dark navy (Story 94)
      whiteHeavy: 'rgba(255,255,255,0.6)',  // 1x MaintenanceScreen.jsx — secondary body text on dark navy (Story 94)
      goldTint:   'rgba(245,200,66,0.12)',  // 9x — gold-tinted section backgrounds
      goldStrong: 'rgba(245,200,66,0.40)',  // 9x — gold wash for selected/active states
      backdrop:   'rgba(5,10,25,0.97)',     // — modal/bottom-sheet near-opaque scrim

      // ─── Story 110 (#296) — legacy C-object DIVERGENT resolution ───────────
      neutralWash: 'rgba(0,0,0,0.04)',  // 2x App.jsx — generic subtle divider wash (was C.subtleBorder; DIVERGENT from overlay.navyWash — same 0.04 opacity, black vs navy hue)
      scrimLight:  'rgba(0,0,0,0.5)',   // 3x App.jsx — lighter full-screen modal backdrop (was C.overlayBg; DIVERGENT from overlay.backdrop — 0.5 vs 0.97 opacity, would double backdrop darkness if adopted)

      // ─── Brand/status alpha tints (Story 89 — OfflineIndicator family) ─────
      redFaint:   'rgba(200,16,46,0.15)',    // 1x OfflineIndicator.jsx — brand.red 0.15 (No Connection bg)
      redStrong:  'rgba(200,16,46,0.35)',    // 1x OfflineIndicator.jsx — brand.red 0.35 (No Connection border)
      warnFaint:  'rgba(212,160,23,0.15)',   // 1x OfflineIndicator.jsx — status.warning 0.15 (Offline Mode bg)
      warnStrong: 'rgba(212,160,23,0.35)',   // 1x OfflineIndicator.jsx — status.warning 0.35 (Offline Mode border)
      winFaint:   'rgba(39,174,96,0.12)',    // 1x OfflineIndicator.jsx — status.success 0.12 (Offline Ready bg)
      winMid:     'rgba(39,174,96,0.30)',    // 1x OfflineIndicator.jsx — status.success 0.30 (Offline Ready border)

      // ─── Bench-row wash (Story 82 — ParentView Bench inning rows) ──────────
      benchWash:  'rgba(85,85,85,0.06)',  // 1x ParentView.jsx — Bench assignment row bg; pairs with navyWash (position.Bench = #555555)

      // ─── Error-status alpha tints (Story 93 — DefenseDiamond OUT row family) ─
      errorFaintest: 'rgba(220,38,38,0.04)',  // OUT row striping — App.jsx + DefenseDiamond
      errorFaint:    'rgba(220,38,38,0.05)',  // OUT row alternate stripe
      errorSubtle:   'rgba(220,38,38,0.08)',  // OUT row hover/highlight
      errorMid:      'rgba(220,38,38,0.12)',  // 1x App.jsx — scoring-surface OUT chip bg (Story 102)
      errorMedium:   'rgba(220,38,38,0.30)',  // OUT row border / emphasis
    },

    // ─── Position fills (Story 93 — DefenseDiamond + App.jsx renderFieldSVG + ParentView) ─
    // 11 light fills for field positions. Keys use position abbreviations (bracket
    // notation required for '1B'/'2B'/'3B'). header sub-group holds the darker
    // top-band variants used in DefenseDiamond and renderFieldSVG slot headers.
    position: {
      P:     '#e05c2a',
      C:     '#7f3f3f',
      '1B':  '#2471a3',
      '2B':  '#2980b9',
      '3B':  '#6c3483',
      SS:    '#8e44ad',
      LF:    '#1e8449',
      LC:    '#2980b9',
      RC:    '#8e44ad',
      RF:    '#239b56',
      Bench: '#555555',
      header: {
        P:     '#7a1a10', C:     '#14406e',
        '1B':  '#7a1a10', '2B':  '#8a4a0a',
        '3B':  '#7a1a10', SS:    '#8a4a0a',
        LF:    '#1a6e3a', LC:    '#1a5580',
        RC:    '#5c2878', RF:    '#1a6e3a',
        Bench: '#2a2a2a',
      },
    },

    // ─── Field SVG palette (Story 93 — DefenseDiamond + App.jsx renderFieldSVG) ─
    // 7 colors for the field diamond SVG. Named by role, not appearance.
    field: {
      grass:      '#2d7a3a',  // SVG base rectangle fill
      grassLight: '#3a9147',  // foul-line zone arc fill
      dirt:       '#b5845a',  // infield ellipse
      dirtLight:  '#c49a6c',  // base path / inner diamond polygon
      mound:      '#c9a070',  // pitcher's mound circle
      moundLight: '#e8d5b0',  // chalk on base path
      chalk:      '#ffffff',  // foul-line stroke (white at varying opacity)
    },

    // ─── Shared UI primitives (components/ui/*) — no reusable role elsewhere,
    // scoped to the primitive itself rather than gameDay (Toast/BottomSheet/
    // Badge are used app-wide, not exclusive to game-mode/ScoringMode).
    toast: {
      border:           'rgba(96,165,250,0.4)',  // blue-400 0.4 — action-row border, no existing match
      actionBackground: '#1d4ed8',               // blue-700 primary action button — component-scoped
                                                    // per the established no-cross-component-alias rule;
                                                    // this exact value has independently recurred as a
                                                    // component-scoped mint in 6 files now (5 in
                                                    // ScoringMode/*, this the 6th) — flagged, same as
                                                    // gameDay's own #1d4ed8/#374151 notes, as a strong
                                                    // signal for a future shared-token consolidation
                                                    // story, deliberately not done here.
    },
    bottomSheet: {
      backdrop: 'rgba(0,0,0,0.55)',  // full-screen scrim — no existing match (overlay.scrimLight is
                                       // 0.5, overlay.backdrop is 0.97; sits between the two)
    },
    badge: {
      // Light-context variants only — dark-context already uses
      // overlay.whiteLight/text.onDark (Badge.jsx, pre-existing).
      handL: { background: '#dbeafe', text: '#1d4ed8' },  // blue-100 / blue-700
      handR: { background: '#f3f4f6', text: '#4b5563' },  // gray-100 / gray-600
    },

    // ─── Game-day surface palette (Story 133/#698 — game-mode/ + ScoringMode/) ──
    // Separate scale from color.text.* / color.surface.*, which were audited
    // against LIGHT surfaces only (see their own "on light surfaces" doc
    // comments). Every file under game-mode/ and ScoringMode/ is a dark
    // surface with no light variant, so this is its own first-class family
    // rather than aliasing text.secondary/text.tertiary/border.default by
    // hex-match alone - reusing a light-surface-calibrated token on a dark
    // surface just because the hex happens to match is a role mismatch, the
    // same class of problem Story 110's DIVERGENT entries exist to prevent.
    // Shared umbrella for BOTH game-mode/* and ScoringMode/* (one visual
    // language across both Locked directories, per #698) - not per-track.
    gameDay: {
      surface: {
        shell:      '#0B1524',  // full-screen game-day shell across game-mode + ScoringMode
        scoreboard: '#0A1628',  // ScoreboardRow.jsx root bg - distinct near-black,
                                  // drift from surface.dark (#0B1524), not a duplicate
      },
      text: {
        primary:   '#FFFFFF',  // highest emphasis - score numbers
        label:     '#E2E8F0',  // high-emphasis uppercase labels - team names
        secondary: '#94A3B8',  // mid-emphasis - bench chip names, icon-button colors, inning label
                                 // (7.07:1 vs surface.scoreboard - passes WCAG AA)
        muted:     '#64748B',  // subdued supporting text shared across both game-day tracks
                                 // (3.81:1 vs surface.scoreboard - FAILS WCAG AA, pre-existing,
                                 // not in scope for #704 - caption below is the coach-facing-copy
                                 // token that issue targeted)
        caption:   '#8496AC',  // low-emphasis section eyebrow - "Bench"
                                 // FIXED (#704): was #475569 (2.39:1, failed WCAG AA). Picked a
                                 // slate lighter than muted but dimmer than secondary to keep the
                                 // emphasis tier distinct (5.99:1 vs surface.scoreboard - passes
                                 // WCAG AA normal-text minimum of 4.5:1).
        faint:     '#334155',  // near-invisible - empty-state placeholder dash only
        separator: '#374151',  // decorative glyph - ScoreboardRow's ":" only
      },

      // ─── Story 133 slice 5 (#698) — GameModeScreen.jsx ─────────────────
      // #22c55e (Tailwind green-500) recurs 3x in GameModeScreen.jsx as a
      // "done/saved" success signal, distinct in value from the global
      // color.status.success (#27AE60) - kept as its own gameDay-scoped
      // token rather than aliased, same reasoning as text/surface above:
      // this scale is audited against dark game-day surfaces only.
      status: {
        success: '#22c55e',  // saved-flash text, defense/batting-done checkmark color
      },

      // Shared translucent chrome border/divider, common to pills, dividers,
      // and badge outlines on the dark game-day surface. Not diamond-SVG
      // specific (that's diamond.stroke.*), and not a single-component
      // concern (that's gameModeScreen.* below) - genuinely reused 3x
      // within GameModeScreen.jsx alone (half-inning pill border, the
      // divider between its two halves, ON DEFENSE badge border), and
      // likely to recur in InningModal.jsx (slice 6) given the shared
      // visual language.
      border: {
        hairline: 'rgba(255,255,255,0.12)',
      },
      diamond: {
        position: {
          battery: '#C0392B', infield: '#2980B9', outfield: '#27AE60', fallback: '#555555',
        },
        surface: {
          gradient: 'radial-gradient(circle at center, #1F3D2B 0%, #0F1F3D 60%, #0A1428 100%)',
        },
        stroke: {
          fence: 'rgba(255,255,255,0.12)', basepath: 'rgba(255,255,255,0.13)',
          mound: 'rgba(255,255,255,0.10)', homePlate: 'rgba(255,255,255,0.15)',
          foulLine: 'rgba(255,255,255,0.07)', highlight: 'rgba(255,255,255,0.22)',
          empty: 'rgba(255,255,255,0.18)',
        },
        fill: {
          basepath: 'rgba(255,255,255,0.025)', empty: 'rgba(255,255,255,0.02)',
        },
        text: {
          primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.85)',
          tertiary: 'rgba(255,255,255,0.55)', empty: 'rgba(255,255,255,0.28)',
        },
      },

      // ─── QuickSwap.jsx (Story 133 slice 4, #698) ───────────────────────
      // Role-based, not appearance-based — these three coincide byte-for-byte
      // with existing text/diamond tokens (gameDay.text.caption/faint,
      // diamond.position.fallback) but serve a different role here (position-
      // accent swatch, not text or diamond-SVG fill) and are kept separate on
      // purpose per the handoff's no-silent-alias rule, even where bytes match.
      quickSwap: {
        position: {
          bench:      '#475569',  // POS_COLORS.Bench swatch (badge border/text)
          fallback:   '#555555',  // POS_COLORS[position] miss — defensive default
          unassigned: '#334155',  // POS_COLORS[""] swatch — unassigned position
        },
        backdrop:                 'rgba(0,0,0,0.6)',     // full-screen scrim behind the sheet
        positionBadgeBackground:  'rgba(255,255,255,0.06)', // position badge bg when a position is assigned
        rowDivider:               'rgba(255,255,255,0.05)', // player-row bottom border
        currentRowBackground:     'rgba(245,200,66,0.10)',  // highlight for the row of the currently-occupying player
      },

      // ─── GameModeScreen.jsx (Story 133 slice 5, #698) ──────────────────
      // Component-scoped, one-off values with no reusable role elsewhere in
      // the gameDay family - same precedent as quickSwap above (mint rather
      // than alias, even where a value happens to byte-match another
      // component's token, because the ROLE is this component's own).
      gameModeScreen: {
        orientationHint: {
          background: '#d97706',            // amber-600 - rotate-device toast bg; no existing
                                               // token matches (distinct from status.warning #D4A017)
          border:     'rgba(255,255,255,0.25)', // toast border - byte-matches overlay.whiteMedium,
                                               // kept separate: that token's documented role is dim
                                               // version-chip TEXT on MaintenanceScreen, not a border
          shadow:     'rgba(0,0,0,0.55)',    // toast drop shadow - no existing match
        },
        exitButton: {
          border: 'rgba(200,16,46,0.6)',  // brand.red 0.6 - no existing overlay tier at this opacity
                                            // (overlay.redFaint=0.15, redStrong=0.35)
          text:   '#fca5a5',               // red-300 - light-red label text on the red-tinted exit button
        },
        resetButton: {
          border: 'rgba(255,255,255,0.3)', // reset-icon-button border - no existing match
        },
        advanceButton: {
          mutedBackground:  'rgba(255,255,255,0.06)', // "End ⏹" bg once both halves are done on the
                                                        // final inning - subdued/terminal state
          pendingBackground: 'rgba(245,200,66,0.18)',  // gold-tinted bg while a half is still open -
                                                        // between overlay.goldTint (0.12) and
                                                        // goldStrong (0.40), no exact match
          pendingBorder:      'rgba(245,200,66,0.3)',  // matching border for the pending state above
        },
        resumeBanner: {
          // Background byte-matches quickSwap.currentRowBackground
          // (both rgba(245,200,66,0.10)) - kept as its own key rather than
          // referencing quickSwap's namespace from an unrelated component;
          // role is the same abstract "subtle gold highlight" tint but the
          // two components have no structural relationship.
          background: 'rgba(245,200,66,0.10)',
          border:     'rgba(245,200,66,0.25)', // no existing exact match
        },
        onDefenseBadge: {
          // rgb(11,21,36) is byte-identical to gameDay.surface.shell
          // (#0B1524) at 0.75 alpha - kept as a dedicated token since the
          // rgba form (translucent badge overlay) is a distinct usage from
          // the opaque shell background it's layered on top of.
          background: 'rgba(11,21,36,0.75)',
        },
        outTonightChip: {
          background: 'rgba(0,0,0,0.25)',  // player-name chip bg on the red "Out Tonight" strip
        },
        battingFooter: {
          activeBorder: 'rgba(245,200,66,0.5)', // top border highlighting the footer while on BATTING half
        },
      },

      // ─── InningModal.jsx (Story 133 slice 6, #698) ─────────────────────
      // Component-scoped, one-off values with no reusable role elsewhere in
      // the gameDay family - same precedent as gameModeScreen/quickSwap
      // above (mint rather than alias, even where a value happens to
      // byte-match another component's token, because the ROLE is this
      // component's own).
      inningModal: {
        // POS_COLORS local lookup table. 9 of its 11 entries are exact
        // byte matches to the shared color.position.* palette and reuse it
        // directly (P/C/1B/2B/3B/SS/LF/RC/RF - see component call site).
        // These 3 do NOT match and are preserved byte-exact here instead:
        posColors: {
          // POS_COLORS.LC previously diverged from color.position.LC
          // (#27ae60 green vs #2980B9 blue, the blue used by 2B/LC
          // elsewhere in the app) - flagged in #794 and confirmed by KK as
          // a genuine inconsistency, not intentional. Corrected to the
          // canonical value; byte-matches color.position.LC exactly, kept
          // as its own key per the no-cross-component-alias rule used
          // throughout this file (self-reference isn't possible here -
          // `tokens` doesn't exist yet during its own literal's construction).
          lc: '#2980b9',
          // POS_COLORS.Bench = #475569 here, vs. color.position.Bench =
          // #555555 (also a pre-existing divergence) - but this entry is
          // confirmed UNREACHABLE at runtime: fieldPlayers already filters
          // out pos === "Bench" (see component, nextAssignments.filter)
          // before POS_COLORS is ever indexed by "Bench". Byte-value
          // happens to match gameDay.quickSwap.position.bench exactly, but
          // kept as its own key per the no-cross-component-alias rule
          // (same reasoning as gameModeScreen.resumeBanner above) - and
          // because aliasing a live QuickSwap token to a dead InningModal
          // code path would be a misleading dependency either way.
          benchUnused: '#475569',
          // POS_COLORS[pos] lookup-miss defensive default. Source literal
          // was "#555" (3-digit shorthand) - normalized to 6-digit here,
          // same computed color, not a visual change. Byte-matches
          // color.position.Bench and gameDay.quickSwap.position.fallback,
          // kept separate for the same cross-component reason as above.
          fallback: '#555555',
        },
        header: {
          gradientStart: '#0f1a2e',      // header gradient top stop; gradient end stop is
                                           // gameDay.surface.shell (#0B1524) reused directly
          eyebrowTextA11y: '#cbd5e1',    // slate-300 - a11y-mode high-contrast eyebrow label
                                           // (ACCESSIBILITY_V1 flag on); no existing match
        },
        emphasisText: '#f1f5f9',  // slate-100 - highest-emphasis text distinct from
                                    // gameDay.text.primary (#FFFFFF); modal title + lead-off
                                    // batter name, 2 call sites sharing one role
        defenseAccent: '#4ade80', // green-400 - defense-half accent color (positions-card
                                    // eyebrow + "Take the Field" button bg), 2 call sites
        battingCard: {
          border:              'rgba(245,200,66,0.25)',
          background:          'rgba(245,200,66,0.05)',
          headerBorder:        'rgba(245,200,66,0.15)',
          handBadgeBackground: 'rgba(245,200,66,0.2)',  // batting-hand (L/R) badge bg
          // headerBackground reuses overlay.goldTint directly (exact byte match,
          // rgba(245,200,66,0.12)) - generic cross-app alpha tint, not a
          // light-surface-calibrated token, safe to reuse per precedent.
        },
        defenseCard: {
          border:          'rgba(74,222,128,0.25)',
          background:      'rgba(74,222,128,0.04)',
          headerBackground:'rgba(74,222,128,0.10)',
          headerBorder:    'rgba(74,222,128,0.15)',
        },
        divider:       'rgba(255,255,255,0.06)', // shared section-divider border-top, 2 call sites
        rowBackground: 'rgba(255,255,255,0.04)', // shared subtle-wash row/chip bg, 2 call sites
        benchChip: {
          background: 'rgba(255,255,255,0.05)',  // bench-player chip bg (border reuses overlay.whiteFaint)
        },
        exitButton: {
          // "Exit Game Mode" button bg (end-of-game state). Byte-matches
          // gameDay.text.faint and gameDay.quickSwap.position.unassigned,
          // but neither role fits (this is a solid button background, not
          // text or a position swatch) - minted separately per the
          // no-silent-alias-by-value-only rule.
          background: '#334155',
        },
      },

      // ─── GameModeGearMenu.jsx (Story 133 slice 8, #698) ────────────────
      // First real ScoringMode/* migration slice (slice 7 was a verified
      // no-op). Component-scoped, one-off values with no reusable role
      // elsewhere in the gameDay family - same precedent as
      // gameModeScreen/inningModal above.
      gearMenu: {
        handoffModal: {
          // Full-screen backdrop behind the "Hand off scoring?" confirm
          // dialog. No existing token at this opacity - sits between
          // overlay.scrimLight (0.5, reused below for the menu's own
          // backdrop) and overlay.backdrop (0.97); this dialog wants a
          // darker scrim than the menu panel's backdrop since it can
          // render standalone with confirmHandoff true and isOpen false.
          backdrop: 'rgba(0,0,0,0.8)',
          // Cancel button bg. Byte-matches gameModeScreen.advanceButton.
          // mutedBackground and inningModal.divider (both rgba(255,255,
          // 255,0.06)), but kept separate per the no-cross-component-alias
          // rule - same reasoning as inningModal.exitButton.background.
          cancelBackground: 'rgba(255,255,255,0.06)',
          // "Hand off" confirm button bg - blue-700. No existing token
          // matches (distinct from status.info #2563EB, a different blue).
          confirmBackground: '#1d4ed8',
        },
        menuPanel: {
          // Gear-menu dropdown panel bg. No existing token matches
          // (distinct from brand.navy #0F1F3D and gameDay.surface.shell
          // #0B1524, both darker/more saturated).
          background: '#1a2a3a',
        },
        // "Finish Game…" menu item text - red-300. Byte-matches
        // gameDay.gameModeScreen.exitButton.text (#fca5a5) exactly, but
        // kept separate per the no-cross-component-alias rule even where
        // bytes match - same role (light-red label on a red-adjacent
        // affordance) but a different component's own concern.
        finishGameText: '#fca5a5',
      },

      // ─── RunnerConflictModal.jsx (Story 133 slice 9, #698) ─────────────
      // Component-scoped, one-off values with no reusable role elsewhere in
      // the gameDay family - same precedent as gameModeScreen/inningModal/
      // gearMenu above (mint rather than alias, even where a value happens
      // to byte-match another component's token, because the ROLE is this
      // component's own).
      runnerConflictModal: {
        // Full-screen root backdrop. No existing match - sits between
        // overlay.scrimLight (rgba(0,0,0,0.5)) and overlay.backdrop
        // (rgba(5,10,25,0.97), also a different hue).
        backdrop: 'rgba(0,0,0,0.82)',
        // Panel border + Cancel-button border - same value, 2 sites within
        // this file. Byte-matches diamond.stroke.empty
        // (rgba(255,255,255,0.18)) exactly, but that token's role is a
        // diamond-SVG stroke, not a modal/button border - kept separate
        // per the no-silent-alias rule.
        border: 'rgba(255,255,255,0.18)',
        scoreButton: {
          // "Score {name}" button - green-600 tint bg + solid border. No
          // existing match (distinct from status.success #27AE60 and its
          // 0.12-tier siblings, all different hues/values).
          background: 'rgba(22,163,74,0.12)',
          border:     '#16a34a',
          // Green-300 subtitle text under the Score button. No existing match.
          subtitleText: '#86efac',
        },
        holdButton: {
          // "Hold {name}" button - blue-700 tint bg + solid border. Border
          // byte-matches gearMenu.handoffModal.confirmBackground (#1d4ed8)
          // exactly, but that token's role is a different component's
          // confirm-button *background*, not this button's *border* - kept
          // separate per the no-cross-component-alias rule (same reasoning
          // as gearMenu.finishGameText above).
          background: 'rgba(29,78,216,0.12)',
          border:     '#1d4ed8',
          // Blue-300 subtitle text under the Hold button. No existing match.
          subtitleText: '#93c5fd',
        },
        cancelButton: {
          // "Cancel play" button bg. Byte-matches inningModal.rowBackground
          // exactly (both rgba(255,255,255,0.04)), but kept separate per
          // the no-cross-component-alias rule already applied in slices
          // 5/6/8.
          background: 'rgba(255,255,255,0.04)',
        },
      },

      // ─── RestoreScoreModal.jsx (Story 133 slice 10, #698) ──────────────
      // Component-scoped, one-off values with no reusable role elsewhere in
      // the gameDay family - same precedent as gameModeScreen/inningModal/
      // gearMenu/runnerConflictModal above (mint rather than alias, even
      // where a value happens to byte-match another component's token,
      // because the ROLE is this component's own).
      restoreScoreModal: {
        // Full-screen root backdrop. No existing match - sits between
        // overlay.scrimLight (rgba(0,0,0,0.5)) and gearMenu.handoffModal.
        // backdrop/runnerConflictModal.backdrop (0.8/0.82, also pure
        // black); this file's own value, 0.72, is a genuine third tier.
        backdrop: 'rgba(0,0,0,0.72)',
        warningBox: {
          // "This rebuilds the current score..." advisory box - gold tint
          // bg + border. background (0.08) sits between inningModal.
          // battingCard.background (0.05) and overlay.goldTint (0.12), no
          // exact match. border (0.2) byte-matches inningModal.battingCard.
          // handBadgeBackground exactly, but that token's role is a
          // batting-hand badge BACKGROUND in a different component, not
          // this box's border - kept separate per the no-cross-component-
          // alias rule.
          background: 'rgba(245,200,66,0.08)',
          border:     'rgba(245,200,66,0.2)',
        },
        // "Checking scorebook..." loading label + disabled Restore-button
        // text - shared within this file (2 call sites, same abstract
        // "inactive/neutral state" text role). Byte-matches gameDay.text.
        // separator (#374151), but that token's documented role is a single
        // decorative ":" glyph in ScoreboardRow, not a genuine text role -
        // kept separate. Also byte-matches the light-surface color.text.body
        // (gray-700), which the gameDay family never aliases to per its own
        // top-of-block comment.
        disabledText: '#374151',
        successBox: {
          // "Score restored successfully" confirmation box - green tint.
          // background (0.15) and border (0.35) don't match any existing
          // green tier (closest is runnerConflictModal.scoreButton.
          // background at 0.12, a different value). text byte-matches
          // runnerConflictModal.scoreButton.subtitleText (#86efac) exactly,
          // but that's a different component's button-subtitle role - kept
          // separate per the no-cross-component-alias rule.
          background: 'rgba(22,163,74,0.15)',
          border:     'rgba(22,163,74,0.35)',
          text:       '#86efac',
        },
        errorBox: {
          // Restore-failure message text - red-300. Byte-matches
          // gameModeScreen.exitButton.text AND gearMenu.finishGameText
          // (both #fca5a5) - third recurrence of this exact value across
          // three unrelated components; kept separate per the established
          // no-cross-component-alias precedent (same reasoning both prior
          // slices used for this same literal). Box background/border reuse
          // overlay.errorMid/errorMedium directly (see table below) - those
          // are pre-mixed generic alpha tints already reused across
          // multiple surfaces (App.jsx, DefenseDiamond, scoring-surface),
          // not light-surface-calibrated solid colors, so direct reuse is
          // safe per the same reasoning slice 6/8 applied to overlay.
          // goldTint/scrimLight.
          text: '#fca5a5',
        },
        restoreButton: {
          // Primary CTA, 3-state background via ternary: disabled / tap-to-
          // confirm / default-armed. disabledBackground (0.06) byte-matches
          // gameModeScreen.advanceButton.mutedBackground, inningModal.
          // divider, and gearMenu.handoffModal.cancelBackground - a
          // recurring 0.06 white-wash value across 4 components now, each
          // minted separately per the no-cross-component-alias rule.
          // confirmBackground (#7f1d1d, red-900, the "tap again to confirm"
          // state) has no existing match anywhere. Default-armed state
          // reuses color.status.error (#DC2626) directly - same semantic
          // "destructive action" reuse precedent slice 5 established for
          // the Out Tonight strip. border (0.6) has no existing match
          // (gameModeScreen.exitButton.border is a different rgb triple,
          // 200,16,46 vs 220,38,38 here).
          disabledBackground: 'rgba(255,255,255,0.06)',
          confirmBackground:  '#7f1d1d',
          border:              'rgba(220,38,38,0.6)',
        },
        cancelButton: {
          // "Cancel" button border - no existing 0.1-opacity white tier
          // (neighbors are overlay.whiteFaint at 0.08 and overlay.
          // whiteLight at 0.15); a genuine gap-fill value, not a rounding
          // of either.
          border: 'rgba(255,255,255,0.1)',
        },
      },

      // ─── FinishGameModal.jsx (Story 133 slice 11, #698) ────────────────
      // Component-scoped, one-off values with no reusable role elsewhere in
      // the gameDay family - same precedent as gameModeScreen/inningModal/
      // gearMenu/runnerConflictModal/restoreScoreModal above (mint rather
      // than alias, even where a value happens to byte-match another
      // component's token, because the ROLE is this component's own). The
      // error-alert box (background #fee2e2 / text #dc2626) reuses
      // color.status.errorBg/color.status.error directly instead of
      // minting - see component call site; first reuse of errorBg
      // specifically in a gameDay context (status.error itself was already
      // reused twice, by restoreScoreModal and gameModeScreen, and errorBg
      // pairs with it identically to LoginScreen.jsx/RequestAccessScreen.jsx's
      // existing color:errorBg/backgroundColor:errorBg usage - same alert-
      // box role, not a light-surface-only concern like text/border/surface).
      finishGameModal: {
        // Full-screen root backdrop. Byte-matches runnerConflictModal.
        // backdrop exactly (both rgba(0,0,0,0.82)) - kept as its own key
        // per the no-cross-component-alias rule already applied to every
        // prior instance of a byte-match-but-different-component value.
        backdrop: 'rgba(0,0,0,0.82)',
        scorePreview: {
          // Score-comparison box wrapping the two team-short/score-number
          // pairs. background byte-matches 4 existing 0.06 white-wash
          // tokens across other components (gameModeScreen.advanceButton.
          // mutedBackground, inningModal.divider, gearMenu.handoffModal.
          // cancelBackground, restoreScoreModal.restoreButton.
          // disabledBackground) - fifth recurrence, kept separate per the
          // same rule. border byte-matches restoreScoreModal.cancelButton.
          // border exactly (both 0.1) - same rule.
          background: 'rgba(255,255,255,0.06)',
          border: 'rgba(255,255,255,0.1)',
          // The em-dash divider glyph between the two score numbers.
          // Byte-matches gameDay.text.separator (#374151) exactly, but
          // that token's documented role is explicitly scoped to
          // ScoreboardRow's ":" glyph only - kept separate, same reasoning
          // restoreScoreModal.disabledText already applied to this exact
          // literal in slice 10.
          divider: '#374151',
        },
        cancelButton: {
          // "Not yet" button bg - byte-matches the same 0.06 white-wash
          // family as scorePreview.background above; kept as its own key
          // since it's a different element/role within this same file
          // (button bg vs. box bg), same within-file discipline slice 6
          // applied distinguishing battingCard vs. defenseCard chrome.
          background: 'rgba(255,255,255,0.06)',
        },
        confirmButton: {
          // "Yes, finish game" / "Saving..." primary CTA. Default-armed
          // state reuses color.status.error (#DC2626) directly (see
          // component call site) - same destructive/terminal-action reuse
          // precedent slice 5 established for the Out Tonight strip and
          // slice 10 for restoreScoreModal's Restore button. loading
          // (dimmed, in-flight) state is a distinct red-900-adjacent tone
          // from restoreScoreModal.restoreButton.confirmBackground
          // (#7f1d1d) - different value, no existing match. spinnerTrack
          // (0.4 white) has no existing match (overlay.whiteMedium=0.25,
          // whiteHeavy=0.6 are the nearest tiers, neither equal).
          loadingBackground: '#6b1a1a',
          spinnerTrack: 'rgba(255,255,255,0.4)',
        },
      },

      // ─── ScoringModeEntry.jsx (Story 133 slice 12, #698) ───────────────
      // Component-scoped, one-off values with no reusable role elsewhere in
      // the gameDay family - same precedent as gameModeScreen/inningModal/
      // gearMenu/runnerConflictModal/restoreScoreModal/finishGameModal
      // above (mint rather than alias, even where a value happens to
      // byte-match another component's token, because the ROLE is this
      // component's own). overlay.goldTint and overlay.goldStrong ARE
      // reused directly (see component call site) - both are generic
      // pre-mixed cross-app alpha tints, not light-surface-calibrated
      // solids, same reasoning slices 6/8/9 already established; goldStrong
      // in particular is documented as "gold wash for selected/active
      // states", an exact role match for this file's selected-next-game row.
      scoringModeEntry: {
        betaBadge: {
          background: '#7c3aed',  // violet-600 - "BETA" pill bg; no existing match anywhere
        },
        closeButton: {
          border: 'rgba(255,255,255,0.2)',  // no existing 0.2-opacity white tier
                                              // (overlay.whiteFaint=0.08, whiteLight=0.15,
                                              // whiteMedium=0.25 are the nearest, neither exact)
        },
        // Shared within this file, 2 sites (game-card border, Practice Mode
        // card border). No existing 0.10-opacity white tier anywhere in
        // tokens.js (overlay.whiteFaint=0.08 is the nearest, not exact) -
        // a genuine gap-fill value, not a rounding of either neighbor.
        cardBorder: 'rgba(255,255,255,0.10)',
        todayGameCard: {
          // "Today's Game" advisory card - gold tint bg + border.
          // background byte-matches restoreScoreModal.warningBox.background
          // exactly (both rgba(245,200,66,0.08)); border byte-matches
          // inningModal.battingCard.border AND gameModeScreen.resumeBanner.
          // border exactly (both rgba(245,200,66,0.25)) - third and second
          // recurrence respectively of these values across unrelated
          // components. Kept separate per the established
          // no-cross-component-alias rule.
          background: 'rgba(245,200,66,0.08)',
          border: 'rgba(245,200,66,0.25)',
        },
        // Shared within this file, 3 sites ("We bat:" label, both
        // half-inning-toggle buttons' inactive text). No existing token at
        // this exact gray (#888 sits between gameDay.text.muted #64748B
        // and gameDay.text.secondary #94A3B8, matching neither) - a
        // distinct, lighter-weight muted tone specific to this toggle.
        mutedText: '#888',
        // Shared within this file, 2 sites ("No upcoming games scheduled"
        // text, disabled "Join as Viewer" link text). Byte-matches
        // restoreScoreModal.disabledText and finishGameModal.scorePreview.
        // divider exactly (both #374151) - third recurrence of this value
        // across unrelated components; kept separate per the established
        // no-cross-component-alias rule, same reasoning both prior slices
        // used for this same literal.
        disabledText: '#374151',
        halfToggle: {
          // "Top"/"Bottom" half-inning selector, active state bg - shared
          // 2 sites. No existing match (distinct from brand.navy #0F1F3D
          // and gameDay.surface.shell #0B1524, both darker/more saturated -
          // same "distinct lighter navy" pattern gearMenu.menuPanel.
          // background established in slice 8). Inactive state reuses
          // overlay.whiteFaint directly (see table above).
          activeBackground: '#1B2A4A',
        },
        // Shared within this file, 2 sites (non-selected next-game row bg,
        // Practice Mode card bg) - same "generic subtle-wash row/card
        // background" role inningModal.rowBackground already established
        // for its own file, byte-matches it exactly (both
        // rgba(255,255,255,0.04)) but kept separate per the
        // no-cross-component-alias rule, same reasoning runnerConflictModal.
        // cancelButton.background used for this identical literal in
        // slice 9.
        subtleRowBackground: 'rgba(255,255,255,0.04)',
        claimButton: {
          // "Claim Scorer" primary CTA. background (#1d4ed8, blue-700)
          // byte-matches gearMenu.handoffModal.confirmBackground exactly,
          // but that's a different component's confirm-button background -
          // kept separate per the no-cross-component-alias rule, same
          // reasoning runnerConflictModal.holdButton.border used for this
          // identical literal in slice 9. disabledBackground
          // (rgba(255,255,255,0.06)) is the sixth recurrence of this
          // white-wash value across components (gameModeScreen.
          // advanceButton.mutedBackground, inningModal.divider, gearMenu.
          // handoffModal.cancelBackground, restoreScoreModal.restoreButton.
          // disabledBackground, finishGameModal.scorePreview.background/
          // cancelButton.background) - minted separately per the same
          // established rule. shadow (rgba(29,78,216,0.35)) has no
          // existing match anywhere - a button glow, distinct role from
          // the flat background above despite sharing the same base hue.
          background: '#1d4ed8',
          disabledBackground: 'rgba(255,255,255,0.06)',
          shadow: 'rgba(29,78,216,0.35)',
        },
        viewerLink: {
          color: '#60a5fa',  // blue-400 - "Join as Viewer →" link text (enabled state);
                               // no existing match (distinct from status.info #2563EB,
                               // a darker, more saturated blue serving a different role)
        },
      },

      // ─── LiveScoringPanel.jsx sub-components (Story 133 slice 13a, #698) ─
      // Sub-slice A of 3 (this file is sub-sliced per the handoff doc rather
      // than one giant diff - see docs/product/STORY133_SANDBOX_PROGRESS.md).
      // This slice covers ONLY the OUTCOME_ROWS/OUTCOME_ROWS_V2 constants and
      // the CountPips/DiamondSVG/HomeAwayChip sub-components (source lines
      // 1-200, above the "─── Main ───" marker). Parts B/C migrate the Main
      // component body separately. Component-scoped, one-off values with no
      // reusable role elsewhere in the gameDay family - same precedent as
      // gearMenu/runnerConflictModal/restoreScoreModal/finishGameModal/
      // scoringModeEntry above (mint rather than alias, even where a value
      // happens to byte-match another component's token, because the ROLE is
      // this component's own) - EXCEPT for genuinely generic/umbrella
      // gameDay-family tokens (status.error, brand.gold, gameDay.text.
      // secondary, overlay.whiteFaint, overlay.goldTint), which ARE reused
      // directly here per the precedent already established for those
      // specific tokens across every prior slice (see call sites / table
      // in the checkpoint doc).
      liveScoringPanel: {
        // Shared pitch/outcome accent palette - PITCH_CHIPS, PITCH_BUTTONS,
        // OUTCOME_ROWS, and OUTCOME_ROWS_V2 all draw from the same 6-color
        // semantic set. Red (out/strike) reuses color.status.error directly
        // and gold (home run) reuses color.brand.gold directly (see call
        // sites) - both established generic-reuse precedents. The remaining
        // 4 have no existing match and are minted here, named by ROLE not
        // appearance per this file's top-of-file rule.
        accent: {
          // green-600 - "ball in play" positive signal. Shared 2 roles
          // within this file: PITCH_CHIPS/PITCH_BUTTONS "Contact" pitch AND
          // OUTCOME_ROWS/_V2 Single/Double/Triple hit outcomes - same
          // abstract "good outcome" semantic, not a cross-component alias.
          // Byte-matches runnerConflictModal.scoreButton.border (#16a34a)
          // exactly, but that's a different component's button-border role -
          // kept separate per the established no-cross-component-alias rule.
          hit: '#16a34a',
          // amber-600 - "imperfect/not clean" signal. Shared 2 roles within
          // this file: PITCH_CHIPS/PITCH_BUTTONS "Foul" pitch AND
          // OUTCOME_ROWS/_V2 "Error (reached)" outcome. Byte-matches
          // gameDay.gameModeScreen.orientationHint.background exactly, but
          // that's a different component's toast-background role - kept
          // separate per the established rule.
          caution: '#d97706',
          // violet-600 - Walk/HBP outcome rows only (both OUTCOME_ROWS and
          // OUTCOME_ROWS_V2). Byte-matches gameDay.scoringModeEntry.
          // betaBadge.background exactly, but that's a different component's
          // pill-background role - kept separate per the established rule.
          walk: '#7c3aed',
          // blue-700 - "Ball" pitch chip/button only. FOURTH recurrence of
          // this exact value across ScoringMode/* components (gearMenu.
          // handoffModal.confirmBackground, runnerConflictModal.holdButton.
          // border, scoringModeEntry.claimButton.background, now here) -
          // kept separate one more time for consistency with all 3 prior
          // instances, but flagging explicitly: this recurrence count is
          // high enough to be worth a dedicated follow-up story evaluating
          // promotion to a genuine shared gameDay-level token (e.g. gameDay.
          // accent.actionBlue) that all 4+ sites reference, rather than
          // continuing to mint a component-scoped copy indefinitely. Not
          // done here - retrofitting the 3 already-merged components is out
          // of this sub-slice's scope (sub-components section only).
          ball: '#1d4ed8',
        },
        countPips: {
          // Inactive-pip background (ball/strike count dots). Byte-matches
          // gameDay.diamond.stroke.empty (0.18) exactly, but that token's
          // specific documented role is DiamondView's empty-base stroke -
          // kept separate per the no-cross-component-alias rule (same
          // reasoning QuickSwap's position.fallback established for a
          // diamond.* byte-match).
          inactiveBackground: 'rgba(255,255,255,0.18)',
          // Pip border, all pips. Byte-matches scoringModeEntry.closeButton.
          // border (0.2) exactly, but that's a different component's own
          // button-border role - kept separate per the established rule.
          border: 'rgba(255,255,255,0.2)',
        },
        diamondSvg: {
          // Outer diamond polygon stroke. Byte-matches gameDay.diamond.
          // stroke.mound (0.10) exactly, but that token's specific
          // documented role is DiamondView's pitcher's-mound-circle stroke -
          // a different element within a structurally different (larger,
          // full-field) diamond SVG - kept separate per the
          // no-cross-component-alias rule.
          polygonStroke: 'rgba(255,255,255,0.1)',
          base: {
            // Unoccupied-base fill reuses overlay.whiteFaint directly (exact
            // byte match, rgba(255,255,255,0.08)) - a generic pre-mixed
            // cross-app tint, not light-surface-calibrated, already reused
            // directly elsewhere in this gameDay family (e.g.
            // scoringModeEntry's inactive toggle bg) - see call site.
            //
            // Unoccupied-base stroke. Byte-matches overlay.whiteMedium
            // (0.25) exactly, but that token's documented role is dim
            // version-chip TEXT on MaintenanceScreen specifically (a text
            // role, not a stroke) - kept separate, same reasoning
            // gameModeScreen.orientationHint.border already applied to this
            // identical byte-match in slice 5.
            offStroke: 'rgba(255,255,255,0.25)',
          },
          homePlate: {
            // Home-plate fill. No existing 0.12-opacity white tier at this
            // FILL role (gameDay.border.hairline is the same value but a
            // border/divider role, not a shape fill).
            fill: 'rgba(255,255,255,0.12)',
            // Home-plate stroke. No existing match (diamond.stroke.
            // highlight at 0.22 is the nearest neighbor, not equal).
            stroke: 'rgba(255,255,255,0.28)',
          },
          runnerPill: {
            // On-base runner-name pill background/border - gold tint.
            // background (0.15) sits between overlay.goldTint (0.12) and
            // overlay.goldStrong (0.40), no exact match. border (0.35) is
            // close to goldStrong (0.40) but not equal - a genuine distinct
            // tier, not a rounding of either.
            background: 'rgba(245,200,66,0.15)',
            border: 'rgba(245,200,66,0.35)',
          },
        },
        homeAwayChip: {
          home: {
            // "Home" chip background/border - slate-400 tint (color reuses
            // gameDay.text.secondary directly, exact byte match #94A3B8 -
            // see call site). No existing pre-mixed overlay tier at this
            // rgb triple (148,163,184).
            background: 'rgba(148, 163, 184, 0.12)',
            border: 'rgba(148, 163, 184, 0.2)',
          },
          away: {
            // "@ Away" chip border - gold 0.3 tier. Byte-matches
            // gameModeScreen.advanceButton.pendingBorder exactly, but
            // that's a different component's own role - kept separate per
            // the established rule. background reuses overlay.goldTint
            // directly (exact byte match, rgba(245,200,66,0.12)) - see call
            // site.
            border: 'rgba(245, 200, 66, 0.3)',
          },
        },

        // ─── LiveScoringPanel.jsx Main body, sub-slice B of 3 (#698) ───────
        // Covers the non-active-scorer branches of the default-exported Main
        // function: "Join as Viewer" wrapper (no literal colors of its own -
        // delegates entirely to LiveScoreViewer.jsx, already verified clean
        // in slice 7), STATE 1 (no scorer claimed yet) and STATE 3 (someone
        // else is scoring). STATE 2 (I am scorer) is sub-slice C, untouched
        // here. Same mint-over-alias precedent as every prior slice -
        // EXCEPT genuinely generic/umbrella gameDay-level tokens
        // (surface.shell, surface.scoreboard, text.primary/secondary/muted,
        // brand.gold, status.error/errorBg, overlay.whiteFaint), which ARE
        // reused directly here per the precedent already established for
        // those specific tokens across every prior slice.
        gameNumberBadge: {
          // "Game N" pill background - shared verbatim between STATE 1 and
          // STATE 3 (identical value + role, same file) - one key, not two,
          // consistent with inningModal.divider's "shared within this file"
          // precedent. Text color reuses gameDay.text.secondary directly
          // (see call sites). Close to, but NOT an exact match of,
          // liveScoringPanel.homeAwayChip.home.background (0.12) - this is
          // 0.1, a genuinely different opacity, not a rounding.
          background: 'rgba(148, 163, 184, 0.1)',
        },
        noScorerState: {
          // STATE 1 ("No active scorer" claim screen).
          //
          // Header subtitle ("Practice Mode" / "vs {opponent}") - slate-300.
          // Byte-matches inningModal.header.eyebrowTextA11y exactly, but
          // that's a different component's a11y-mode-only eyebrow label -
          // kept separate per the established rule.
          subheaderText: '#cbd5e1',
          // "TOP"/"BOT" half-inning micro-label in this state's own header
          // layout (STATE 3 below uses a differently-styled header with no
          // equivalent literal at this exact gray - a pre-existing
          // divergence between the two states' header markup, not
          // introduced by this migration). No existing token match.
          halfLabel: '#aaa',
          claimButton: {
            // "Claim Scorer Role" primary CTA background - blue-700. FIFTH
            // recurrence of this exact value across ScoringMode/* (gearMenu.
            // handoffModal.confirmBackground, runnerConflictModal.
            // holdButton.border, scoringModeEntry.claimButton.background,
            // liveScoringPanel.accent.ball from sub-slice A, now here) - the
            // handoff doc's own note on the 4th recurrence asked to flag a
            // 5th if one turned up in this section, and one did. Kept as a
            // component-scoped mint one more time for consistency with all
            // 4 prior instances (retrofitting 4 already-merged/checkpointed
            // sites is out of scope for this sub-slice), but this is now
            // strong signal for the follow-up "promote to gameDay.accent.
            // actionBlue" story flagged in sub-slice A's checkpoint.
            background: '#1d4ed8',
          },
          // Claim-error advisory box (no dedicated token object - both
          // background and text reuse color.status.errorBg/color.status.
          // error directly, same reuse precedent finishGameModal established
          // for this exact pairing; see component call site).
          viewerLink: {
            // "Join as Viewer →" link text - blue-400. Byte-matches
            // gameDay.scoringModeEntry.viewerLink.color exactly - same
            // literal text/role ("Join as Viewer" link) but a different
            // component's own concern - kept separate per the established
            // no-cross-component-alias rule (same reasoning gearMenu.
            // finishGameText and restoreScoreModal.errorBox.text already
            // applied to their own byte-matches).
            color: '#60a5fa',
          },
        },
        otherScorerState: {
          // STATE 3 ("{name} is scoring" read-only view).
          //
          // Header strip border. Byte-matches 6+ existing 0.06 white-wash
          // tokens across other components (gameModeScreen.advanceButton.
          // mutedBackground, inningModal.divider, gearMenu.handoffModal.
          // cancelBackground, restoreScoreModal.restoreButton.
          // disabledBackground, finishGameModal.scorePreview.background/
          // cancelButton.background, scoringModeEntry.claimButton.
          // disabledBackground) - minted separately per the established
          // rule, same as every prior recurrence of this value.
          headerBorder: 'rgba(255,255,255,0.06)',
          countPill: {
            // B/S count-pill wrapper background. Same 0.06 white-wash value
            // as headerBorder immediately above, but a different element/
            // role within this same file (pill fill vs. header border) -
            // minted as its own key, same within-file discipline
            // inningModal applied distinguishing battingCard vs.
            // defenseCard chrome.
            background: 'rgba(255,255,255,0.06)',
            // "BALLS"/"STRIKES" micro-labels, 2 sites, shared value. No
            // existing token at this exact gray (#cfd8e3 sits close to but
            // not equal to gameDay.text.label #E2E8F0 or text.secondary
            // #94A3B8 - matching neither).
            labelText: '#cfd8e3',
            // CountPips "active ball" fill color - blue-500. No existing
            // match (distinct from status.info #2563EB, a darker/more
            // saturated blue serving a different role, and from
            // liveScoringPanel.accent.ball #1d4ed8, blue-700, also
            // distinct). Active "strike" fill color reuses color.status.
            // error directly (see call site) - same reuse precedent
            // sub-slice A's accent.hit note already established for red.
            ballColor: '#3b82f6',
          },
          outsPill: {
            // Outs-pill wrapper background - a distinct orange tint, no
            // existing match anywhere in tokens.js at this rgb triple
            // (255,140,66).
            background: 'rgba(255,140,66,0.12)',
            // "OUTS" micro-label - light peach. No existing match.
            labelText: '#FFB89A',
            // CountPips "active out" fill color - orange. No existing
            // match (distinct hue from both accent.caution #d97706 and the
            // background above, despite the shared orange family).
            color: '#FF8C42',
          },
          scorerBanner: {
            // "{name} is scoring 🟢" banner - green tint, 2 sites (bg +
            // border) sharing the file's own scale, no existing exact
            // match at these specific opacities (0.12/0.3) - nearest
            // neighbors are runnerConflictModal.scoreButton.background
            // (0.12, a match) — actually IS byte-identical to
            // runnerConflictModal.scoreButton.background - kept separate
            // per the no-cross-component-alias rule already applied
            // throughout this migration.
            background: 'rgba(22,163,74,0.12)',
            border: 'rgba(22,163,74,0.3)',
            // Live-status dot - green-600. Byte-matches liveScoringPanel.
            // accent.hit exactly (both #16a34a, minted in sub-slice A for
            // the pitch-chip/outcome "good outcome" role) - a different
            // role here (a literal status indicator dot, not a pitch/
            // outcome accent) - kept separate per the established rule,
            // even within this same liveScoringPanel namespace.
            dot: '#16a34a',
          },
          nowBattingCard: {
            // "Now Batting" advisory card - gold tint. background (0.08)
            // byte-matches restoreScoreModal.warningBox.background and
            // scoringModeEntry.todayGameCard.background exactly; border
            // (0.2) byte-matches restoreScoreModal.warningBox.border and
            // inningModal.battingCard.handBadgeBackground exactly - both
            // now 3rd+ recurrences across unrelated components, kept
            // separate per the established rule. Label text reuses
            // brand.gold directly, pitch-count text reuses gameDay.text.
            // muted directly (see call sites).
            background: 'rgba(245,200,66,0.08)',
            border: 'rgba(245,200,66,0.2)',
          },
          disabledPitchButtons: {
            // Disabled (read-only) pitch-button row - 3 sites (bg, border,
            // text), no existing match for any of the three at these exact
            // values.
            background: 'rgba(255,255,255,0.03)',
            border: 'rgba(255,255,255,0.07)',
            text: '#2d3748',
          },
          // "Only one scorer at a time" footer disclaimer - dark slate.
          // Byte-matches gameDay.text.separator, restoreScoreModal.
          // disabledText, finishGameModal.scorePreview.divider, AND
          // scoringModeEntry.disabledText (all #374151) - FIFTH recurrence
          // of this exact value across the gameDay family. Kept separate
          // per the established rule one more time, but flagging: like
          // #1d4ed8 above, this is now strong signal for a follow-up
          // consolidation story rather than continuing to mint per-file
          // forever.
          disclaimerText: '#374151',
        },

        // ─── LiveScoringPanel.jsx Main body, sub-slice C of 3 (final, #698) ─
        // Covers STATE 2 (I am scorer) - the active live-scoring surface:
        // roster-picker/outcome/runner bottom sheets, the header strip (game
        // badge, inning, count/outs pills, admin badge, gear/pause icons),
        // mercy-rule banners, the lock-expired banner, the batting-area cards,
        // the pitch log, my-half pitch buttons, and the opponent-half pitch
        // buttons + run counter. Same mint-over-alias precedent as sub-slices
        // A/B - EXCEPT genuinely generic/umbrella gameDay-level tokens AND the
        // already-minted liveScoringPanel.* namespace from A/B, both of which
        // ARE reused directly here per the task's own explicit instruction to
        // check for and reuse those first (see call sites). Most notably: the
        // header's game-number badge and count/outs pills are the exact same
        // "top pill" widget as otherScorerState's (STATE 3) - verified by
        // reading STATE 3's JSX directly before writing this block, not
        // assumed from byte-matching alone - so those are reused directly,
        // not re-minted, keeping the single-render-surface intent (root
        // CLAUDE.md's Live Scoring Architecture note: "Game Mode count and
        // outs render in exactly one place - the top pill") backed by one
        // shared token source instead of two independently-drifting copies.
        scorerState: {
          // Bottom-sheet backdrop - shared verbatim by the roster-picker,
          // outcome, and runner-advancement sheets (3 call sites, identical
          // value + role). No existing 0.75-opacity black tier (neighbors:
          // overlay.scrimLight 0.5, gearMenu.handoffModal.backdrop 0.8,
          // restoreScoreModal.backdrop 0.72, runnerConflictModal.backdrop/
          // finishGameModal.backdrop 0.82) - a genuine distinct tier for this
          // file's own bottom sheets.
          sheetBackdrop: 'rgba(0,0,0,0.75)',

          rosterPicker: {
            row: {
              // Non-current roster row background. Byte-matches several
              // other components' 0.04 white-wash tokens (inningModal.
              // rowBackground, scoringModeEntry.subtleRowBackground,
              // runnerConflictModal.cancelButton.background) and this same
              // file's pitchButtons.disabledBackground below - kept separate
              // per the established no-cross-role-alias rule (list-row bg is
              // a distinct role from a disabled-button bg even at the same
              // opacity).
              background: 'rgba(255,255,255,0.04)',
              // Current-row background/border reuse overlay.goldTint/
              // goldStrong directly (exact matches, see call site).
            },
          },

          outcomeSheet: {
            // V2 sheet's standalone "Foul" button background - gold 0.10
            // tier. Byte-matches gameModeScreen.resumeBanner.background
            // exactly, but that's a different component's banner role -
            // kept separate per the established rule. Border/text reuse
            // overlay.goldStrong/brand.gold directly (see call site).
            foulButtonBackground: 'rgba(245,200,66,0.10)',
            // Outcome option buttons (both V1 and V2 sheets) - shared
            // subtle-wash background, 1 role, all sites. No existing
            // 0.05-opacity white tier anywhere in tokens.js.
            optionButtonBackground: 'rgba(255,255,255,0.05)',
          },

          runnerSheet: {
            // "Stayed 3rd" (held) button - byte-matches several other 0.06/
            // 0.2 tokens elsewhere (see e.g. otherScorerState.countPill.
            // background, countPips.border) but distinct role here (a
            // 3-way outcome button, not a pip/pill) - kept separate.
            heldButtonBackground: 'rgba(255,255,255,0.06)',
            heldButtonBorder: 'rgba(255,255,255,0.2)',
            // "Scored"/"Out" buttons - 8-digit hex = the established
            // liveScoringPanel.accent.hit / color.status.error base color
            // (reused directly for these buttons' solid borders, see call
            // site) with a "22" alpha suffix baked into the source literal
            // for the tinted background. Preserved byte-for-byte rather than
            // computed via concatenation, consistent with this file's other
            // tokens all being flat literals per this file's own top-of-file
            // rule ("no computed expressions").
            scoredButtonBackground: '#16a34a22',
            outButtonBackground: '#dc262622',
          },

          header: {
            // STATE 2's own header-strip bottom border. Byte-matches
            // otherScorerState.headerBorder (STATE 3's header) exactly, but
            // kept as its own key rather than reused: unlike the game-badge/
            // count/outs pills below (verified identical sub-widgets shared
            // between states), this is the outer header CONTAINER's own
            // border and STATE 2's header has materially different content
            // (admin badge, gear/pause icon buttons) that STATE 3's does
            // not - a structurally different element, not the same shared
            // widget, despite the byte match.
            borderBottom: 'rgba(255,255,255,0.06)',
            adminBadge: {
              // "⚠ Admin" pill (isAdminTestMode) - amber-100 bg / amber-800
              // text. No existing match anywhere in tokens.js.
              background: '#fef3c7',
              text: '#92400e',
            },
            iconButton: {
              // Gear (⚙) and pause (✕) icon buttons - shared verbatim, same
              // role, both sites in this header. No existing 0.06/0.1
              // pairing tokenized together elsewhere for an icon-button
              // role specifically (0.06 and 0.1 individually recur many
              // times across the gameDay family, but always for different
              // element roles) - color reuses gameDay.text.secondary
              // directly (see call site).
              background: 'rgba(255,255,255,0.06)',
              border: 'rgba(255,255,255,0.1)',
            },
            // Game-number badge (background) and count/outs pills reuse
            // liveScoringPanel.gameNumberBadge.background and
            // liveScoringPanel.otherScorerState.countPill.*/outsPill.*
            // directly - confirmed identical widget to STATE 3's by reading
            // STATE 3's JSX (lines 383-502) before writing this block, not
            // assumed from the byte match alone. See top-of-block note.
          },

          // Mercy-rule banner - identical markup rendered twice (home half,
          // opponent half; gs.halfInning === myTeamHalf ? ... : ...), same
          // value + role at both sites, one shared key set (same "shared
          // within this file" precedent as gameNumberBadge/mercyBanner-style
          // widgets in prior sub-slices).
          mercyBanner: {
            background: '#7c2d12',
            // FOURTH+ recurrence of #fca5a5 across ScoringMode/* components
            // (gameModeScreen.exitButton.text, gearMenu.finishGameText,
            // restoreScoreModal.errorBox.text) - kept separate per the
            // established rule, same reasoning every prior slice used for
            // this literal.
            text: '#fca5a5',
            border: '#ef4444',
            endButtonBackground: '#ef4444',
          },

          // Lock-expired reclaim banner. No exact match anywhere: 0.15/0.35
          // red-600 tiers sit between color.overlay.errorMid (0.12) and
          // errorMedium (0.30), and are a different rgb triple entirely from
          // overlay.redFaint (200,16,46 vs. 220,38,38 here).
          lockExpiredBanner: {
            background: 'rgba(220,38,38,0.15)',
            border: 'rgba(220,38,38,0.35)',
            text: '#fca5a5',
          },

          // "Now Batting" (mine) / opponent "BATTING" cards - identical
          // gold-tint chrome, 2 call sites, same role, one shared key set.
          // background byte-matches otherScorerState.nowBattingCard.
          // background (0.08) exactly, but border (0.25) does NOT match
          // otherScorerState.nowBattingCard.border (0.2) - a genuinely
          // different value, so kept as this section's own token pair
          // rather than partially reusing one half of an otherwise-matching
          // pair. Label text reuses brand.gold, subtext reuses gameDay.text.
          // muted directly (see call sites).
          battingCard: {
            background: 'rgba(245,200,66,0.08)',
            border: 'rgba(245,200,66,0.25)',
          },

          // "Next Batter" suggestion card. Byte-matches the roster-picker
          // row background above (both 0.04) but a distinct role (advisory
          // card vs. list row) - kept separate, own key. Border reuses
          // gameDay.border.hairline directly (see call site).
          suggestedBatterCard: {
            background: 'rgba(255,255,255,0.04)',
            // "↓ Different" secondary button background. Byte-matches
            // runnerSheet.heldButtonBackground (both 0.06) exactly, but
            // that's an unrelated button in a different sheet - kept
            // separate, own key. Border reuses gameDay.border.hairline
            // directly (see call site).
            secondaryButtonBackground: 'rgba(255,255,255,0.06)',
          },

          // "No batting order set" empty state.
          noBattingOrder: {
            background: 'rgba(255,255,255,0.05)',
            titleText: '#aaa',
            bodyText: '#666',
          },

          pitchLog: {
            // Unknown/lookup-miss pitch-chip fallback background (`PITCH_
            // CHIPS[p.type] || { bg: '#475569' }`). Byte-matches gameDay.
            // text.caption exactly, but that's a text-color role, not a
            // chip-background role - kept separate. "Pitches" eyebrow label
            // reuses gameDay.text.caption directly instead (see call site).
            fallbackChipBackground: '#475569',
            // "No pitches yet" empty-state text. FIFTH+ recurrence of
            // #374151 across the gameDay family (gameDay.text.separator,
            // restoreScoreModal.disabledText, finishGameModal.scorePreview.
            // divider, scoringModeEntry.disabledText, otherScorerState.
            // disclaimerText) - kept separate one more time per the
            // established rule.
            emptyText: '#374151',
          },

          // Coach-pitching overlay and rule-warning banners - both amber,
          // distinct opacities per banner but sharing one warning-text
          // color (shared within this file, same role, same "shared value +
          // shared role = one key" precedent as gameNumberBadge/mercyBanner
          // above). Distinct hue from liveScoringPanel.accent.caution
          // (#d97706, rgb 217,119,6) - this is rgb(245,158,11), amber-500,
          // a genuinely different orange.
          coachPitchingBanner: {
            background: 'rgba(245,158,11,0.15)',
            border: 'rgba(245,158,11,0.4)',
          },
          ruleWarningBanner: {
            background: 'rgba(245,158,11,0.1)',
            border: 'rgba(245,158,11,0.3)',
          },
          warningText: '#f59e0b',

          pitchButtons: {
            // Disabled-state chrome shared by all 6 my-half pitch buttons
            // (Attempt/Ball/Called-K/Swing-K/Foul/Contact). background
            // (0.04) and text (#374151) are distinct values from
            // otherScorerState.disabledPitchButtons' own 0.03/#2d3748 pair -
            // STATE 2's disabled buttons (mid-at-bat, e.g. no batter
            // selected) are a different visual treatment from STATE 3's
            // permanently-read-only row, not a byte-for-byte rename of the
            // same design. Disabled border reuses overlay.whiteFaint
            // directly (exact match, see call site).
            disabledBackground: 'rgba(255,255,255,0.04)',
            disabledText: '#374151',
            // Each enabled pitch button's 8-digit hex = its established
            // liveScoringPanel.accent.* (or status.error) base color with a
            // baked-in alpha suffix ("1a" ~= 10% for background, "66" ~= 40%
            // for border) - preserved as flat literals per this file's own
            // "no computed expressions" token rule, not derived via
            // concatenation at the call site. Called-K and Swing-K share
            // one "strike" pair (identical value + role, both map to
            // status.error).
            attempt: { background: '#7c3aed1a', border: '#7c3aed66' },   // = accent.walk (#7c3aed)
            ball:    { background: '#1d4ed81a', border: '#1d4ed866' },   // = accent.ball (#1d4ed8)
            strike:  { background: '#dc26261a', border: '#dc262666' },   // = status.error (#dc2626)
            foul:    { background: '#d977061a', border: '#d9770666' },   // = accent.caution (#d97706)
            contact: { background: '#16a34a1a', border: '#16a34a66' },   // = accent.hit (#16a34a)
          },

          undoButton: {
            border: 'rgba(255,255,255,0.1)',
            // Disabled-state (no pitches yet) text. Byte-matches
            // otherScorerState.disabledPitchButtons.text exactly, but a
            // different specific element (a bottom-of-panel undo link, not
            // the disabled pitch-button row itself) - kept separate per the
            // established rule. Enabled-state text reuses gameDay.text.
            // muted directly (see call site).
            disabledText: '#2d3748',
          },

          // Opponent-half pitch-button row. Byte-matches the outcome-sheet
          // option-button background above (both 0.05) but a distinct role
          // (opponent pitch entry vs. at-bat-outcome selection) - kept
          // separate, own key. Border/text reuse overlay.whiteLight/
          // gameDay.text.primary directly (see call site).
          opponentPitchButtons: {
            background: 'rgba(255,255,255,0.05)',
          },

          // "+1 {opp} Run" manual-run button - dark red. Byte-matches
          // restoreScoreModal.restoreButton.confirmBackground exactly
          // (#7f1d1d, red-900), but that's a different component's
          // tap-to-confirm state background - kept separate per the
          // established rule.
          oppRunButton: {
            background: '#7f1d1d',
            text: '#fca5a5',
          },

          // "+1 {my team} Run" secondary manual-run button - muted/
          // de-emphasized by design (this team's run count is expected to
          // come from the scoring flow, not this manual button). No
          // existing match for either value.
          myRunButton: {
            border: '#374151',
            text: '#555',
          },
        },
      },
    },
  },

  // ─── OPACITY (reference scale — positions future tint() helper) ─────────────
  // Not all empirical opacity values are in this scale. 0.04 (navyWash), 0.10,
  // 0.12, 0.18, 0.20 are in the audit drift inventory.

  opacity: {
    subtle:  0.06,  // 19+17=36x across navy+white — anchor for "barely visible"
    faint:   0.08,  // 23+32=55x — most common single opacity value in codebase
    light:   0.15,  // 24+16=40x
    medium:  0.25,  // gap-fill between light and strong; no direct audit source
    strong:  0.40,  // 9+9=18x — gold tints
    overlay: 0.80,  // modal backdrops
  },

  // ─── SPACE (4px base scale, named keys for dot-access consistency) ──────────
  // Compound padding values from the audit (8px 12px, 10px 14px, 6px 8px, etc.)
  // are two-axis compositions of these steps. 6px, 10px, 14px are half-steps
  // that don't fit the scale — documented as drift in DESIGN_AUDIT.md.

  space: {
    zero: '0',
    xs:   '4px',
    sm:   '8px',
    md:   '12px',
    lg:   '16px',
    xl:   '20px',
    xl2:  '24px',
    xl3:  '32px',
    xl4:  '40px',
    xl5:  '48px',
  },

  // ─── RADIUS ─────────────────────────────────────────────────────────────────
  // radius.sheet ('16px 16px 0 0') DROPPED — composition pattern, not a primitive.
  // Encode inside future <BottomSheet> primitive (v2.5.0) using radius.lg internally.
  // 10px (77x) is NOT tokenized — between md and lg with no clean semantic role;
  // migrate toward radius.md at call sites in v2.5.x.

  radius: {
    xs:     '4px',    // 21x
    sm:     '6px',    // 51x — more common than expected; earns a named token
    md:     '8px',    // 91x — dominant value
    lg:     '12px',   // 15x
    pill:   '9999px', // unifies 9999px (4x) + 999px (2x) + 99px (1x)
    circle: '50%',    // 15x — avatar/icon circles
  },

  // ─── BORDER WIDTH ──────────────────────────────────────────────────────────
  // INTRODUCED AS CANONICAL — Story 92 (DefenseDiamond Tier B). Resolves the
  // 1.5px navy pill borders in DefenseDiamond. hairline/medium ship together
  // so the scale is complete at introduction rather than grown piecemeal.
  // Story 82 (ParentView Tier) extends with thick/heavy for the 3px position
  // stripe and 4px card top-border accents.

  borderWidth: {
    hairline: '1px',
    thin:     '1.5px',
    medium:   '2px',
    thick:    '3px',    // ParentView position-stripe borderLeft (Story 82)
    heavy:    '4px',    // ParentView card top-border accent (Story 82)
  },

  // ─── FONT ───────────────────────────────────────────────────────────────────

  font: {

    family: {
      // Resolves 'Georgia,serif' (58x) + 'Georgia, serif' (5x) + 'Georgia,' (15x, truncated)
      serif: "Georgia,'Times New Roman',serif",
      // INTRODUCED AS CANONICAL — no prior global font-family in index.html or index.css.
      // The 52 'inherit' occurrences in App.jsx fall back to browser defaults today;
      // this token defines what they resolve to once primitives consume it.
      sans:  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      // 2x — ships to prevent a third informal value appearing later
      mono:  'monospace',
    },

    size: {
      // 9px (32x), 9.5px (2x), 7.5px (2x) are NOT tokenized — WCAG violations.
      // Must remediate before ACCESSIBILITY_V1 GA.
      // 10px (146x) is NOT tokenized — near-WCAG-floor; 146 call sites are
      // the v2.5.x migration backlog. Tokenizing would freeze the violation.
      xs:      '11px',  // 137x — chip labels, secondary stats
      sm:      '12px',  // 127x — small body
      body:    '13px',  // 105x — primary body text
      md:      '14px',  //  79x — readable body, form labels
      mdLg:    '15px',  // scale step between md and lg (Story 60; EmptyState title, sprinkled across modals/screens)
      lg:      '16px',  //  29x — section headers
      xl:      '18px',  //  26x — card titles
      xl2:     '22px',  //  13x — screen titles (2xl → xl2 for dot-access)
      xl3:     '32px',  //   7x — hero numbers (28px → drift; 3xl → xl3)
      display: '36px',  //   3x — display / splash numbers
    },

    weight: {
      regular:  400,
      medium:   500,
      semibold: 600,
      bold:     700,
    },

    letterSpacing: {
      tight:  '-0.01em',  // player names, serif display text
      normal: '0',        // body text
      wide:   '0.06em',   // uppercase chrome labels (INNING, BALLS, OUTS, etc.)
      wider:  '0.08em',   // eyebrows in FAQ/Legal section headings (Story 65)
    },

    lineHeight: {
      tight:       1.2,
      body:        1.4,
      comfortable: 1.6,
      relaxed:     1.7,
      loose:       1.75,
    },

  },

  // ─── Z-INDEX ────────────────────────────────────────────────────────────────
  // INTRODUCED AS CANONICAL — no prior zIndex scale existed in the codebase.
  // Values are based on layering intent; confirm at call sites in v2.5.0.

  zIndex: {
    header:        100,
    navBar:        200,
    subTab:        300,
    dropdown:      400,
    modalBackdrop: 500,
    modal:         600,
    toast:         700,  // must clear everything — highest layer
  },

  // ─── SHADOW ─────────────────────────────────────────────────────────────────
  // Values sourced from fresh recon (2026-05-03). 25 occurrences across 4
  // semantic clusters. Brand-color tinted shadows (gold/orange button variants,
  // ~4x in App.jsx) not tokenized — call-site-specific; deferred to tint()
  // helper or per-variant button primitive (v2.5.x).
  // LockFlow.jsx '0 -4px 24px rgba(0,0,0,0.18)' — now tokenized as sheetTop
  // and consumed by the <BottomSheet> primitive (Story 87).

  shadow: {
    subtle:     '0 1px 4px rgba(15,31,61,0.06)',                             // 1x FairnessCheck.jsx — navy-tinted minimal lift; consistent with color.overlay family
    subtleCard: '0 2px 8px rgba(15,31,61,0.06)',                             // 1x LegalSection.jsx — navy-tinted single-layer card lift (Story 64)
    card:       '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)', // 3x auth screens (identical) — compound two-layer; primary card surface elevation
    // RESERVED — App.jsx call sites (locked); migration deferred to v2.5.x.
    // No in-scope component uses this value today. Parallel to font.family.sans
    // "introduced as canonical" precedent. See DESIGN_AUDIT.md §6.
    elevated: '0 4px 12px rgba(0,0,0,0.12)',                              // App.jsx dropdowns + elevated panels
    overlay:  '0 4px 12px rgba(0,0,0,0.35)',                              // 1x Toast.jsx — heavy float layer; modals, tooltips
    sheetTop: '0 -4px 24px rgba(0,0,0,0.18)',                             // 1x BottomSheet primitive — upward shadow for bottom-sheet floor (Story 87)
  },

  // ─── MOTION ─────────────────────────────────────────────────────────────────
  // INTRODUCED AS CANONICAL — no prior motion tokens existed in the codebase.
  // Minimal Story 73 (b) scope: duration.fast + easing.standard. First-surfaced
  // site: FAQSection.jsx L114 `transition: "transform 0.15s ease"`. Grow as
  // additional motion call sites are tokenized (Story 73 option (a) trajectory).

  motion: {
    duration: {
      fast: '0.15s',    // 1x FAQSection.jsx accordion chevron rotation
    },
    easing: {
      standard: 'ease', // 1x FAQSection.jsx accordion chevron rotation
    },
  },

};
