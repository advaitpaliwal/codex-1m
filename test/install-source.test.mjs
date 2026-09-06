import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

const installer = readFileSync(new URL("../install.sh", import.meta.url), "utf8");
// Load definitions only: never dispatch apply/status or touch the installed app.
const definitions = installer.split('command="${1:-apply}"')[0];
assert.notEqual(definitions, installer);
const sha = "a".repeat(40);

function rawBase(overrides = {}, mockCurl = false) {
  return execFileSync("bash", ["-c", `${definitions}\n${mockCurl ? `curl() { [[ "$1" == "-fsSL" && "$2" == "https://api.github.com/repos/\${REPO}/commits/\${REF}" ]] || return 1; printf '  "sha": "${sha}",\\n'; }` : ""}\nraw_base`], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH, HOME: "/nonexistent/codex-1m-source-test",
      CODEX_1M_NODE: "/nonexistent/node",
      CODEX_1M_REF: sha,
      ...overrides,
    },
  }).trim();
}

test("installer defaults to personal source at an exact commit", () => {
  assert.equal(rawBase(), `https://raw.githubusercontent.com/advaitpaliwal/codex-1m/${sha}`);
});

test("installer preserves repository, ref, and raw-base overrides", () => {
  assert.equal(rawBase({CODEX_1M_REPO: "example/custom"}), `https://raw.githubusercontent.com/example/custom/${sha}`);
  assert.equal(rawBase({CODEX_1M_RAW_BASE: "https://example.test/source"}), "https://example.test/source");
  assert.equal(rawBase({CODEX_1M_REF: "main"}, true), `https://raw.githubusercontent.com/advaitpaliwal/codex-1m/${sha}`);
});

test("both documented installation modes fetch the personal installer", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const mode of ["apply", "install-agent"]) {
    assert.ok(readme.includes(`curl -fsSL https://raw.githubusercontent.com/advaitpaliwal/codex-1m/main/install.sh | bash -s -- ${mode}`));
  }
});
