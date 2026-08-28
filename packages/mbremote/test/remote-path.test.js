import assert from "node:assert/strict";
import test from "node:test";

import {
  isRemotePath,
  unwrapRemotePath,
  validateRemotePath,
} from "../src/remote-path.js";

test("recognizes and unwraps a colon-prefixed remote path", () => {
  assert.equal(isRemotePath(":app.py"), true);
  assert.equal(isRemotePath("lib/app.py"), false);
  assert.equal(unwrapRemotePath(":app.py"), "app.py");
});

test("validates colon-prefixed remote paths", () => {
  assert.equal(validateRemotePath(":"), "");
  assert.equal(validateRemotePath(":app.py"), "app.py");
  assert.equal(validateRemotePath(":/app.py"), "/app.py");
  assert.throws(() => validateRemotePath("/lib/app.py"), /prefix it with :/);
  assert.throws(() => validateRemotePath(":/lib/../main.py"), /must not contain/);
});
