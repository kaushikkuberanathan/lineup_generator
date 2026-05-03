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
    },

    surface: {
      page:        '#F8FAFC',  // slate-50, 9x — app page bg (#F9FAFB 10x → drift, collapsed here)
      card:        '#FFFFFF',  // resolves #FFF (121x) + #FFFFFF (21x) → canonical 6-char
      dark:        '#0B1524',  // 12x — Game Mode header gradient, deepest navy surface
      tableHeader: '#F5EFE4',  // 13x — table thead row band (Defense/Batting/Scoring grids)
    },

    text: {
      primary:   '#0F1F3D',  // alias of brand.navy — primary text on light surfaces
      secondary: '#64748B',  // 46x — slate-500, muted body text
      tertiary:  '#94A3B8',  // 58x — slate-400, placeholder/caption
      onDark:    '#FFFFFF',  // all #FFF on dark surfaces
      disabled:  '#9CA3AF',  // 13x — gray-400, disabled states
    },

    status: {
      success: '#27AE60',  // 40x — primary success green
      warning: '#D4A017',  // 26x — dark amber, warning states (intentionally ≠ brand.gold)
      error:   '#DC2626',  // 32x — Tailwind red-600, alert/error UI (intentionally ≠ brand.red)
      errorBg: '#FEE2E2',  // 6x — red-50, error chip/alert backgrounds
      info:    '#2563EB',  // 22x — Tailwind blue-600, informational UI
      // successBg: DROPPED — #DCFCE7 appears 1x, below 3x threshold; compose via tint() in v2.5.0
    },

    border: {
      subtle:  'rgba(15,31,61,0.08)',  // 23x — faint navy tint, card dividers on light surfaces
      default: '#E2E8F0',              // 14x — slate-200, standard dividers/outlines
      strong:  '#94A3B8',              // selective — visible borders, input outlines, focus rings
    },

    // Pre-mixed rgba tints — directly usable in React inline styles without a helper.
    // The opacity reference scale below documents the normalized set; these are empirical values.
    // navyWash uses 0.04 which is not in the opacity reference scale (0.04 → drift);
    // the name reflects visual weight, not alignment to opacity.subtle (which is 0.06).
    overlay: {
      navyWash:   'rgba(15,31,61,0.04)',    // 22x — barely-there navy wash
      navyFaint:  'rgba(15,31,61,0.08)',    // 23x — card hover tints, subtle fills
      navyMedium: 'rgba(15,31,61,0.15)',    // 24x — mid-weight overlays, border tints
      whiteFaint: 'rgba(255,255,255,0.08)', // 32x — lighten elements on dark surfaces
      whiteLight: 'rgba(255,255,255,0.15)', // 16x — on-dark borders, highlights
      goldTint:   'rgba(245,200,66,0.12)',  // 9x — gold-tinted section backgrounds
      goldStrong: 'rgba(245,200,66,0.40)',  // 9x — gold wash for selected/active states
      backdrop:   'rgba(5,10,25,0.97)',     // — modal/bottom-sheet near-opaque scrim
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
  // LockFlow.jsx '0 -4px 24px rgba(0,0,0,0.18)' excluded — upward directional
  // shadow on bottom-sheet footer; deferred to <BottomSheet> primitive (v2.5.0).

  shadow: {
    subtle:   '0 1px 4px rgba(15,31,61,0.06)',                             // 1x FairnessCheck.jsx — navy-tinted minimal lift; consistent with color.overlay family
    card:     '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)', // 3x auth screens (identical) — compound two-layer; primary card surface elevation
    // RESERVED — App.jsx call sites (locked); migration deferred to v2.5.x.
    // No in-scope component uses this value today. Parallel to font.family.sans
    // "introduced as canonical" precedent. See DESIGN_AUDIT.md §6.
    elevated: '0 4px 12px rgba(0,0,0,0.12)',                              // App.jsx dropdowns + elevated panels
    overlay:  '0 4px 12px rgba(0,0,0,0.35)',                              // 1x Toast.jsx — heavy float layer; modals, tooltips
  },

};
