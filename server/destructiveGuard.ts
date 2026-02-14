function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

/**
 * In development we allow destructive actions by default.
 * In production they require explicit opt-in via ALLOW_DESTRUCTIVE_ACTIONS=true.
 */
export function isDestructiveActionAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return isTruthy(process.env.ALLOW_DESTRUCTIVE_ACTIONS);
}
