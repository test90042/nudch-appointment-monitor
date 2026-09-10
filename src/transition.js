export function initialState() {
  return {
    version: 1,
    lastKnownAvailability: null,
    availabilityFingerprint: null,
    consecutiveErrors: 0,
    outageNotified: false,
    failureStartedAt: null,
    lastStateChangeAt: null,
    lastNotificationAt: null,
    lastError: null
  };
}

export function transitionState(previousInput, observation, checkedAt) {
  const previous = { ...initialState(), ...previousInput };
  const nextState = { ...previous };
  const notifications = [];

  if (observation.status === "error") {
    const errorCount = previous.consecutiveErrors + 1;
    nextState.consecutiveErrors = errorCount;
    nextState.lastError = observation.reason;
    nextState.failureStartedAt = previous.failureStartedAt ?? checkedAt;

    if (!previous.outageNotified) {
      notifications.push({ type: "outage", key: `outage:${nextState.failureStartedAt}`, observation, checkedAt, errorCount });
      nextState.outageNotified = true;
      nextState.lastNotificationAt = checkedAt;
      nextState.lastStateChangeAt = checkedAt;
    }

    return { nextState, notifications };
  }

  if (previous.outageNotified) {
    notifications.push({ type: "recovery", key: `recovery:${previous.failureStartedAt}`, observation, checkedAt });
  }

  const isAvailable = observation.status === "available";
  const availabilityChanged =
    isAvailable &&
    (previous.lastKnownAvailability !== true || previous.availabilityFingerprint !== observation.fingerprint);

  if (availabilityChanged) {
    notifications.push({ type: "availability", key: `availability:${observation.fingerprint}`, observation, checkedAt });
  }

  const semanticChange =
    previous.lastKnownAvailability !== isAvailable ||
    previous.availabilityFingerprint !== observation.fingerprint ||
    previous.consecutiveErrors !== 0 ||
    previous.outageNotified;

  nextState.lastKnownAvailability = isAvailable;
  nextState.availabilityFingerprint = observation.fingerprint;
  nextState.consecutiveErrors = 0;
  nextState.outageNotified = false;
  nextState.failureStartedAt = null;
  nextState.lastError = null;

  if (semanticChange) {
    nextState.lastStateChangeAt = checkedAt;
  }
  if (notifications.length > 0) {
    nextState.lastNotificationAt = checkedAt;
  }

  return { nextState, notifications };
}
