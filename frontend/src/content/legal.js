/**
 * legal.js
 * Static legal document content for the Support → Legal section, and the
 * canonical source for the registration-screen consent flow (see
 * components/Legal/LegalDocBody.jsx and components/Legal/LegalDocSheet.jsx —
 * both render through getLegalDoc() below so the Account tab and the
 * registration screen always show identical text, never a second copy).
 *
 * ─── Versioning ──────────────────────────────────────────────────────────
 * Each doc in LEGAL_DOCS carries stable identity (id, title, emoji, summary)
 * plus a `versions` array — the full history of that document's text, oldest
 * first. What a coach consents to on the registration screen is stamped as
 * just a version STRING (see utils/legalConsent.js + migration 028's
 * legal_consents table) — never the text itself. The version string is the
 * pointer back to the exact words a person agreed to; the words live here,
 * in git, forever.
 *
 * Bumping a document — however small or large the change — means exactly
 * one edit: append a new entry to that doc's `versions` array with a new
 * `version` string. Nothing else in the codebase needs to change:
 *   - getLegalDoc(id) always resolves to the LAST entry in `versions`, so
 *     every consumer (Account tab's Legal list, the registration screen's
 *     consent sheet, the consent stamp sent to the backend) picks up the
 *     new text and the new version automatically.
 *   - getLegalDocVersion(id, version) can still retrieve any PRIOR version's
 *     exact text — e.g. to show a coach what they agreed to on a given
 *     date, or to audit an old consent row against the words behind it.
 * No component, no route, and no migration needs touching for a routine
 * content update — only for a change to the *shape* of a version entry
 * (e.g. adding a new section type) would consumers need updating too.
 *
 * Each version entry has: version, effectiveDate, sections[], and
 * optionally tldr[].
 * Section types: "p" (paragraph), "h3" (subheading), "ul" (bullet list → items[])
 *
 * tldr — string[]. When present, LegalDocBody renders it as a "Plain
 * English" summary card above the full sections. Coaches are volunteers
 * reading this on a phone between innings — the summary is not a
 * substitute for the real text below it, just a way in.
 */

export var LEGAL_DOCS = [
  {
    id: "privacy",
    title: "Privacy Policy",
    emoji: "🔒",
    summary: "What data we collect and how it's used",
    versions: [
      {
        version: "1.0",
        effectiveDate: "August 2026",
        sections: [
          {
            type: "p",
            text: "Dugout Lineup is a free tool for youth baseball and softball coaches. This policy explains how your data is handled."
          },
          { type: "h3", text: "What We Collect" },
          {
            type: "ul",
            items: [
              "Team and roster data you enter (names, positions, batting stats)",
              "Schedule and game result data you enter",
              "App usage analytics (Mixpanel) — includes your coach name, team name, and team ID, used to identify your activity across sessions. Does not include player names, roster contents, or schedule details."
            ]
          },
          { type: "h3", text: "Where It's Stored" },
          {
            type: "p",
            text: "Data is stored locally on your device first. If you're signed in, it syncs to Supabase (a US-based cloud database). Your roster and schedule data are never sold, shared with advertisers, or used for any purpose other than running the app."
          },
          { type: "h3", text: "Children's Privacy (COPPA)" },
          {
            type: "p",
            text: "Dugout Lineup is used by coaches — adult volunteers who manage youth teams. The app does not collect data directly from children. Player first names entered by a coach are stored as roster data; no other child information is collected. We do not knowingly collect personal information from anyone under 13."
          },
          { type: "h3", text: "Analytics" },
          {
            type: "p",
            text: "We use Mixpanel to track feature usage (e.g., how many times Auto-Assign is tapped) and to identify your account so we can see usage trends per coach and team. Analytics events and your Mixpanel profile include your coach name, team name, team ID, age group, roster size (a count, not names), and your role. They do not include player names, roster contents, schedule details, or game results. We also record basic device and app context (device type, operating system, screen size, whether the app is installed as a PWA, and app version) on every event. This helps us improve the app — it is not shared with advertisers."
          },
          { type: "h3", text: "Contact" },
          {
            type: "p",
            text: "Questions about privacy? Use the Feedback tab to reach us."
          }
        ]
      }
    ]
  },
  {
    id: "terms",
    title: "Terms of Service",
    emoji: "📋",
    summary: "The ground rules for using Dugout Lineup — plain English, not a legal maze",
    versions: [
      {
        // Historical — preserved verbatim as this app's actual original
        // Terms of Use, not reconstructed, so a consent row stamped "1.0"
        // can still be resolved to the exact words behind it via
        // getLegalDocVersion("terms", "1.0").
        version: "1.0",
        effectiveDate: "April 2026",
        sections: [
          {
            type: "p",
            text: "By using Dugout Lineup, you agree to these terms. The app is provided free of charge for personal, non-commercial use by coaches and team staff."
          },
          { type: "h3", text: "Acceptable Use" },
          {
            type: "ul",
            items: [
              "Use the app to manage your own team(s)",
              "Share lineups with parents, players, and scorekeepers",
              "Back up and restore your own team data"
            ]
          },
          { type: "h3", text: "Prohibited Use" },
          {
            type: "ul",
            items: [
              "Scraping, reverse engineering, or automated access to the app",
              "Entering false, harassing, or abusive content",
              "Using the app for commercial purposes without permission"
            ]
          },
          { type: "h3", text: "No Warranty" },
          {
            type: "p",
            text: "Dugout Lineup is provided 'as is.' We make no guarantees about uptime, data preservation, or fitness for any particular purpose. Always keep a backup of important roster data using the Download Backup feature."
          },
          { type: "h3", text: "Changes to Terms" },
          {
            type: "p",
            text: "We may update these terms as the app evolves. Continued use of the app after updates constitutes acceptance of the revised terms."
          },
          { type: "h3", text: "Known Platform Limitations" },
          {
            type: "p",
            text: "Android Screenshot Restriction — When Dugout Lineup is installed as a Progressive Web App (PWA) on Android devices, the operating system may prevent screenshots. This is an Android OS-level security policy applied to standalone PWA windows and is not controlled by Dugout Lineup. Screenshots work normally on iOS. Android users can use the Share Link feature to share lineup views."
          }
        ]
      },
      {
        version: "2.0",
        effectiveDate: "August 2026",
        tldr: [
          "Dugout Lineup is free for coaches to run their own team — rosters, lineups, schedules, and live scoring.",
          "You own what you enter. We store it to run the app for you — we never sell it or use it for ads.",
          "Share Links are public. Anyone with the link can view a lineup, no login required — don't share what you don't want public.",
          "Only first names or nicknames go into player data. No photos, contact info, or other details about kids.",
          "The app is provided as-is with no uptime guarantee. Keep your own backups with Download Backup."
        ],
        sections: [
          {
            type: "p",
            text: "These are the terms for using Dugout Lineup (\"the app,\" \"we,\" \"us\"). By opening the app, requesting access to a team, or checking the consent box on the access-request screen, you agree to them. If you're requesting access on behalf of a team you coordinate, you're agreeing on that team's behalf too."
          },
          { type: "h3", text: "What Dugout Lineup Is" },
          {
            type: "p",
            text: "Dugout Lineup helps youth baseball and softball coaches build rosters, auto-assign field positions, track batting order, run schedules, and score live games from the dugout. It's built and maintained by a volunteer, not a company selling a product — there's no ad revenue and nothing here is monetized off your team's data."
          },
          { type: "h3", text: "Getting Access" },
          {
            type: "p",
            text: "You can use most of the app fully offline with no account — team data stays on your device. Syncing across devices or restoring from the cloud requires an approved account, granted by request review (see the Access & Accounts document for how that works). Approving your request means we trust you to act as described below — it doesn't mean we've verified your identity or your role with your league."
          },
          { type: "h3", text: "If You're a Coach or Team Admin" },
          {
            type: "p",
            text: "If you manage a team's roster, schedule, or lineups, you're responsible for what you enter — its accuracy, who you share it with, and resolving any disagreement a parent or player has with you about it directly. We don't referee disputes between a coach and a family about roster decisions, playing time, or how a lineup was built; that's coaching, not something the app arbitrates."
          },
          { type: "h3", text: "Player & Family Data" },
          {
            type: "p",
            text: "Rosters in this app represent real kids. If you enter a player under 13, you're confirming you're their coach or have the authority a coach normally has to keep basic team records — Dugout Lineup does not independently verify parental consent. Keep entries to what a scorebook would hold (first name or nickname, position, batting stats) — see the Child Safety document for exactly what we do and don't collect about minors, and what to do if a parent asks you to remove their child's data."
          },
          { type: "h3", text: "Acceptable Use" },
          {
            type: "ul",
            items: [
              "Use the app to manage your own team(s) and the players on them",
              "Share lineups and schedules with parents, players, and scorekeepers",
              "Back up and restore your own team's data",
              "Give feedback, report bugs, or flag safety concerns through the Feedback tab"
            ]
          },
          { type: "h3", text: "Prohibited Use" },
          {
            type: "ul",
            items: [
              "Scraping, reverse engineering, or automated (bot) access to the app",
              "Entering false, harassing, derogatory, or abusive content about any player, coach, or family",
              "Using the app for commercial purposes, or reselling access, without our permission",
              "Attempting to access another team's data without that team's authorization",
              "Circumventing the access-approval process (e.g., impersonating a coach to gain admin access)"
            ]
          },
          { type: "h3", text: "The Content You Enter" },
          {
            type: "p",
            text: "You keep ownership of the rosters, schedules, notes, and other content you put into the app. What you grant us is narrow: a license to store, sync, and display that content back to you and to whoever you choose to share it with (like a Share Link recipient), solely to run the Service. We don't use your team's content for advertising, sell it, or license it to third parties — see the Privacy Policy for the full data picture, including analytics."
          },
          { type: "h3", text: "Share Links Are Public" },
          {
            type: "p",
            text: "The Share Link feature is intentionally login-free — that's how a parent on the sideline opens a lineup on their phone in two taps. That also means anyone with the link can view it, whether or not you meant for them to. Treat a Share Link like a public URL: don't post it somewhere you wouldn't want strangers to see it, and regenerate it if it's shared more widely than intended."
          },
          { type: "h3", text: "Service Availability & No Warranty" },
          {
            type: "p",
            text: "Dugout Lineup is provided \"as is,\" with no guarantee of uptime, error-free operation, or that any particular feature will keep working exactly as it does today. We are not a backup service — always keep your own copy of important roster data using the Download Backup feature. We'll do our best to prevent data loss, but you shouldn't rely on us as the only place your team's information lives."
          },
          { type: "h3", text: "Ending Your Access" },
          {
            type: "p",
            text: "You can stop using the app any time, and can request account and data deletion through the Feedback tab (see Access & Accounts for the 30-day timeline). We may suspend or remove access for accounts that violate these terms — most often for the Prohibited Use items above — and we'll try to tell you why."
          },
          { type: "h3", text: "Changes to These Terms" },
          {
            type: "p",
            text: "We may update these terms as the app grows. Small clarifications apply the moment they're posted here. If a change is material enough to matter to how you use the app, we'll add a new version above and ask you to re-confirm your consent the next time you sign in or request access — continuing to use the app after that point means you accept the update."
          },
          { type: "h3", text: "Known Platform Limitations" },
          {
            type: "p",
            text: "Android Screenshot Restriction — When Dugout Lineup is installed as a Progressive Web App (PWA) on Android devices, the operating system may prevent screenshots. This is an Android OS-level security policy applied to standalone PWA windows and is not controlled by Dugout Lineup. Screenshots work normally on iOS. Android users can use the Share Link feature to share lineup views instead."
          },
          { type: "h3", text: "Liability" },
          {
            type: "p",
            text: "To the extent the law allows, Dugout Lineup and the person who built it aren't liable for indirect, incidental, or consequential damages arising from your use of the app — including lost data, a missed game because a lineup didn't sync, or a dispute that started with something entered in the app. Nothing here limits liability where the law doesn't allow it to be limited."
          },
          { type: "h3", text: "Questions" },
          {
            type: "p",
            text: "Use the Feedback tab for anything about these terms — a question, a concern, or a request to delete your data. This is a volunteer-built app; we read every message."
          }
        ]
      }
    ]
  },
  {
    id: "safety",
    title: "Child Safety",
    emoji: "🛡️",
    summary: "How we protect minors who appear in the app",
    versions: [
      {
        version: "1.0",
        effectiveDate: "April 2026",
        sections: [
          {
            type: "p",
            text: "Dugout Lineup is designed to be used safely with youth sports teams. We take child safety seriously."
          },
          { type: "h3", text: "Coach-Only Access" },
          {
            type: "p",
            text: "The app is intended for coaches and authorized team staff. Children do not log in or create accounts. Parent/viewer access via shared lineup links shows lineup data only — no editing or roster access."
          },
          { type: "h3", text: "Minimal Data" },
          {
            type: "p",
            text: "Only first names (or nicknames chosen by the coach) are stored for each player. No photos, contact information, addresses, or school information are collected or stored."
          },
          { type: "h3", text: "No Direct Contact With Minors" },
          {
            type: "p",
            text: "Dugout Lineup does not communicate directly with players or children. All communication (shared links, notifications) goes through the coach."
          },
          { type: "h3", text: "Reporting Concerns" },
          {
            type: "p",
            text: "If you believe child safety has been compromised through use of this app, use the Report a Problem section to contact us immediately."
          }
        ]
      }
    ]
  },
  {
    id: "content",
    title: "Content Standards",
    emoji: "📝",
    summary: "Guidelines for content entered into the app",
    versions: [
      {
        version: "1.0",
        effectiveDate: "April 2026",
        sections: [
          {
            type: "p",
            text: "Coaches are responsible for the content they enter into Dugout Lineup. By using the app, you agree to these content guidelines."
          },
          { type: "h3", text: "Appropriate Content" },
          {
            type: "ul",
            items: [
              "Player names should be names or nicknames the player and family are comfortable with",
              "Coach notes and tags should be factual and constructive (e.g., fielding attributes, position preferences)",
              "Walk-up song links should be age-appropriate for a youth sports setting",
              "Schedule notes and game result comments should be respectful"
            ]
          },
          { type: "h3", text: "Prohibited Content" },
          {
            type: "ul",
            items: [
              "Derogatory, demeaning, or offensive language about any player",
              "Discriminatory content based on race, gender, disability, or any other characteristic",
              "Inappropriate or adult-only media linked from the app"
            ]
          },
          { type: "h3", text: "Enforcement" },
          {
            type: "p",
            text: "We do not actively moderate content entered by coaches. However, accounts found to be in violation of these standards may be suspended. Use the Report a Problem section to flag concerns."
          }
        ]
      }
    ]
  },
  {
    id: "access",
    title: "Access & Accounts",
    emoji: "🔑",
    summary: "How coach accounts and access requests work",
    versions: [
      {
        version: "1.0",
        effectiveDate: "April 2026",
        sections: [
          {
            type: "p",
            text: "Dugout Lineup is currently available to approved coaches. Here's how access works."
          },
          { type: "h3", text: "No Account Required (Offline Mode)" },
          {
            type: "p",
            text: "You can use the app fully offline without an account. Team data is saved to your device. No sign-in is needed to build rosters, generate lineups, or share links."
          },
          { type: "h3", text: "Cloud Sync" },
          {
            type: "p",
            text: "To sync data across devices or restore from the cloud, you'll need an approved account. Accounts use email magic link or Google sign-in — no passwords required. Request access by tapping \"Find your team…\" on the Home tab, searching for your team, and submitting a request with your role."
          },
          { type: "h3", text: "Account Approval" },
          {
            type: "p",
            text: "Access requests are reviewed manually. Approved coaches receive an email with a magic link to sign in, or can use Google sign-in. Once approved, cloud sync is enabled."
          },
          { type: "h3", text: "Account Removal" },
          {
            type: "p",
            text: "To remove your account and data, use the Feedback form or Report a Problem and request account deletion. We will delete your cloud data within 30 days."
          }
        ]
      }
    ]
  },
  {
    id: "report",
    title: "Report a Problem",
    emoji: "🚩",
    summary: "How to flag issues, bugs, or safety concerns",
    versions: [
      {
        version: "1.0",
        effectiveDate: "April 2026",
        sections: [
          {
            type: "p",
            text: "We want to hear about problems. Here's how to reach us depending on the type of issue."
          },
          { type: "h3", text: "App Bugs or Feature Requests" },
          {
            type: "p",
            text: "Use the Feedback tab in the Support section. Describe what happened and what you expected. Screenshots help — describe what you see on screen."
          },
          { type: "h3", text: "Data Loss or Sync Issues" },
          {
            type: "p",
            text: "Use the Feedback tab and select 'Bug Report.' Include your team name and approximate date of the incident. We can attempt recovery from database snapshots in some cases."
          },
          { type: "h3", text: "Safety or Abuse Concerns" },
          {
            type: "p",
            text: "For child safety concerns, inappropriate use, or account abuse, use the Feedback tab and mark it as urgent. We review safety reports promptly."
          },
          { type: "h3", text: "Account or Privacy Requests" },
          {
            type: "p",
            text: "To request account deletion, data export, or have a privacy question answered, use the Feedback tab."
          },
          { type: "h3", text: "Response Time" },
          {
            type: "p",
            text: "This is a volunteer-built app. We aim to respond to all reports within 72 hours, and to safety reports as quickly as possible."
          }
        ]
      }
    ]
  }
];

function flattenDocVersion(doc, versionEntry) {
  if (!doc || !versionEntry) return null;
  return {
    id: doc.id,
    title: doc.title,
    emoji: doc.emoji,
    summary: doc.summary,
    version: versionEntry.version,
    effectiveDate: versionEntry.effectiveDate,
    tldr: versionEntry.tldr,
    sections: versionEntry.sections,
  };
}

/**
 * getLegalDoc(id) — the current (latest) version of a document, flattened
 * to the shape LegalDocBody/LegalDocSheet/LegalSection render: {id, title,
 * emoji, summary, version, effectiveDate, tldr, sections}. Returns null for
 * an unknown id.
 */
export function getLegalDoc(id) {
  var doc = LEGAL_DOCS.find(function(d) { return d.id === id; });
  if (!doc || !doc.versions || !doc.versions.length) return null;
  return flattenDocVersion(doc, doc.versions[doc.versions.length - 1]);
}

/**
 * getLegalDocVersion(id, version) — a SPECIFIC historical version of a
 * document, same flattened shape as getLegalDoc(). Use this to resolve a
 * legal_consents row's (doc_id, version) back to the exact text a coach
 * agreed to. Returns null if the id or version doesn't exist.
 */
export function getLegalDocVersion(id, version) {
  var doc = LEGAL_DOCS.find(function(d) { return d.id === id; });
  if (!doc) return null;
  var entry = (doc.versions || []).find(function(v) { return v.version === version; });
  return flattenDocVersion(doc, entry);
}

/**
 * getCurrentLegalVersion(id) — just the current version string for a
 * document (e.g. "2.0"), the value stamped onto a consent record. Returns
 * null for an unknown id.
 */
export function getCurrentLegalVersion(id) {
  var doc = LEGAL_DOCS.find(function(d) { return d.id === id; });
  if (!doc || !doc.versions || !doc.versions.length) return null;
  return doc.versions[doc.versions.length - 1].version;
}
