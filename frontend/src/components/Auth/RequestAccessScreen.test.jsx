import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ============================================================================
// Story B (frontend) — role picker vocabulary fix. Prior ROLE_OPTIONS had
// only 3 entries and two mismapped values (Head Coach -> 'admin' instead of
// 'team_admin', Coordinator -> 'coach' instead of 'coordinator'). Zero prior
// coverage existed for this component.
// ============================================================================

vi.mock('@/utils/analytics', () => ({ track: vi.fn() }));
vi.mock('../../utils/legalConsent', () => ({ logLegalConsent: vi.fn().mockResolvedValue({ success: true }) }));

import { RequestAccessScreen } from './RequestAccessScreen';
import { getLegalDoc } from '../../content/legal';
import { logLegalConsent } from '../../utils/legalConsent';

var TERMS_DOC = getLegalDoc('terms');
var PRIVACY_DOC = getLegalDoc('privacy');

function baseProps(overrides) {
  return Object.assign(
    { onBack: vi.fn(), requestAccess: vi.fn().mockResolvedValue({ success: true }) },
    overrides
  );
}

// Consent is now a required field alongside name/email — see the "Terms of
// Service consent" describe block below for dedicated coverage of the gate
// itself. Every other test in this file exercises unrelated behavior and
// just needs the form submittable, so the shared fill helper checks the box.
function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText('Jane'), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByPlaceholderText('Smith'), { target: { value: 'Smith' } });
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'jane@example.com' } });
  fireEvent.click(screen.getByLabelText(/i agree to the/i));
}

describe('RequestAccessScreen — role picker', function () {

  test('renders all 5 role options', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    var select = screen.getByLabelText(/your role/i);
    var labels = Array.from(select.options).map(function (o) { return o.textContent; });
    expect(labels).toEqual(['Head Coach', 'Assistant Coach', 'Team Coordinator', 'Scorekeeper', 'Parent / Family']);
  });

  test('Head Coach shows the manual-review note; other roles do not', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    var select = screen.getByLabelText(/your role/i);

    fireEvent.change(select, { target: { value: 'head_coach' } });
    expect(screen.getByText(/requires manual review before approval/i)).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'assistant_coach' } });
    expect(screen.queryByText(/requires manual review before approval/i)).not.toBeInTheDocument();
  });

  test.each([
    ['head_coach', 'team_admin'],
    ['assistant_coach', 'coach'],
    ['coordinator', 'coordinator'],
    ['scorekeeper', 'scorekeeper'],
    ['parent', 'viewer'],
  ])('selecting %s submits stored value %s, not the display label', async function (roleId, storedValue) {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess })} />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/your role/i), { target: { value: roleId } });
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });
    expect(requestAccess.mock.calls[0][0].role).toBe(storedValue);
  });
});

// ============================================================================
// Story 124 (#655) — Home tab "add a second team" flow. RequestAccessScreen
// is reused for this flow via three additive props (all default to prior
// behavior — no existing call site passes any of them).
// ============================================================================
describe('RequestAccessScreen — additive props for the Home tab discovery flow', function () {

  var TEAM = { id: '999', name: 'Bananas', age_group: '9U', sport: 'baseball', year: 2026 };

  test('default (no preselectedTeam): still shows the editable Team ID input', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    expect(screen.getByText(/team id/i)).toBeInTheDocument();
    expect(screen.queryByText('Bananas')).not.toBeInTheDocument();
  });

  test('preselectedTeam: shows a read-only team confirmation, not the editable Team ID input', function () {
    render(<RequestAccessScreen {...baseProps({ preselectedTeam: TEAM })} />);
    expect(screen.getByText('Bananas')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('1774297491626')).not.toBeInTheDocument();
  });

  test('preselectedTeam: submitting sends the preselected team id as tid, without requiring manual entry', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess, preselectedTeam: TEAM })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });
    expect(requestAccess.mock.calls[0][0].tid).toBe('999');
  });

  test('preserveSession defaults to false when omitted', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });
    expect(requestAccess.mock.calls[0][1]).toEqual({ preserveSession: false });
  });

  test('preserveSession:true is forwarded to requestAccess as the second argument', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess, preserveSession: true })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });
    expect(requestAccess.mock.calls[0][1]).toEqual({ preserveSession: true });
  });

  // Added 2026-08-26 (#406/#410 test-health survey; the ask itself predates
  // the survey — Story 126/#665, v2.10.0 — logged as debt in DOC_TEST_DEBT.md
  // under "#664" but distinct from that issue's own 5-item list, which is why
  // it landed here rather than there).
  test('preserveSession:true — after a successful submit, shows the inline confirmation card instead of the form', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess, preserveSession: true, preselectedTeam: TEAM })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(screen.getByRole('heading', { name: 'Request Sent' })).toBeInTheDocument();
    });
    expect(screen.getByText(TEAM.name + ' · Pending approval')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request access/i })).not.toBeInTheDocument();
  });

  test('preserveSession:true — a FAILED submit shows the form\'s error state, not the confirmation card', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: false, error: 'already_approved' });
    render(<RequestAccessScreen {...baseProps({ requestAccess, preserveSession: true, preselectedTeam: TEAM })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(screen.getByText(/already has access/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Request Sent' })).not.toBeInTheDocument();
  });

  test('preserveSession:false (default) — a successful submit does NOT show the confirmation card (App.jsx routes to PendingApprovalScreen instead)', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('heading', { name: 'Request Sent' })).not.toBeInTheDocument();
  });

  test('backLabel defaults to "← Back to login"; a custom value overrides it', function () {
    var { unmount } = render(<RequestAccessScreen {...baseProps()} />);
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    unmount();

    render(<RequestAccessScreen {...baseProps({ backLabel: '← Back to search' })} />);
    expect(screen.getByRole('button', { name: /back to search/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back to login/i })).not.toBeInTheDocument();
  });
});

// ============================================================================
// Terms of Service consent — new coverage. A coach cannot submit an access
// request without checking "I agree to the Terms of Service and Privacy
// Policy" first. The checkbox links deep-link into the exact same
// content/legal.js text the Account tab's Legal section shows (via the
// shared LegalDocBody renderer) — no second copy of the text exists.
// ============================================================================
describe('RequestAccessScreen — Terms of Service consent', function () {

  beforeEach(function () {
    logLegalConsent.mockClear();
  });

  function fillNameAndEmailOnly() {
    fireEvent.change(screen.getByPlaceholderText('Jane'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByPlaceholderText('Smith'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'jane@example.com' } });
  }

  test('submit is disabled until the consent checkbox is checked', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    fillNameAndEmailOnly();

    expect(screen.getByRole('button', { name: /request access/i })).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/i agree to the/i));
    expect(screen.getByRole('button', { name: /request access/i })).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText(/i agree to the/i));
    expect(screen.getByRole('button', { name: /request access/i })).toBeDisabled();
  });

  // A `disabled` button whose background/text color are set via inline
  // style (as this one's are) shows NO visual difference from enabled in
  // most browsers — disabled:not() UA styles don't override an explicit
  // inline background-color. Caught live on the dev deployment: the CTA
  // looked identical, and thus looked broken/clickable, before consent was
  // given. This locks in that the disabled and enabled states are actually
  // visually distinct, not just functionally gated.
  test('the disabled (unconsented) submit button is visually distinct from its enabled state, not just functionally inert', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    fillNameAndEmailOnly();

    var button = screen.getByRole('button', { name: /request access/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    var disabledBackground = button.style.backgroundColor;
    var disabledCursor = button.style.cursor;

    fireEvent.click(screen.getByLabelText(/i agree to the/i));
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'false');
    expect(button.style.backgroundColor).not.toBe(disabledBackground);
    expect(button.style.cursor).not.toBe(disabledCursor);
  });

  test('a form submit fired without consent (bypassing the disabled button) is rejected with an inline error, not sent to the server', function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess })} />);
    fillNameAndEmailOnly();

    fireEvent.submit(screen.getByPlaceholderText('Jane').closest('form'));

    expect(screen.getByText(/agree to the terms of service/i)).toBeInTheDocument();
    expect(requestAccess).not.toHaveBeenCalled();
  });

  test('a successful submit logs consent as version-only — doc ids + current versions, never the document text — and never stamps it onto the request payload', async function () {
    var requestAccess = vi.fn().mockResolvedValue({ success: true });
    render(<RequestAccessScreen {...baseProps({ requestAccess })} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(function () {
      expect(requestAccess).toHaveBeenCalledTimes(1);
    });

    expect(logLegalConsent).toHaveBeenCalledTimes(1);
    var consentCall = logLegalConsent.mock.calls[0][0];
    expect(consentCall.email).toBe('jane@example.com');
    expect(consentCall.context).toBe('request_access');
    expect(consentCall.consents).toEqual([
      { docId: 'terms', version: TERMS_DOC.version },
      { docId: 'privacy', version: PRIVACY_DOC.version },
    ]);
    // No section text anywhere in the logged payload — version only.
    expect(JSON.stringify(consentCall)).not.toContain('sections');

    var requestPayload = requestAccess.mock.calls[0][0];
    expect(requestPayload.acceptedTerms).toBeUndefined();
    expect(requestPayload.acceptedTermsVersion).toBeUndefined();
  });

  test('tapping "Terms of Service" opens the same document the Account tab\'s Legal section shows, without losing in-progress form values', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    fillNameAndEmailOnly();

    fireEvent.click(screen.getByRole('button', { name: 'Terms of Service' }));

    expect(screen.getByRole('dialog', { name: TERMS_DOC.title })).toBeInTheDocument();
    expect(screen.getByText(TERMS_DOC.tldr[0])).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Form values survived the sheet opening and closing over top of them.
    expect(screen.getByPlaceholderText('Jane').value).toBe('Jane');
  });

  test('tapping "Privacy Policy" opens the Privacy Policy document, not the Terms of Service', function () {
    render(<RequestAccessScreen {...baseProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Privacy Policy' }));
    expect(screen.getByRole('dialog', { name: 'Privacy Policy' })).toBeInTheDocument();
  });

  test('?terms=open deep-links straight into the Terms of Service sheet on load', function () {
    window.history.pushState(null, '', '/?terms=open');
    render(<RequestAccessScreen {...baseProps()} />);
    expect(screen.getByRole('dialog', { name: TERMS_DOC.title })).toBeInTheDocument();
    window.history.pushState(null, '', '/');
  });
});

describe('RequestAccessScreen — Wave F contemporary treatment', function () {
  test('uses the shared auth frame while preserving the complete form', function () {
    render(<RequestAccessScreen {...baseProps()} contemporary />);
    expect(document.querySelector('[data-auth-workspace="true"]')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Request access' })).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toBeInTheDocument();
    expect(screen.getByLabelText('Your role')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });
});
