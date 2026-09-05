/** Lightweight validator for the Account/Identity v1 contract (#1130). */
const schema = require('./accountIdentity.v1.schema.json');

const requestIdPattern = new RegExp(schema.properties.requestId.pattern);
const pendingPathPattern = new RegExp(schema.$defs.pendingDestination.properties.path.pattern);
const roleCodes = schema.$defs.role.properties.code.enum;
const capabilities = schema.$defs.capability.enum;
const seasons = schema.$defs.team.properties.season.enum;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireKeys(value, keys, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label}: must be an object`);
    return false;
  }
  for (const key of keys) {
    if (!(key in value)) errors.push(`${label}: missing required key "${key}"`);
  }
  return true;
}

function rejectAdditionalKeys(value, allowedKeys, label, errors) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) errors.push(`${label}: unexpected key "${key}"`);
  }
}

function validateAccountIdentityResponse(body) {
  const errors = [];
  if (!requireKeys(body, schema.required, 'root', errors)) return { valid: false, errors };
  rejectAdditionalKeys(body, Object.keys(schema.properties), 'root', errors);

  if (body.version !== schema.properties.version.const) {
    errors.push(`root: version must be ${schema.properties.version.const}, got ${body.version}`);
  }
  if (typeof body.requestId !== 'string' || !requestIdPattern.test(body.requestId)) {
    errors.push('root: requestId does not match the required pattern');
  }

  if (requireKeys(body.identity, schema.$defs.identity.required, 'identity', errors)) {
    rejectAdditionalKeys(body.identity, Object.keys(schema.$defs.identity.properties), 'identity', errors);
    if (typeof body.identity.id !== 'string' || body.identity.id.length === 0) errors.push('identity: id must be a non-empty string');
    if (typeof body.identity.email !== 'string' || !body.identity.email.includes('@')) errors.push('identity: email must be valid');
    if (typeof body.identity.displayName !== 'string' || body.identity.displayName.length === 0) errors.push('identity: displayName must be a non-empty string');
  }

  if (!Array.isArray(body.memberships)) {
    errors.push('root: memberships must be an array');
  } else {
    const teamIds = new Set();
    for (const membership of body.memberships) {
      const teamId = membership && membership.team && membership.team.id;
      const label = `membership ${teamId || '(no team id)'}`;
      if (!requireKeys(membership, schema.$defs.membership.required, label, errors)) continue;
      rejectAdditionalKeys(membership, Object.keys(schema.$defs.membership.properties), label, errors);
      if (requireKeys(membership.team, schema.$defs.team.required, `${label} team`, errors)) {
        rejectAdditionalKeys(membership.team, Object.keys(schema.$defs.team.properties), `${label} team`, errors);
        if (teamIds.has(teamId)) errors.push(`${label}: duplicate team membership`);
        teamIds.add(teamId);
        if (!seasons.includes(membership.team.season)) errors.push(`${label}: invalid team season`);
      }
      if (requireKeys(membership.role, schema.$defs.role.required, `${label} role`, errors)
          && !roleCodes.includes(membership.role.code)) {
        errors.push(`${label}: role.code is not canonical`);
      }
      rejectAdditionalKeys(membership.role, Object.keys(schema.$defs.role.properties), `${label} role`, errors);
      if (!Array.isArray(membership.capabilities)) {
        errors.push(`${label}: capabilities must be an array`);
      } else {
        for (const capability of membership.capabilities) {
          if (!capabilities.includes(capability)) errors.push(`${label}: unknown capability "${capability}"`);
        }
        if (new Set(membership.capabilities).size !== membership.capabilities.length) {
          errors.push(`${label}: capabilities must be unique`);
        }
      }
    }
  }

  if (body.pendingDestination !== null) {
    if (requireKeys(body.pendingDestination, schema.$defs.pendingDestination.required, 'pendingDestination', errors)) {
      rejectAdditionalKeys(body.pendingDestination, Object.keys(schema.$defs.pendingDestination.properties), 'pendingDestination', errors);
      const path = body.pendingDestination.path;
      let decodedPath = '';
      try {
        decodedPath = typeof path === 'string' ? decodeURIComponent(path.split('#')[0]) : '';
      } catch {
        decodedPath = '';
      }
      if (typeof path !== 'string'
          || !pendingPathPattern.test(path)
          || path.startsWith('//')
          || path.includes('\\')
          || decodedPath.includes('://')
          || decodedPath.includes('\\')) {
        errors.push('pendingDestination: path must be a safe internal /app destination');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateAccountIdentityResponse };
