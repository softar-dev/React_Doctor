import path from "path";

/**
 * Resolve `untrusted` against `baseDir` and return the absolute path ONLY if
 * the result stays inside `baseDir`. Returns null for anything else:
 * traversal ("../x"), absolute paths ("/etc/passwd", "C:\\x"), empty input,
 * NUL bytes, or the base directory itself.
 *
 * Use this on every filesystem operation whose path is built from data that
 * came from a client or from the database.
 *
 * `pathLib` exists only so tests can exercise Windows semantics (path.win32)
 * on any OS — production code should never pass it.
 */
export function resolveInside(
  baseDir: string,
  untrusted: unknown,
  pathLib: typeof path = path,
): string | null {
  if (typeof untrusted !== "string" || untrusted.length === 0) return null;
  if (untrusted.includes("\0")) return null;

  const base = pathLib.resolve(baseDir);
  const target = pathLib.resolve(base, untrusted);
  const rel = pathLib.relative(base, target);

  // rel === ""        -> target is the base directory itself, not a file in it
  // rel is ".." or starts with "../" (or "..\\") -> escaped upwards
  // rel is absolute   -> different drive/root (Windows), definitely outside
  if (rel === "") return null;
  if (rel === ".." || rel.startsWith(".." + pathLib.sep)) return null;
  if (pathLib.isAbsolute(rel)) return null;

  return target;
}

/**
 * Turn arbitrary client text into a string that is safe to embed in a
 * filename: only letters, digits, dot, underscore and hyphen survive.
 * No path separators (of either OS) can get through, so the result can
 * never introduce a directory component.
 */
export function toSafeName(input: unknown, fallback = "unnamed"): string {
  const text = typeof input === "string" ? input : "";
  const cleaned = text
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : fallback;
}