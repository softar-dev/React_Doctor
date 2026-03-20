import path from "path";
import fs from "fs-extra";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

/**
 * Scans the project's source files for React Router <Route path="...">
 * elements and returns all discovered route paths.
 *
 * Files checked (in order):
 *   src/App.tsx, src/App.jsx, src/main.tsx, src/routes.tsx
 *
 * Always includes "/" as the root route.
 * Duplicates are removed before returning.
 */
export class RouteScanner {
  static async scanForRoutes(projectPath: string): Promise<string[]> {
    const routes: string[] = ["/"];

    const potentialFiles = [
      path.join(projectPath, "src", "App.tsx"),
      path.join(projectPath, "src", "App.jsx"),
      path.join(projectPath, "src", "main.tsx"),
      path.join(projectPath, "src", "routes.tsx"),
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
          JSXOpeningElement(p) {
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
                routes.push(pathAttr.value.value);
              }
            }
          },
        });
      } catch {
        // Skip files that fail to parse silently
      }
    }

    return [...new Set(routes)];
  }
}