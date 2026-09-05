/** Thin endpoint module for GET /api/v1/account (#1134). */
export function fetchAccount(client, options = {}) {
  const { signal, ifNoneMatch } = options;
  return client.request('/api/v1/account', {
    method: 'GET',
    signal,
    ifNoneMatch,
  });
}
