import { Card } from '../ui/Card';
import { tokens } from '../../theme/tokens';
import { outboundLinkProps, CAMPAIGNS, CONTENT } from '../../utils/trackingUrl';

export const SUPPORT_LINKS = Object.freeze([
  { group: 'Schedule & Registration', items: [
    { label: 'County Official Game Schedule', desc: 'Forsyth County 2026 Youth Baseball & Softball — full season schedule', url: 'https://forsythcounty.kaizendemos.app/schedule/2026-youth-baseball-and-softball-mmt6617n', emoji: '📅', campaign: CAMPAIGNS.COUNTY_LEAGUE, content: CONTENT.SCHEDULE_TAB },
    { label: 'Report Game Score', desc: 'Submit the final score after a completed game — must be done within 24 hours', url: 'https://forms.office.com/pages/responsepage.aspx?id=vf3EubbvekefszJiSiLNcOoWxPqaa4FBtgle0rAQ6bBURVExSDNDNEFTTkRaMVlRR0lNUDVGOUtFVy4u&route=shorturl', emoji: '📝', campaign: CAMPAIGNS.COUNTY_LEAGUE, content: CONTENT.GAME_INFO_CARD },
    { label: 'Field & Cage Request', desc: 'Request field or batting cage time from Forsyth County Parks', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeCIvqZlGsxonkWpFJ52q_6PWrOl3mmOTjTdiPGcz3ZQGzJDQ/viewform', emoji: '⚾', campaign: CAMPAIGNS.COUNTY_LEAGUE, content: CONTENT.GAME_INFO_CARD },
  ] },
  { group: 'League & Club', items: [
    { label: 'Sharon Springs Athletics', desc: 'Sharon Springs community athletics — league info, teams, and events', url: 'https://sharonspringsathletics.org/', emoji: '🏆', campaign: CAMPAIGNS.SHARON_SPRINGS, content: CONTENT.STANDINGS_LINK },
  ] },
  { group: 'Weather & Alerts', items: [
    { label: 'Inclement Weather Updates', desc: 'Forsyth County Parks — field closures and weather delays', url: 'https://parks.forsythco.com/Athletic-Leagues/Inclement-Weather-Information', emoji: '⛈️', campaign: CAMPAIGNS.GENERAL, content: CONTENT.SCHEDULE_TAB },
    { label: 'Status Me Auto Alerts', desc: 'Sign up for automatic game status notifications', url: 'https://statusme.com/', emoji: '🔔', campaign: CAMPAIGNS.GENERAL, content: CONTENT.SCHEDULE_TAB },
  ] },
]);

export function LinksTab({ sectionTitleStyle }) {
  return <div>{SUPPORT_LINKS.map(function(section) {
    return (
      <Card key={section.group} padding="16px 18px" radius="md" style={{ border:'1px solid ' + tokens.color.border.neutral, boxShadow:tokens.shadow.subtleCard, marginBottom:'14px' }}>
        <div style={sectionTitleStyle}>{section.group}</div>
        {section.items.map(function(link, li) {
          return (
            <a key={link.label} {...outboundLinkProps(link.url, { campaign:link.campaign, content:link.content })}
              style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 0', borderBottom:li < section.items.length - 1 ? '1px solid rgba(15,31,61,0.07)' : 'none', textDecoration:'none', cursor:'pointer' }}>
              <span style={{ fontSize:'22px', lineHeight:'1', marginTop:'2px', flexShrink:0 }}>{link.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:'700', color:tokens.color.brand.navy, marginBottom:'3px' }}>{link.label}</div>
                <div style={{ fontSize:'11px', color:tokens.color.text.muted, lineHeight:'1.5', marginBottom:'5px' }}>{link.desc}</div>
              </div>
            </a>
          );
        })}
      </Card>
    );
  })}</div>;
}
