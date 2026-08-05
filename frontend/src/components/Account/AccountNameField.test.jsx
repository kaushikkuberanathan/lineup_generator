import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountNameField } from './AccountNameField';

// ============================================================================
// AccountNameField golden-path tests (#407, extracted from App.jsx renderAccount).
//
// updateProfileName is a vi.fn() returning controlled results so we can drive
// all three feedback states. S is a minimal mock (the component reads
// S.input/S.btn; border/textMuted/red colors now come from tokens directly,
// not a passed-in C prop — Phase 4 slice 6 dropped C entirely).
//
// AF3 is the acceptance-critical one: it pins the stringly-typed
// 'could not refresh' branch (kind:'refresh', amber) so a future reword of
// useAuth's copy breaks THIS test loudly instead of silently degrading the
// "saved but couldn't refresh" message into a generic red error.
//
// Colors are asserted tolerant of jsdom's hex/rgb serialization.
// ============================================================================

var REFRESH_MSG = 'Saved, but could not refresh — reload to see the change.';

// success/refresh colors as authored in the component; red is
// tokens.color.brand.red (#c8102e), the real value the component renders.
var GREEN  = /#065f46|rgb\(6,95,70\)/i;      // success
var AMBER  = /#92620a|rgb\(146,98,10\)/i;    // refresh
var RED    = /#c8102e|rgb\(200,16,46\)/i;    // error (tokens.color.brand.red)

function renderField(overrides) {
  var props = Object.assign({
    updateProfileName: vi.fn().mockResolvedValue({ success: true }),
    initialFirstName: '',
    initialLastName: '',
    S: { input: {}, btn: function () { return {}; } },
  }, overrides || {});
  return Object.assign({ props: props }, render(<AccountNameField {...props} />));
}

function colorOf(el) {
  return (el.style.color || '').replace(/\s/g, '');
}

describe('AccountNameField — golden path', function () {

  test('AF1: Save disabled when firstName empty, enabled after typing', function () {
    renderField({ initialFirstName: '' });
    var save = screen.getByRole('button', { name: /save/i });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('First name*'), { target: { value: 'Casey' } });
    expect(save).not.toBeDisabled();
  });

  test('AF2: success → "✓ Saved" in the green success state', async function () {
    var updateProfileName = vi.fn().mockResolvedValue({ success: true });
    renderField({ updateProfileName: updateProfileName, initialFirstName: 'Casey' });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    var fb = await screen.findByText(/Saved/);
    expect(fb.textContent).toContain('Saved');
    expect(colorOf(fb)).toMatch(GREEN);
  });

  test("AF3: refresh branch — 'could not refresh' renders the DISTINCT amber refresh state, not a red error", async function () {
    var updateProfileName = vi.fn().mockResolvedValue({ success: false, error: REFRESH_MSG });
    renderField({ updateProfileName: updateProfileName, initialFirstName: 'Casey' });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    var fb = await screen.findByText(REFRESH_MSG);
    expect(fb).toBeInTheDocument();
    // The write DID land — must be amber 'refresh', never the generic red error.
    expect(colorOf(fb)).toMatch(AMBER);
    expect(colorOf(fb)).not.toMatch(RED);
  });

  test('AF4: generic failure (no "could not refresh") → red error state', async function () {
    var updateProfileName = vi.fn().mockResolvedValue({ success: false, error: 'Something failed' });
    renderField({ updateProfileName: updateProfileName, initialFirstName: 'Casey' });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    var fb = await screen.findByText('Something failed');
    expect(colorOf(fb)).toMatch(RED);
    expect(colorOf(fb)).not.toMatch(AMBER);
  });

  test('AF5: prefill — initialFirstName/initialLastName populate the inputs', function () {
    renderField({ initialFirstName: 'Ada', initialLastName: 'Lovelace' });
    expect(screen.getByPlaceholderText('First name*').value).toBe('Ada');
    expect(screen.getByPlaceholderText('Last name').value).toBe('Lovelace');
  });

  test('AF6: Save calls updateProfileName with trimmed first/last values', async function () {
    var updateProfileName = vi.fn().mockResolvedValue({ success: true });
    renderField({ updateProfileName: updateProfileName });

    fireEvent.change(screen.getByPlaceholderText('First name*'), { target: { value: '  Casey  ' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'),  { target: { value: '  Jones  ' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // flush the async handler (avoids act warnings + proves it resolved)
    await screen.findByText(/Saved/);
    expect(updateProfileName).toHaveBeenCalledWith('Casey', 'Jones');
  });

});
