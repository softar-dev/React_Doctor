import path from "path";
import fs from "fs-extra";
import * as parser from "@babel/parser";
import * as traverseLib from "@babel/traverse";

const traverse: Function = (traverseLib as any).default ?? (traverseLib as any);

/**
 * Whether a route string extracted from source is safe to hand to the
 * profiler as a literal URL path (e.g. `page.goto(baseUrl + route)`).
 *
 * React Router allows several path forms that are NOT real, navigable
 * URLs on their own:
 *   - "*"            catch-all / not-found route (React Router v5/v6)
 *   - "/foo/*"       nested catch-all
 *   - "/user/:id"    dynamic segment (v5 JSX form) — the object-config
 *                    (v6) branch below already filtered these via the
 *                    ":" check, but the JSX branch had no equivalent
 *                    filter at all, so a v5 <Route path="/user/:id" />
 *                    or a v5 <Route path="*" /> passed straight through
 *                    and was later handed to Puppeteer's page.navigate(),
 *                    which correctly rejects it ("Cannot navigate to
 *                    invalid URL") — this is the exact crash seen when
 *                    profiling a project with a catch-all 404 route,
 *                    an extremely common React Router idiom.
 *   - "/user/*id"    v6 named wildcard segment
 *
 * Only static paths (no ":" params, no "*" wildcard segments) can be
 * profiled directly. Dynamic/catch-all routes would need a concrete
 * example URL to be meaningful, which this scanner has no way to infer
 * from a route declaration alone.
 */
function isNavigableRoute(route: string): boolean {
  if (!route) return false;
  if (route.includes("*")) return false;   // catch-all / wildcard segments
  if (route.includes(":")) return false;   // dynamic params, e.g. /user/:id
  return true;
}

export class RouteScanner {
  static async scanForRoutes(projectPath: string): Promise<string[]> {
    const routes: string[] = ["/"];

    const potentialFiles = [
      path.join(projectPath, "src", "App.tsx"),
      path.join(projectPath, "src", "App.jsx"),
      path.join(projectPath, "src", "main.tsx"),
      path.join(projectPath, "src", "main.jsx"),
      path.join(projectPath, "src", "routes.tsx"),
      path.join(projectPath, "src", "routes.jsx"),
      path.join(projectPath, "src", "router.tsx"),
      path.join(projectPath, "src", "router.jsx"),
    ];

    for (const filePath of potentialFiles) {
      if (!fs.existsSync(filePath)) continue;

      try {
        const code = await fs.readFile(filePath, "utf-8");
        const ast  = parser.parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        });

        traverse(ast, {
          // ── React Router v5: <Route path="/foo" /> ──────────
          JSXOpeningElement(p: any) {
            const isRoute = (p.node.name as any).name === "Route";
            if (isRoute) {
              const pathAttr = p.node.attributes.find(
                (attr: any) => attr.name?.name === "path",
              );
              if (
                pathAttr &&
                "value" in pathAttr &&
                pathAttr.value?.type === "StringLiteral"
              ) {
                const routePath = pathAttr.value.value;
                if (isNavigableRoute(routePath)) {
                  routes.push(routePath);
                }
              }
            }
          },

          // ── React Router v6: createBrowserRouter([{ path: "/foo" }]) ──
          ObjectExpression(p: any) {
            const pathProp = p.node.properties.find(
              (prop: any) =>
                prop.type === "ObjectProperty" &&
                prop.key?.name === "path" &&
                prop.value?.type === "StringLiteral",
            );
            if (pathProp) {
              const routePath = pathProp.value.value;
              if (isNavigableRoute(routePath)) {
                routes.push(routePath);
              }
            }
          },
        });
      } catch {
        // Skip files that fail to parse silently
      }
    }

    const result = [...new Set(routes)];
    return result.length > 0 ? result : ["/"];
  }
}