import { Card } from '../ui/Card';
import { ListRow } from '../ui/ListRow';
import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';
import { Icon } from '../ui/Icon';
import { tokens } from '../../theme/tokens';
import { HELP_ARTICLES, HELP_CATEGORY_META } from '../../content/faqs';
import { compareTeamsNewestFirst } from '../../utils/season.js';

/**
 * MoreLanding
 * Support tab landing view — Issue #1099 / Story 341. Replaces the flat
 * MORE_SUBTABS pill bar (Account/Help/Feedback/Links/About/Updates/Legal)
 * with 3 labeled card-groups of chevron rows, each row navigating into the
 * exact same detail screens App.jsx already rendered (FAQSection,
 * LegalSection, LinksTab, UpdatesTab, feedback, plus the two new Account
 * sub-screens) — no detail-screen internals changed by this component.
 *
 * Props:
 *   onNavigate(key) fn — pushes a moreTab detail screen
 *   onSignOut       fn — direct action, no navigation (matches the prior
 *                        single-tap "Sign out" button — no confirm step)
 *   memberships     array — session's team_memberships rows
 *   teams           array — full team list, for name/season lookups
 *   user            object — session user, for user.profile.first_name/last_name
 *   appVersion      string — APP_VERSION, shown as a badge on "What's New"
 */
export function MoreLanding({ onNavigate, onSignOut, memberships, teams, user, appVersion, supportEnabled = false, accountEnabled = false }) {
  var _memberships = memberships || [];
  var sortedMemberships = _memberships.slice().sort(function(ma, mb) {
    var ta = teams.find(function(t) { return t.id === ma.team_id; });
    var tb = teams.find(function(t) { return t.id === mb.team_id; });
    return compareTeamsNewestFirst(ta, tb);
  });
  var newestMembership = sortedMemberships[0];
  var newestTeam = newestMembership ? teams.find(function(t) { return t.id === newestMembership.team_id; }) : null;
  var teamsSubtitle = _memberships.length === 0
    ? "Not on any team yet"
    : newestTeam
      ? newestTeam.name + (_memberships.length > 1 ? " +" + (_memberships.length - 1) + " more" : "")
      : _memberships.length + " team" + (_memberships.length === 1 ? "" : "s");

  var fullName = user && user.profile
    ? [user.profile.first_name, user.profile.last_name].filter(Boolean).join(" ")
    : "";
  var profileSubtitle = fullName || "Add your name";

  var helpSubtitle = HELP_ARTICLES.length + " articles · " + HELP_CATEGORY_META.length + " topics";

  function groupLabel(text) {
    return (
      <div style={{ padding: "12px 16px 8px" }}>
        <Text
          size="xs"
          weight="bold"
          style={{
            display: "block",
            letterSpacing: tokens.font.letterSpacing.wider,
            textTransform: "uppercase",
            color: tokens.color.text.tertiary,
          }}
        >
          {text}
        </Text>
      </div>
    );
  }

  function row(opts) {
    return (
      <ListRow key={opts.key} onClick={opts.onClick} showDivider={!opts.last}>
        <Stack direction="row" justify="between" align="center" gap="md" style={{ flex: 1 }}>
          {opts.icon ? (
            <span style={{
              width: '36px', height: '36px', borderRadius: tokens.radius.md,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: opts.iconTone === 'account' ? '#F5F1E8' : '#EEF5F3',
              color: tokens.color.brand.navy, flexShrink: 0,
            }}><Icon name={opts.icon} size="sm" /></span>
          ) : null}
          <Stack direction="col" gap="xs" style={{ minWidth: 0 }}>
            <Text
              size="md"
              weight="semibold"
              family="serif"
              color={opts.danger ? undefined : "navy"}
              style={{
                lineHeight: tokens.font.lineHeight.body,
                color: opts.danger ? tokens.color.brand.red : undefined,
              }}
            >
              {opts.title}
            </Text>
            {opts.subtitle ? (
              <Text size="xs" color="tertiary">{opts.subtitle}</Text>
            ) : null}
          </Stack>
          {opts.trailing}
          {!opts.danger ? (
            <span aria-hidden="true" style={{
              fontSize: tokens.font.size.lg,
              color: tokens.color.text.tertiary,
              flexShrink: 0,
            }}>›</span>
          ) : null}
        </Stack>
      </ListRow>
    );
  }

  function group(rows) {
    return (
      <div style={{ padding: "0 16px 16px" }}>
        <Card padding="0" radius="md" style={{ border: "1px solid " + tokens.color.border.default, overflow: "hidden" }}>
          {rows}
        </Card>
      </div>
    );
  }

  var contemporary = supportEnabled || accountEnabled;

  return (
    <div style={{
      paddingBottom: "84px",
      background: contemporary ? tokens.color.surface.cream : undefined,
      borderRadius: contemporary ? tokens.radius.lg + ' ' + tokens.radius.lg + ' 0 0' : undefined,
      minHeight: contemporary ? 'calc(100svh - 128px)' : undefined,
    }}>
      {accountEnabled ? (
        <div style={{ padding: '16px 16px 4px' }}>
          <Text as="h1" variant="pageTitle" style={{ margin: 0 }}>Your dugout</Text>
          <Text as="p" size="sm" color="secondary" style={{ margin: '4px 0 0' }}>Teams, profile, and the essentials behind your season.</Text>
        </div>
      ) : null}
      {groupLabel("Account")}
      {group([
        row({ key: "teams", title: "Your teams", subtitle: teamsSubtitle, icon: accountEnabled ? 'team' : null, iconTone: 'account', onClick: function() { onNavigate("account-teams"); } }),
        row({ key: "profile", title: "Profile name", subtitle: profileSubtitle, icon: accountEnabled ? 'player' : null, iconTone: 'account', onClick: function() { onNavigate("account-profile"); } }),
        row({ key: "signout", title: "Sign out", danger: true, last: true, onClick: onSignOut }),
      ])}

      {groupLabel("Get Help")}
      {group([
        row({ key: "help", title: "Help — Search & FAQs", subtitle: helpSubtitle, icon: supportEnabled ? 'support' : null, last: true, onClick: function() { onNavigate("faq"); } }),
      ])}

      {groupLabel("About & Legal")}
      {group([
        row({ key: "about", title: "About", icon: supportEnabled ? 'info' : null, onClick: function() { onNavigate("about"); } }),
        row({
          key: "updates",
          title: "What's New",
          icon: supportEnabled ? 'success' : null,
          onClick: function() { onNavigate("updates"); },
          trailing: appVersion ? (
            <span style={{
              fontSize: tokens.font.size.xs,
              fontWeight: tokens.font.weight.bold,
              padding: "2px 8px",
              borderRadius: tokens.radius.pill,
              background: tokens.color.surface.page,
              color: tokens.color.text.secondary,
              flexShrink: 0,
            }}>{"v" + appVersion}</span>
          ) : null,
        }),
        row({ key: "legal", title: "Terms & Privacy", icon: supportEnabled ? 'lock' : null, onClick: function() { onNavigate("legal"); } }),
        row({ key: "links", title: "Links", icon: supportEnabled ? 'externalLink' : null, onClick: function() { onNavigate("links"); } }),
        row({ key: "feedback", title: "Feedback", icon: supportEnabled ? 'edit' : null, last: true, onClick: function() { onNavigate("feedback"); } }),
      ])}
    </div>
  );
}
