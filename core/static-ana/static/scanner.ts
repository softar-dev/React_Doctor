import { glob } from "glob";
import path from "path";

export interface ScannedFile {
  path: string;           // Full absolute path
  relativePath: string;   // Relative to project root
  name: string;           // Filename only
  extension: string;      // .tsx or .jsx
}

export class FileScanner {
  /**
   * Find all React component files (.jsx, .tsx) in a project
   * @param projectPath - Absolute or relative path to React project root
   * @returns Array of scanned file metadata
   */
  async findFiles(projectPath: string): Promise<ScannedFile[]> {
    // 1. Ensure the path is absolute and uses forward slashes
    const normalizedPath = path.resolve(projectPath).replace(/\\/g, "/");

    // 2. Try to scan src/ folder first (standard React location)
    const srcPattern = `${normalizedPath}/src/**/*.{ts,js,jsx,tsx}`;
    
    try {
      // 3. Run the glob search (focusing on src/ folder)
      let files = await glob(srcPattern, {
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.next/**",
          "**/coverage/**",
          "**/*.test.{jsx,tsx}",     // Skip test files
          "**/*.spec.{jsx,tsx}",     // Skip spec files
          "**/*.stories.{jsx,tsx}",  // Skip Storybook files
        ],
        nodir: true,    // We only want files, not folders
        absolute: true, // Return absolute paths
      });

      // 4. If no files found in src/, try scanning entire project as fallback
      if (files.length === 0) {
        console.warn(`⚠️  No files found in src/, scanning entire project...`);
        const rootPattern = `${normalizedPath}/**/*.{ts,js,jsx,tsx}`;
        
        files = await glob(rootPattern, {
          ignore: [
            "**/node_modules/**",
            "**/dist/**",
            "**/build/**",
            "**/.next/**",
            "**/coverage/**",
            "**/*.test.{jsx,tsx}",
            "**/*.spec.{jsx,tsx}",
            "**/*.stories.{jsx,tsx}",
          ],
          nodir: true,
          absolute: true,
        });
      }

      console.log(`✅ Found ${files.length} React component files`);

      // 5. Map to structured metadata
      return files.map(filePath => ({
        path: filePath,
        relativePath: path.relative(normalizedPath, filePath),
        name: path.basename(filePath),
        extension: path.extname(filePath),
      }));

    } catch (error) {
      console.error("❌ Scanner Error:", error);
      throw new Error(`Failed to scan files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get statistics about scanned files
   */
  getStats(files: ScannedFile[]): {
    total: number;
    byExtension: Record<string, number>;
  } {
    return {
      total: files.length,
      byExtension: files.reduce((acc, file) => {
        acc[file.extension] = (acc[file.extension] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}