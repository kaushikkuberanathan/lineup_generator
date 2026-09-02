/**
 * validateHomeResponse — lightweight contract validator for the Home read
 * model (Story #1025's "response schema is contract-tested" criterion).
 *
 * Deliberately reads its constraints (required keys, enums, the href
 * pattern) directly off homeReadModel.v1.schema.json at require-time
 * instead of duplicating them, so this validator cannot silently drift
 * from the schema it's meant to enforce — a schema change is either
 * reflected here automatically or the tests using this file catch the
 * mismatch. No ajv/schema-validation library dependency added (package.json
 * is a locked path); this covers the fields the contract actually
 * constrains, not full JSON Schema semantics.
 */
const schema = require('./homeReadModel.v1.schema.json');

const requestIdPattern = new RegExp(schema.properties.requestId.pattern);
const roleEnum = schema.$defs.role.properties.code.enum;
const capabilityEnum = schema.$defs.capability.enum;
const lineupStatusEnum = schema.$defs.readiness.properties.lineupStatus.enum;
const hrefPattern = new RegExp(schema.$defs.action.properties.href.pattern);
const teamRequired = schema.$defs.team.required;
const actionRequired = schema.$defs.action.required;
const readinessRequired = schema.$defs.readiness.required;

/**
 * @param {object} body - a parsed Home API response
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateHomeResponse(body) {
  const errors = [];

  for (const key of schema.required) {
    if (!(key in body)) errors.push(`root: missing required key "${key}"`);
  }

  if (body.version !== undefined && body.version !== schema.properties.version.const) {
    errors.push(`root: version must be ${schema.properties.version.const}, got ${body.version}`);
  }

  if (body.requestId !== undefined && !requestIdPattern.test(body.requestId)) {
    errors.push(`root: requestId "${body.requestId}" does not match the required pattern`);
  }

  for (const team of body.teams || []) {
    const label = team && team.id ? team.id : '(no id)';

    for (const key of teamRequired) {
      if (!(key in team)) errors.push(`team ${label}: missing required key "${key}"`);
    }

    if (team.role && !roleEnum.includes(team.role.code)) {
      errors.push(`team ${label}: role.code "${team.role.code}" is not in the canonical enum`);
    }

    for (const cap of team.capabilities || []) {
      if (!capabilityEnum.includes(cap)) {
        errors.push(`team ${label}: capability "${cap}" is not in the section 26.1 vocabulary`);
      }
    }

    if (team.readiness) {
      for (const key of readinessRequired) {
        if (!(key in team.readiness)) errors.push(`team ${label}: readiness missing required key "${key}"`);
      }
      if (!lineupStatusEnum.includes(team.readiness.lineupStatus)) {
        errors.push(`team ${label}: readiness.lineupStatus "${team.readiness.lineupStatus}" is not a valid value`);
      }
    }

    for (const action of team.actions || []) {
      const actionLabel = action && action.id ? action.id : '(no id)';
      for (const key of actionRequired) {
        if (!(key in action)) errors.push(`team ${label} action ${actionLabel}: missing required key "${key}"`);
      }
      if (action.href && !hrefPattern.test(action.href)) {
        errors.push(`team ${label} action ${actionLabel}: href "${action.href}" does not match the canonical route pattern`);
      }
      if ('disabledReason' in action === false) {
        errors.push(`team ${label} action ${actionLabel}: disabledReason key must be present (may be null)`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateHomeResponse };
