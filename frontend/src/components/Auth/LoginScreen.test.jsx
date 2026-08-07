import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ============================================================================
// DOC_TEST_DEBT.md P1 "Auth Flow End-to-End (Magic Link + Google OAuth)".
//
// LoginScreen.handleGoogleSignIn is the actual click-triggered entry point
// into the Google OAuth redirect (supabase.auth.signInWithOAuth) — the other
// half of this hook's coverage (auth.test.js) starts from the post-redirect
// SIGNED_IN event and never exercises this trigger. Zero prior coverage
// existed for this component.
// ============================================================================

var mockSignInWithOAuth = vi.fn();
vi.mock('../../supabase', () => ({
  supabase: { auth: { signInWithOAuth: (...args) => mockSignInWithOAuth(...args) } },
}));

import { LoginScreen } from './LoginScreen';

function baseProps(overrides) {
  return Object.assign(
    { onRequestAccess: vi.fn(), sendMagicLink: vi.fn() },
    overrides
  );
}

describe('LoginScreen — Google OAuth entry point', function () {

  beforeEach(function () {
    mockSignInWithOAuth.mockReset();
  });

  test('renders the "Continue with Google" button', function () {
    render(<LoginScreen {...baseProps()} />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  test('clicking Google calls signInWithOAuth with provider "google" and no error shown on success', async function () {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    render(<LoginScreen {...baseProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(function () {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    });
    expect(mockSignInWithOAuth.mock.calls[0][0].provider).toBe('google');
    expect(screen.queryByText(/google sign-in failed/i)).not.toBeInTheDocument();
  });

  test('signInWithOAuth returning an error shows the fallback message, does not throw', async function () {
    mockSignInWithOAuth.mockResolvedValue({ error: { message: 'provider unavailable' } });
    render(<LoginScreen {...baseProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(function () {
      expect(screen.getByText(/google sign-in failed/i)).toBeInTheDocument();
    });
  });

  test('signInWithOAuth throwing → same fallback message, does not crash', async function () {
    mockSignInWithOAuth.mockRejectedValue(new Error('network down'));
    render(<LoginScreen {...baseProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(function () {
      expect(screen.getByText(/google sign-in failed/i)).toBeInTheDocument();
    });
  });
});

describe('LoginScreen — magic link submit', function () {

  test('successful send shows the "Check your email" confirmation with the entered address', async function () {
    var sendMagicLink = vi.fn().mockResolvedValue({ success: true });
    render(<LoginScreen {...baseProps({ sendMagicLink })} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'coach@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send me a login link/i }));

    await waitFor(function () {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
    expect(screen.getByText('coach@example.com')).toBeInTheDocument();
  });

  test('no_membership error shows the "request access" copy instead of a raw error string', async function () {
    var sendMagicLink = vi.fn().mockResolvedValue({ success: false, error: 'no_membership' });
    render(<LoginScreen {...baseProps({ sendMagicLink })} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'unknown@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send me a login link/i }));

    await waitFor(function () {
      expect(screen.getByText(/request access below/i)).toBeInTheDocument();
    });
    // Must not fall through to authenticated-looking UI.
    expect(screen.queryByText('Check your email')).not.toBeInTheDocument();
  });
});
