function mapLevel(value, mapping) {
  return mapping[value] ?? mapping.default;
}

export function getFieldAwarenessScore(p) {
  return (
    (p.knowsWhereToThrow ? 0.25 : 0) +
    (p.callsForBall ? 0.25 : 0) +
    (p.backsUpPlays ? 0.25 : 0) +
    (p.anticipatesPlays ? 0.25 : 0)
  );
}

export function getBattingAwarenessScore(p) {
  return (
    (p.tracksBallWell ? 0.34 : 0) +
    (p.patientAtPlate ? 0.33 : 0) +
    (p.confidentHitter ? 0.33 : 0)
  );
}

export function getBaseRunningAwarenessScore(p) {
  return (
    (p.runsThroughFirst ? 0.34 : 0) +
    (p.listensToCoaches ? 0.33 : 0) +
    (p.awareOnBases ? 0.33 : 0)
  );
}

export function getReliabilityValue(p) {
  return mapLevel(p.reliability, {
    high: 1.0,
    average: 0.7,
    needs_support: 0.4,
    default: 0.7,
  });
}

export function getReactionValue(p) {
  return mapLevel(p.reaction, {
    quick: 1.0,
    average: 0.7,
    slow: 0.4,
    default: 0.7,
  });
}

export function getArmStrengthValue(p) {
  return mapLevel(p.armStrength, {
    strong: 1.0,
    average: 0.7,
    developing: 0.4,
    default: 0.7,
  });
}

export function getContactValue(p) {
  return mapLevel(p.contact, {
    high: 1.0,
    medium: 0.7,
    developing: 0.4,
    default: 0.7,
  });
}

export function getPowerValue(p) {
  return mapLevel(p.power, {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
    default: 0.4,
  });
}

export function getDisciplineValue(p) {
  return p.swingDiscipline === "disciplined" ? 1.0 : 0.5;
}

export function getSpeedValue(p) {
  return mapLevel(p.speed, {
    fast: 1.0,
    average: 0.7,
    developing: 0.4,
    default: 0.7,
  });
}

export function getBallTypeGeneralValue(p) {
  return mapLevel(p.ballType, {
    both: 1.0,
    ground_ball: 0.8,
    fly_ball: 0.8,
    developing: 0.5,
    default: 0.5,
  });
}

export function getFieldScore(p) {
  return (
    getReliabilityValue(p) * 0.30 +
    getReactionValue(p) * 0.20 +
    getArmStrengthValue(p) * 0.15 +
    getBallTypeGeneralValue(p) * 0.15 +
    getFieldAwarenessScore(p) * 0.20
  );
}

export function getBattingScore(p) {
  return (
    getContactValue(p) * 0.40 +
    getPowerValue(p) * 0.20 +
    getDisciplineValue(p) * 0.20 +
    getBattingAwarenessScore(p) * 0.20
  );
}

export function getRunningScore(p) {
  return (
    getSpeedValue(p) * 0.70 +
    getBaseRunningAwarenessScore(p) * 0.30
  );
}

export function getBattingOrderScore(p) {
  return (
    getBattingScore(p) * 0.65 +
    getRunningScore(p) * 0.35
  );
}

export function getBallTypeFit(p, position) {
  const bt = p.ballType ?? "developing";

  if (["SS", "2B", "3B", "1B", "P"].includes(position)) {
    if (bt === "ground_ball" || bt === "both") return 1.0;
    if (bt === "fly_ball") return 0.6;
    return 0.5;
  }

  if (["LF", "CF", "RF"].includes(position)) {
    if (bt === "fly_ball" || bt === "both") return 1.0;
    if (bt === "ground_ball") return 0.6;
    return 0.5;
  }

  if (position === "C") {
    if (bt === "both") return 1.0;
    if (bt === "ground_ball") return 0.8;
    if (bt === "fly_ball") return 0.5;
    return 0.4;
  }

  return 0.5;
}

export function getPreferredModifier(p, position) {
  const prefs = p.preferredPositions || [];
  if (prefs[0] === position) return 0.20;
  if (prefs[1] === position) return 0.12;
  if (prefs[2] === position) return 0.06;
  return 0;
}

export function getAvoidPenalty(p, position) {
  return (p.avoidPositions || []).includes(position) ? 0.35 : 0;
}

export function getPositionScore(p, position) {
  const reliability = getReliabilityValue(p);
  const reaction = getReactionValue(p);
  const arm = getArmStrengthValue(p);
  const fieldAwareness = getFieldAwarenessScore(p);
  const batting = getBattingScore(p);
  const running = getRunningScore(p);
  const fit = getBallTypeFit(p, position);
  const preferred = getPreferredModifier(p, position);
  const avoid = getAvoidPenalty(p, position);

  let baseScore = 0;

  switch (position) {
    case "P":
      baseScore =
        arm * 0.35 +
        reliability * 0.25 +
        reaction * 0.10 +
        fieldAwareness * 0.20 +
        fit * 0.10;
      break;

    case "C":
      baseScore =
        reliability * 0.30 +
        fieldAwareness * 0.30 +
        reaction * 0.15 +
        arm * 0.15 +
        fit * 0.10;
      break;

    case "1B":
      baseScore =
        reliability * 0.35 +
        fieldAwareness * 0.20 +
        fit * 0.20 +
        reaction * 0.10 +
        arm * 0.05 +
        batting * 0.10;
      break;

    case "2B":
      baseScore =
        reliability * 0.25 +
        reaction * 0.25 +
        fieldAwareness * 0.20 +
        fit * 0.15 +
        arm * 0.10 +
        running * 0.05;
      break;

    case "3B":
      baseScore =
        reliability * 0.25 +
        reaction * 0.20 +
        arm * 0.20 +
        fieldAwareness * 0.20 +
        fit * 0.15;
      break;

    case "SS":
      baseScore =
        reliability * 0.25 +
        reaction * 0.25 +
        fieldAwareness * 0.20 +
        arm * 0.15 +
        fit * 0.15;
      break;

    case "LF":
    case "RF":
      baseScore =
        reaction * 0.25 +
        running * 0.25 +
        fit * 0.20 +
        reliability * 0.15 +
        fieldAwareness * 0.15;
      break;

    case "CF":
      baseScore =
        reaction * 0.30 +
        running * 0.30 +
        fit * 0.20 +
        reliability * 0.10 +
        fieldAwareness * 0.10;
      break;

    default:
      baseScore = getFieldScore(p);
  }

  return baseScore + preferred - avoid;
}

export function getBenchCandidateScore(p) {
  return (
    getFieldScore(p) * 0.60 +
    getBattingScore(p) * 0.25 +
    getRunningScore(p) * 0.15
  );
}
