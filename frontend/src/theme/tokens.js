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
        caption:   '#475569',  // low-emphasis section eyebrow - "Bench"
                                 // KNOWN GAP: 2.39:1 vs surface.scoreboard - FAILS WCAG AA
                                 // (needs 4.5:1). Pre-existing production value, preserved
                                 // as-is by this byte-preserving mint. See #704.
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
          // POS_COLORS.LC = #27ae60 here, but color.position.LC = #2980B9
          // (the blue used by 2B/LC elsewhere in the app) - a genuine
          // pre-existing inconsistency in this file, not introduced by this
          // migration. Preserved as-is (byte-preserving mint); flagged for
          // KK, not silently corrected.
          lc: '#27ae60',
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
