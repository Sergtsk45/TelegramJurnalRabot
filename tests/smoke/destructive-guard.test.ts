import assert from "node:assert/strict";
import test from "node:test";
import { isDestructiveActionAllowed } from "../../server/destructiveGuard";

test("destructive guard behavior in dev and production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAllow = process.env.ALLOW_DESTRUCTIVE_ACTIONS;

  try {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_DESTRUCTIVE_ACTIONS;
    assert.equal(isDestructiveActionAllowed(), true);

    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_DESTRUCTIVE_ACTIONS;
    assert.equal(isDestructiveActionAllowed(), false);

    process.env.ALLOW_DESTRUCTIVE_ACTIONS = "true";
    assert.equal(isDestructiveActionAllowed(), true);

    process.env.ALLOW_DESTRUCTIVE_ACTIONS = "1";
    assert.equal(isDestructiveActionAllowed(), true);

    process.env.ALLOW_DESTRUCTIVE_ACTIONS = "false";
    assert.equal(isDestructiveActionAllowed(), false);
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousAllow === undefined) {
      delete process.env.ALLOW_DESTRUCTIVE_ACTIONS;
    } else {
      process.env.ALLOW_DESTRUCTIVE_ACTIONS = previousAllow;
    }
  }
});
