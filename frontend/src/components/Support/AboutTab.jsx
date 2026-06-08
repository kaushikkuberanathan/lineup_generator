// NOTE: This component is auth-agnostic — no protected data.
// When Phase 4C auth gate ships, allowlist the About/More tab
// in the unauthenticated routing layer.
// Search App.jsx for "AUTH GATE — parked" to find the block.
// Story 105 / issue #281.
import { tokens } from "../../theme/tokens";

/**
 * AboutTab
 * Support tab → About sub-tab.
 * Story 105 (issue #281) — overhaul.
 *
 * Card order:
 *   1. What Is Dugout Lineup?   (token-driven; feature bullets + Share CTA)
 *   2. Built by a Coach         (token-driven; navy top-accent signature card)
 *   3. Open to Partnerships     (token-driven; email + LinkedIn buttons)
 *   4. App Info                 (verbatim from original — C/S styled; Share button removed per Story 105)
 *   5. How to Use (collapsible) (verbatim from original — C/S styled)
 *
 * Cards 1–3 are tokens.* only. Cards 4–5 keep the legacy C (color) + S (style)
 * props so they render identically to the pre-overhaul version (Card 4's
 * redundant "Share App Now" button removed — the Card 1 CTA is now the single
 * home for that action).
 *
 * Props:
 *   aboutGuideOpen    bool   — "How to Use" collapsible open state
 *   setAboutGuideOpen fn     — toggle for the collapsible
 *   APP_VERSION       string — app version label
 *   C                 object — legacy color palette (App.jsx)
 *   S                 object — legacy style objects (App.jsx)
 */
export function AboutTab({ aboutGuideOpen, setAboutGuideOpen, APP_VERSION, C, S }) {
  // ── Token-driven card styles (Cards 1–3) ───────────────────────────────
  var cardBase = {
    background: tokens.color.surface.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    boxShadow: tokens.shadow.subtleCard, // exact match to S.card boxShadow
    marginBottom: "14px",                // drift: matches S.card 14px rhythm; no 14px space token
    border: "1px solid " + tokens.color.border.subtle,
  };
  var cardAccent = {
    ...cardBase,
    borderTop: tokens.borderWidth.heavy + " solid " + tokens.color.brand.navy, // 4px navy signature accent (Card 2 only)
  };

  // Eyebrows
  var eyebrowMuted = {
    display: "block",
    fontSize: tokens.font.size.xs,
    fontWeight: tokens.font.weight.bold,
    letterSpacing: tokens.font.letterSpacing.wider,
    textTransform: "uppercase",
    color: tokens.color.text.muted,
    marginBottom: tokens.space.sm,
  };
  var eyebrowWarning = { ...eyebrowMuted, color: tokens.color.status.warning };

  // Headlines
  var headlineLg = {
    fontSize: tokens.font.size.lg,
    fontWeight: tokens.font.weight.bold,
    color: tokens.color.text.primary,
    marginBottom: tokens.space.md,
  };
  var headlineLgTight = { ...headlineLg, marginBottom: tokens.space.xs };
  var headlineMd = { ...headlineLg, fontSize: tokens.font.size.md };

  // Body / supporting type
  var credential = {
    fontSize: tokens.font.size.sm,
    fontStyle: "italic",
    color: tokens.color.text.muted,
    marginBottom: tokens.space.md,
  };
  var bioPara = {
    fontSize: tokens.font.size.body,
    color: tokens.color.text.body,
    lineHeight: tokens.font.lineHeight.relaxed,
    marginBottom: tokens.space.md,
  };
  var tagline = {
    fontSize: tokens.font.size.sm,
    fontStyle: "italic",
    color: tokens.color.text.muted,
    lineHeight: tokens.font.lineHeight.comfortable,
  };

  // Card 1 bullets
  var bulletList = { listStyle: "none", margin: "0 0 " + tokens.space.md + " 0", padding: 0 };
  var bulletItem = {
    display: "flex",
    gap: tokens.space.sm,
    fontSize: tokens.font.size.body,
    color: tokens.color.text.body,
    lineHeight: tokens.font.lineHeight.comfortable,
    marginBottom: tokens.space.sm,
  };
  var checkMark = {
    color: tokens.color.status.success,
    fontWeight: tokens.font.weight.bold,
    flexShrink: 0,
  };

  // Card 1 primary CTA (token-driven equivalent of S.btn("primary"))
  var ctaPrimary = {
    display: "block",
    width: "100%",
    border: "none",
    borderRadius: tokens.radius.md,
    padding: tokens.space.md + " " + tokens.space.lg,
    background: tokens.color.brand.red,
    color: tokens.color.text.onDark,
    fontSize: tokens.font.size.md,
    fontWeight: tokens.font.weight.bold,
    fontFamily: tokens.font.family.serif,
    cursor: "pointer",
  };

  // Card 3 contact buttons
  var contactBtnRow = { display: "flex", gap: tokens.space.md };
  var contactBtn = {
    flex: 1,
    textAlign: "center",
    border: "1px solid " + tokens.color.border.default,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm + " " + tokens.space.lg, // 8px 16px
    minHeight: "44px",                                 // a11y touch-target floor
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm,
    fontSize: tokens.font.size.sm,
    fontWeight: tokens.font.weight.semibold,
    color: tokens.color.text.primary,
    background: tokens.color.surface.card,
    textDecoration: "none",
  };

  var features = [
    "Create fair lineups in seconds",
    "Rotate players so everyone gets equal time",
    "Track positions inning by inning",
    "Share with parents and scorekeepers instantly",
    "Works offline at the field — no signal needed",
    "Free forever, no account required",
  ];

  function shareApp() {
    var url = "https://dugoutlineup.com";
    var text = "Dugout Lineup — free lineup tool for youth baseball coaches. Runs at the field, works offline.";
    if (navigator.share) {
      navigator.share({ title: "Dugout Lineup", text: text, url: url }).catch(function() {});
    } else {
      try { navigator.clipboard.writeText(url); alert("Link copied to clipboard!"); } catch(e) { /* ignored */ }
    }
  }

  var onboardingSteps = [
    {
      title: "Step 1 — Install the App",
      body: "iOS: Tap the Share button in Safari, then “Add to Home Screen.” Android: Tap ⋮ in Chrome, then “Add to Home Screen” or “Install App.” The app works offline after first load — no signal needed at the field."
    },
    {
      title: "Step 2 — Create Your Team",
      body: "From the Home screen, tap “Create New Team.” Enter your team name, age group, and season year. Tap the team card to open it."
    },
    {
      title: "Step 3 — Build Your Roster",
      body: "Go to the Roster tab. Tap “Add Player” for each player. Expand each player card to set fielding attributes, batting attributes, running, and preferred positions. The more you fill in, the better the auto-assign engine performs."
    },
    {
      title: "Step 4 — Add Your Schedule",
      body: "Go to the Team tab, then the Schedule sub-tab. Tap “Add Game” to enter games manually, or use AI Photo Import to photograph your printed schedule — it parses automatically in seconds."
    },
    {
      title: "Step 5 — Generate a Lineup",
      body: "Go to the Game Day tab, then Defense. Set your innings (4, 5, or 6). Tap “Auto-Assign.” The engine places 10 players per inning with 1 on bench, rotating fairly across all positions."
    },
    {
      title: "Step 6 — Set the Batting Order",
      body: "Go to the Game Day tab, then Batting. Tap “Suggest Order” for a stats-driven recommendation. Use the up/down arrows to reorder on mobile, or drag cards on desktop."
    },
    {
      title: "Step 7 — Share With Your Team",
      body: "Go to the Team tab, then Schedule. Tap a game then “Share Lineup.” Send the link to parents and scorekeepers — no account needed to view."
    },
    {
      title: "Step 8 — Back Up Your Data",
      body: "Tap ··· on any team card to Download Backup and save a JSON file. To restore, go to the Roster tab — if your roster is empty, tap “Restore from backup file.” Back up after every few games."
    }
  ];

  return (
    <div>
      {/* ── Card 1: What Is Dugout Lineup? ───────────────────── */}
      <div style={cardBase}>
        <span style={eyebrowMuted}>Free · Works Offline · No Account Needed</span>
        <div style={headlineLg}>What Is Dugout Lineup?</div>
        <ul style={bulletList}>
          {features.map(function(feat, fi) {
            return (
              <li key={fi} style={bulletItem}>
                <span style={checkMark}>✓</span>
                <span>{feat}</span>
              </li>
            );
          })}
        </ul>
        <div style={bioPara}>
          Built for youth baseball and softball coaches who want to focus on the game, not the paperwork.
        </div>
        <button style={ctaPrimary} onClick={shareApp}>Share App Now</button>
      </div>

      {/* ── Card 2: Built by a Coach (navy top-accent) ───────── */}
      <div style={cardAccent}>
        <span style={eyebrowWarning}>Why I Built This</span>
        <div style={headlineLgTight}>Built by a Coach, Shipped like a Product</div>
        <div style={{ fontSize: tokens.font.size.sm, fontStyle: "italic", color: tokens.color.text.muted, marginBottom: tokens.space.sm }}>
          Built on the field, not in a boardroom.
        </div>
        <div style={credential}>Youth Baseball Coach · Sharon Springs 8U</div>
        <div style={bioPara}>
          Hi — I&apos;m Kaushik, a product geek based in Atlanta, GA and a youth baseball coach.
        </div>
        <div style={bioPara}>
          After too many nights juggling paper lineup cards, spreadsheets, and last-minute game changes, I built Dugout Lineup for my own team. What started as a weekend project became the tool you&apos;re using today — built around fairness, player development, and real game-day pressure.
        </div>
        <div style={tagline}>
          Built for coaches. Tested in dugouts. Always improving.
        </div>
      </div>

      {/* ── Card 3: Open to Partnerships ─────────────────────── */}
      <div style={cardBase}>
        <span style={eyebrowMuted}>Get in Touch</span>
        <div style={headlineMd}>Open to Partnerships</div>
        <div style={bioPara}>
          League coordinators, coaching associations, or product teams building in the youth sports space — I&apos;d love to connect.
        </div>
        <div style={contactBtnRow}>
          <a href="mailto:kaushik.kuberanathan@gmail.com" target="_blank" rel="noopener noreferrer" style={contactBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#EA4335" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
            </svg>
            <span>Email</span>
          </a>
          <a href="https://www.linkedin.com/in/kaushikkumarkuberanathan/" target="_blank" rel="noopener noreferrer" style={contactBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
            </svg>
            <span>LinkedIn</span>
          </a>
        </div>
      </div>

      {/* ── Card 4: App Info (verbatim from original; Share button removed) ── */}
      <div style={S.card}>
        <div style={{ fontSize:"20px", fontWeight:"bold", color:C.navy, marginBottom:"4px" }}>Dugout Lineup &#x26be; <span style={{ fontSize:"13px", fontWeight:"normal", color:C.textMuted }}>v{APP_VERSION}</span></div>
        <div style={{ fontSize:"12px", color:C.textMuted, marginBottom:"12px" }}>Built for youth baseball coaches. Runs at the field.</div>
        <div>
          <a href="https://dugoutlineup.com" target="_blank" rel="noopener noreferrer"
            style={{ fontSize:"12px", color:C.red, fontWeight:"bold", textDecoration:"none" }}>
            Open in Browser ↗
          </a>
        </div>
      </div>

      {/* ── Card 5: How to Use (collapsible, verbatim) ───────── */}
      <div style={S.card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
          onClick={function() { setAboutGuideOpen(!aboutGuideOpen); }}>
          <div style={S.sectionTitle}>How to Use This App</div>
          <span style={{ fontSize:"12px", color:C.textMuted, marginBottom:"14px" }}>{aboutGuideOpen ? "▲" : "▼"}</span>
        </div>
        {aboutGuideOpen ? (
          <div>
            {onboardingSteps.map(function(step, si) {
              return (
                <div key={si} style={{ marginBottom:"14px", paddingBottom:"14px", borderBottom: si < onboardingSteps.length - 1 ? "1px solid rgba(15,31,61,0.07)" : "none" }}>
                  <div style={{ fontSize:"12px", fontWeight:"bold", color:C.navy, marginBottom:"4px" }}>{step.title}</div>
                  <div style={{ fontSize:"12px", color:C.text, lineHeight:"1.6" }}>{step.body}</div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

    </div>
  );
}
