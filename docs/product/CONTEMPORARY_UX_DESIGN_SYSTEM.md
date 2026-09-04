# Contemporary Dugout UX Design System

Status: foundation in progress under initiative #1052. This document defines the approved target and migration governance; it is not permission to promote changes.

## Product intent

Dugout Lineup should feel contemporary, friendly, and unmistakably connected to youth baseball while remaining calm enough for prolonged sideline use. A coach must be able to identify the primary action, supporting actions, status, and current location without decoding decorative color.

## Brand invariants

The following remain unchanged unless KK separately approves a brand project:

- Dark navy application header and bottom navigation
- Full-color Dugout Lineup brand icon
- Gold Dugout Lineup wordmark
- Gold active-navigation treatment
- Meaningful field-position and live-scoring colors where hue communicates real state

## Visual direction

- Primary actions: flat brand gold, navy text, optional navy icon badge
- Secondary actions: warm-white surface, quiet navy-gray border, navy text, semantic icon, trailing chevron where navigation follows
- Overflow actions: circular neutral icon control
- Success/readiness: pale sage surface with dark sage text
- Attention/information: pale gold surface with dark neutral text
- Destructive/error: red is reserved for destructive actions and genuine errors
- Shape: 12-14px card/control geometry with restrained elevation
- Personality: small baseball details and friendly icons, never gradients, neon, glow, emoji, or decorative red panels

## Typography

Typography uses two intentional families with no external font request:

- Georgia serif: brand/display roles and selected titles
- System sans: body copy, controls, metadata, tables, and dense operational information

| Role | Family | Use |
|---|---|---|
| Display | Serif | Splash moments and rare hero values |
| Page title | Serif | Screen identity |
| Section title | Sans | Scannable section labels |
| Card title | Serif | Team, game, and event card titles |
| Body | Sans | Explanations and primary reading |
| Label | Sans | Form, status, and compact row labels |
| Caption | Sans | Metadata and secondary context |
| Button | Sans | All shared action labels |

Explicit `Text` props remain supported during migration, but migrated surfaces should prefer semantic `variant` roles. New arbitrary font-family declarations are prohibited in migrated surfaces.

## Icon contract

Consumers request semantic names through the shared `Icon` component rather than importing package-specific glyphs. Lucide is the primary family; Game Icons is allowed only for deliberate baseball-specific concepts.

- Decorative icons omit an accessible role and are hidden from assistive technology.
- Meaningful standalone icons require a label.
- Icons inside labeled buttons remain decorative unless they add meaning not present in the label.

### Semantic catalog and migration map

The catalog is app-owned in `components/ui/Icon.jsx`. Consumer code requests
intent (`gameDay`, `lineup`, `success`, `music`) rather than a package glyph.
The Dugout Lineup `BrandMark` remains a separate full-color asset and must not
enter this registry.

| Migration wave | Semantic names | Replace incrementally |
|---|---|---|
| Navigation and team | `home`, `team`, `player`, `roster`, `settings`, `support` | Bottom navigation and team-management emoji as each screen migrates |
| Schedule and Game Day | `calendar`, `gameDay`, `lineup`, `baseball`, `glove`, `music` | Schedule, lineup, batting, fielding, and songs controls |
| Actions | `add`, `edit`, `delete`, `close`, `share`, `download`, `upload`, `search`, `overflow`, `back`, `chevronRight`, `externalLink` | Ad-hoc emoji and direct icon imports when their owning component migrates |
| Status and visibility | `success`, `attention`, `info`, `view`, `lock`, `unlock` | Status marks, read-only cues, and lock-flow controls |

Direct imports and legacy emoji outside migrated contemporary components are
tracked replacement candidates, not violations requiring a wholesale rewrite.
- Color inherits from the parent by default.
- Supported sizes are small (16), medium (20), and large (24).
- The full-color Dugout Lineup brand icon is not part of this registry.

Initial semantic catalog: home, team, calendar, Game Day, support, add, player, lineup, roster, settings, share, back, chevron-right, overflow, success, attention, baseball, and glove.

## Implemented foundation contracts

- Content (#1074): immutable navigation, Home, action, and status vocabulary plus permission-aware action verbs.
- Actions/status (#1075): additive Button icon/loading support, outlined secondary actions, ActionRow, IconAction, StatusPill, SegmentedControl, and SearchField.
- Compositions (#1076): PageHeader, SectionHeader, readiness strip, and callback-driven event, player, help, and general workflow rows.
- Home pilot (#1077): API-driven Team Hub consumes the shared filter, team-row, status, readiness, typography, icon, and action contracts behind the existing default-off `API_DRIVEN_HOME` flag.
- My Team Wave A (#1086/#1087): roster search/status rows plus individual and all-player profile shells consume the shared contracts behind the independently default-off `UX_MY_TEAM` flag. Existing editor state and persistence remain owned by App while the new screen components own presentation.

Legacy Home and My Team remain available whenever their independent flags are off. All later screens retain their current rendering until their own migration slices are reviewed and approved.

## Reusable component hierarchy

1. Tokens: color, typography, space, radius, border, shadow, motion
2. Primitives: Text, Icon, Button, Badge/Pill, Card, Stack
3. Patterns: PrimaryAction, SecondaryAction, IconAction, ActionRow, StatusPill, SegmentedControl, SearchField
4. Compositions: TeamCard, EventCard, PlayerRow, HelpRow, readiness strip
5. Screens: assemble compositions; do not mint screen-local visual systems

## Content rules

- Use one clear verb: View, Manage, Edit, Add, Start, Open, or Share.
- Match permission: read-only roles see View; authorized roles see Manage or Edit.
- Keep team-aware labels generated by formatters rather than duplicated strings.
- Keep legal and FAQ long-form content in their dedicated modules.
- Accessible names describe outcomes, not icon appearance.

## Migration waves

1. API-driven Home pilot behind the existing flag
2. My Team and player profiles — merged to `develop` behind `UX_MY_TEAM`
3. Schedule and event details — merged to `develop` behind `UX_SCHEDULE`
4. Game Day entry and lineup management — Wave C1 entry/readiness and Wave C2 Defense controls implemented behind `UX_GAMEDAY_SETUP`; Batting and Songs remain independently sequenced
5. Support and remaining utility tabs
6. Auth/access and system states
7. Live Game Mode and scoring after the lighter surfaces prove the system

The generated baseline report owns the detailed screen/state matrix.

## Required gates

- Test-first RED-to-GREEN evidence for new contracts
- WCAG AA contrast, visible keyboard focus, and 44px touch targets
- 375px, 393px, landscape, and installed-PWA review
- Long labels, dynamic team names, loading, empty, error, offline, disabled, and role-restricted states
- Targeted tests, full frontend tests, lint, and build
- Browser verification before requesting any push authorization
- Full Game Day Validation for Game Day/scoring changes
- Locked-file approval rules remain in force

## Coordination

- Initiative #1052 owns the visual direction and migration sequence.
- Phase 0 owns baseline/governance; Phase 1 owns typography; Phase 2 owns icons; #1074-#1077 own content through the first screen pilot.
- Story 132/#697 is reconciled during Phase 0 rather than creating a parallel design-system documentation track.
- API-driven screen work supplies reversible flag boundaries; this initiative does not alter API ownership or routing contracts.
- App.jsx decomposition should absorb legacy call-site migrations instead of duplicating extraction work.
