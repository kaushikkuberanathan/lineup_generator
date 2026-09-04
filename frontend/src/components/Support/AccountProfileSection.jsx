import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { tokens } from '../../theme/tokens';
import { AccountNameField } from '../Account/AccountNameField';

/**
 * AccountProfileSection
 * Support → More landing → "Profile name" row. Thin wrapper around the
 * pre-existing AccountNameField (#405/#407) — that component keeps owning
 * all of its own state; this just gives it its own destination screen per
 * Issue #1099's 3-group regroup, instead of sharing a Card with the team
 * list and Sign out button the way the old renderAccount() did.
 *
 * Props:
 *   updateProfileName  fn     — useAuth's PATCH /me
 *   initialFirstName   string — prefill (user.profile.first_name)
 *   initialLastName    string — prefill (user.profile.last_name)
 *   S                  object — legacy style helpers AccountNameField needs (S.input, S.btn)
 */
export function AccountProfileSection({ updateProfileName, initialFirstName, initialLastName, S, contemporary = false }) {
  return (
    <div style={{ padding: "14px 16px 24px" }}>
      <Card padding="16px 18px" radius="md" style={{ border: "1px solid " + tokens.color.border.default }}>
        <Text
          size="xs"
          color="tertiary"
          uppercase
          style={{ display: "block", letterSpacing: tokens.font.letterSpacing.wider, marginBottom: "12px" }}
        >
          Profile name
        </Text>
        <AccountNameField
          updateProfileName={updateProfileName}
          initialFirstName={initialFirstName}
          initialLastName={initialLastName}
          S={S}
          contemporary={contemporary}
        />
      </Card>
    </div>
  );
}
