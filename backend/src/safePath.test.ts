import assert from "assert";
import path from "path";
import { resolveInside, toSafeName } from "./safePath";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e: any) {
    console.log(`  FAIL ${name}\n       ${e.message}`);
    process.exitCode = 1;
  }
}

// ── POSIX rules ──────────────────────────────────────────────
console.log("resolveInside (posix)");
const pbase = "/srv/data/screenshots";
const posix = path.posix as unknown as typeof path;

check("normal filename is allowed", () =>
  assert.strictEqual(resolveInside(pbase, "1-home-fullLoad.png", posix), "/srv/data/screenshots/1-home-fullLoad.png"));
check("name starting with two dots is allowed (..foo.png)", () =>
  assert.notStrictEqual(resolveInside(pbase, "..foo.png", posix), null));
check("../ traversal is rejected", () =>
  assert.strictEqual(resolveInside(pbase, "../../../etc/passwd", posix), null));
check("traversal hidden after a subfolder is rejected", () =>
  assert.strictEqual(resolveInside(pbase, "a/../../../etc/passwd", posix), null));
check("absolute path is rejected", () =>
  assert.strictEqual(resolveInside(pbase, "/etc/passwd", posix), null));
check("the base directory itself is rejected", () =>
  assert.strictEqual(resolveInside(pbase, ".", posix), null));
check("sibling folder with same prefix is rejected", () =>
  assert.strictEqual(resolveInside(pbase, "../screenshots-evil/x.png", posix), null));
check("empty / non-string / NUL are rejected", () => {
  assert.strictEqual(resolveInside(pbase, "", posix), null);
  assert.strictEqual(resolveInside(pbase, undefined, posix), null);
  assert.strictEqual(resolveInside(pbase, { a: 1 }, posix), null);
  assert.strictEqual(resolveInside(pbase, "a\0b.png", posix), null);
});

// ── Windows rules ────────────────────────────────────────────
console.log("resolveInside (win32)");
const wbase = "C:\\Users\\me\\data\\screenshots";
const win = path.win32 as unknown as typeof path;

check("normal filename is allowed", () =>
  assert.notStrictEqual(resolveInside(wbase, "1-home-fullLoad.png", win), null));
check("..\\ traversal is rejected", () =>
  assert.strictEqual(resolveInside(wbase, "..\\..\\..\\Windows\\win.ini", win), null));
check("../ traversal is rejected", () =>
  assert.strictEqual(resolveInside(wbase, "../../x.png", win), null));
check("absolute path on another drive is rejected", () =>
  assert.strictEqual(resolveInside(wbase, "D:\\secrets\\key.pem", win), null));
check("absolute path on same drive is rejected", () =>
  assert.strictEqual(resolveInside(wbase, "C:\\Windows\\win.ini", win), null));

// ── The bug that existed before: a route key with backslashes ──
console.log("old saveScreenshots filename logic vs new (win32)");
const evilRoute = "a\\..\\..\\..\\..\\evil";
const oldSafeRoute = evilRoute.replace(/[/:]/g, "-").replace(/^-+/, "");
const oldFilename = `1-${oldSafeRoute}-fullLoad.png`;
check("OLD logic escaped the screenshots folder on Windows (proves the bug)", () => {
  const oldFull = path.win32.join(wbase, oldFilename);
  assert.ok(!oldFull.startsWith(wbase + "\\"), `expected escape, got ${oldFull}`);
});
check("NEW logic keeps the same input inside the folder", () => {
  const newFilename = `1-${toSafeName(evilRoute)}-${toSafeName("fullLoad")}.png`;
  const full = resolveInside(wbase, newFilename, win);
  assert.notStrictEqual(full, null);
  assert.ok(!newFilename.includes("\\") && !newFilename.includes("/"));
});

// ── toSafeName ───────────────────────────────────────────────
console.log("toSafeName");
check("removes separators of both OSes", () => {
  assert.ok(!/[\\/]/.test(toSafeName("../..\\x/y")));
});
check("keeps ordinary labels readable", () =>
  assert.strictEqual(toSafeName("fullLoad"), "fullLoad"));
check("falls back for empty or non-string input", () => {
  assert.strictEqual(toSafeName(""), "unnamed");
  assert.strictEqual(toSafeName(undefined), "unnamed");
  assert.strictEqual(toSafeName("///"), "unnamed");
});
check("caps length", () =>
  assert.ok(toSafeName("a".repeat(500)).length <= 80));

console.log(`\n${passed} checks passed${process.exitCode ? " — WITH FAILURES" : ""}`);