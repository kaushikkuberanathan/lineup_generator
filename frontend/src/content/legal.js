/**
 * legal.js
 * Static legal document content for the Support → Legal section.
 * Each doc has: id, title, lastUpdated, and sections[].
 * Section types: "p" (paragraph), "h3" (subheading), "ul" (bullet list → items[])
 */

export var LEGAL_DOCS = [
  {
    id: "privacy",
    title: "Privacy Policy",
    emoji: "🔒",
    summary: "What data we collect and how it's used",
    lastUpdated: "April 2026",
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
          "App usage analytics (Mixpanel) — anonymous, no personally identifiable information"
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
        text: "We use Mixpanel to track anonymous feature usage (e.g., how many times Auto-Assign is tapped). This helps us improve the app. No names, team data, or roster contents are included in analytics events."
      },
      { type: "h3", text: "Contact" },
      {
        type: "p",
        text: "Questions about privacy? Use the Feedback tab to reach us."
      }
    ]
  },
  {
    id: "terms",
    title: "Terms of Use",
    emoji: "📋",
    summary: "Your rights and responsibilities when using the app",
    lastUpdated: "April 2026",
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
      }
    ]
  },
  {
    id: "safety",
    title: "Child Safety",
    emoji: "🛡️",
    summary: "How we protect minors who appear in the app",
    lastUpdated: "April 2026",
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
  },
  {
    id: "content",
    title: "Content Standards",
    emoji: "📝",
    summary: "Guidelines for content entered into the app",
    lastUpdated: "April 2026",
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
  },
  {
    id: "access",
    title: "Access & Accounts",
    emoji: "🔑",
    summary: "How coach accounts and access requests work",
    lastUpdated: "April 2026",
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
      { type: "h3", text: "Cloud Sync (Beta)" },
      {
        type: "p",
        text: "To sync data across devices or restore from the cloud, you'll need an approved account. Accounts use email magic link or Google sign-in — no passwords required. Request access using the Feedback form."
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
  },
  {
    id: "report",
    title: "Report a Problem",
    emoji: "🚩",
    summary: "How to flag issues, bugs, or safety concerns",
    lastUpdated: "April 2026",
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
];
