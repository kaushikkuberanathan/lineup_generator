import { getLegalDoc } from "../../content/legal";
import { LegalDocBody } from "./LegalDocBody";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Text } from "../ui/Text";
import { Stack } from "../ui/Stack";
import { tokens } from "../../theme/tokens";

/**
 * LegalDocSheet
 * The "deep link" surface: a BottomSheet that renders one LEGAL_DOCS entry
 * in place, without navigating away from the screen underneath it.
 *
 * Built for RequestAccessScreen's consent checkbox — a coach mid-registration
 * shouldn't lose their half-filled form to read the Terms of Service. Tapping
 * "Terms of Service" opens this over the form; closing it returns to exactly
 * where they were.
 *
 * It renders from the same content/legal.js + LegalDocBody pipeline as the
 * Account tab's Legal section, so this is never a second, driftable copy of
 * the text — see LegalDocBody.jsx's header comment.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - docId: string          LEGAL_DOCS id to show, e.g. "terms" or "privacy"
 */
export function LegalDocSheet({ open, onClose, docId }) {
  var doc = getLegalDoc(docId);
  if (!doc) return null;

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel={doc.title} maxHeight="85vh">
      <Stack direction="row" align="center" justify="between" style={{ marginBottom: tokens.space.md }}>
        <Text size="lg" weight="bold" color="navy" family="serif" style={{ display: "block" }}>
          {doc.emoji} {doc.title}
        </Text>
        <Button variant="ghost" size="sm" onClick={onClose} style={{ border: "none" }}>
          Close
        </Button>
      </Stack>
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        <LegalDocBody doc={doc} />
      </div>
    </BottomSheet>
  );
}
