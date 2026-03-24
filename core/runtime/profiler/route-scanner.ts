import path from "path";
import fs from "fs-extra";
import * as parser from "@babel/parser";
import * as traverseLib from "@babel/traverse";

const traverse: Function = (traverseLib as any).default ?? (traverseLib as any);

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
                routes.push(pathAttr.value.value);
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
              // Skip dynamic segments like /docs/:id — only add static base routes
              if (!routePath.includes(":")) {
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