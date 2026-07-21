// Canonical team_memberships.role -> human display label.
// Display-only and intentionally coarse: the request-access form offers a
// richer set of request-time labels; this just names a stored role. #395
export var ROLE_LABELS = {
  admin: 'Head Coach',
  coach: 'Coach',
  scorekeeper: 'Scorekeeper',
  viewer: 'Team Member',
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || 'Coach';
}
