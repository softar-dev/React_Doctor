import * as parser from '@babel/parser';
import { File } from '@babel/types';

/**
 * AST Parser - Converts JavaScript/TypeScript code into an Abstract Syntax Tree
 */
export class ASTParser {
  /**
   * Parse source code into an AST
   * @param code - Source code as string
   * @param filePath - File path (for better error messages)
   * @returns Parsed AST
   */
  parse(code: string, filePath: string): File {
    try {
      return parser.parse(code, {
        sourceType: 'module',
        plugins: [
          'jsx',                  // Parse JSX syntax
          'typescript',           // Parse TypeScript syntax
          'decorators-legacy',    // Support decorators
          'classProperties',      // Support class properties
          'dynamicImport',        // Support dynamic imports
        ],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
      throw new Error(`Failed to parse ${filePath}: ${errorMessage}`);
    }
  }
}