import fs from 'fs';
import path from 'path';
import { ASTParser } from './ast-parser';
import { StaticReport, ComponentIssue } from '../../../shared/src/types';
import { ScannedFile } from './scanner';

// Import all detectors
import {
  detectConsoleLogs,
  detectLargeComponents,
  detectInlineFunctions,
  detectDeadCode,
  detectInfiniteLoops,
  detectInlineStyles,
  detectMissingKeys,
  detectPropDrilling,
  detectMissingMemo
} from './detectors';

export class StaticAnalyzer {
  private parser: ASTParser;

  constructor() {
    this.parser = new ASTParser();
  }

  /**
   * Orchestrates the analysis of multiple files
   */
  async analyze(files: ScannedFile[]): Promise<StaticReport> {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🔍 Static Analysis - Analyzing ${files.length} file(s)`);
    console.log("=".repeat(70));

    const allIssues: ComponentIssue[] = [];
    let filesAnalyzed = 0;
    let filesFailed = 0;

    for (const file of files) {
      try {
        const code = fs.readFileSync(file.path, 'utf-8');
        const ast = this.parser.parse(code, file.path);

        const fileIssues = [
          ...detectConsoleLogs(ast, file.relativePath),
          ...detectLargeComponents(ast, file.relativePath),
          ...detectInlineFunctions(ast, file.relativePath),
          ...detectDeadCode(ast, file.relativePath),
          ...detectInfiniteLoops(ast, file.relativePath),
          ...detectInlineStyles(ast, file.relativePath),
          ...detectMissingKeys(ast, file.relativePath),
          ...detectPropDrilling(ast, file.relativePath),
          ...detectMissingMemo(ast, file.relativePath),
        ];

        allIssues.push(...fileIssues);
        filesAnalyzed++;

        if (fileIssues.length > 0) {
          console.log(`  ⚠️  ${file.relativePath.padEnd(50)} ${fileIssues.length} issue(s)`);
        } else {
          console.log(`  ✅ ${file.relativePath}`);
        }

      } catch (error) {
        filesFailed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ ${file.relativePath.padEnd(50)} ${errorMsg}`);
      }
    }

    const grade = this.calculateGrade(allIssues, filesAnalyzed);

    return {
      timestamp: new Date().toISOString(),
      componentCount: filesAnalyzed,
      issues: allIssues,
      filesAnalyzed,
      filesFailed,
      grade
    };
  }

  /**
   * Persistence: Saves the results to static-report.json
   */
 saveReport(report: StaticReport): string {
    // 📍 __dirname gives the directory of this current file.
    // We go up two levels to reach the 'react_doctor' root, then into 'reports'.
    const reportDir = path.resolve(__dirname, '../../reports'); 
    
    // 📁 Ensure the directory exists (create it if missing)
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const filePath = path.join(reportDir, 'staticreport.json');

    try {
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`\n📄 Static Report saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save Static JSON report: ${error}`);
    }
  }

  private calculateGrade(issues: ComponentIssue[], fileCount: number): string {
    if (fileCount === 0) return 'A+';
    const hasCritical = issues.some(i => i.severity === 'critical');
    
    const totalPenalty = issues.reduce((acc, issue) => {
      switch (issue.severity) {
        case 'critical': return acc + 30;
        case 'warning':  return acc + 10;
        case 'info':     return acc + 2;
        default:         return acc;
      }
    }, 0);

    const scorePerFile = totalPenalty / fileCount;

    if (hasCritical) return 'F';
    if (scorePerFile === 0) return 'A+';
    if (scorePerFile < 5)   return 'A';
    if (scorePerFile < 15)  return 'B';
    if (scorePerFile < 30)  return 'C';
    if (scorePerFile < 50)  return 'D';
    return 'F';
  }

  getSummary(report: StaticReport) {
    const critical = report.issues.filter(i => i.severity === 'critical').length;
    const warnings = report.issues.filter(i => i.severity === 'warning').length;
    const info = report.issues.filter(i => i.severity === 'info').length;

    const byDetector: Record<string, number> = {};
    report.issues.forEach(issue => {
      const detectorType = issue.id.split('-')[0];
      byDetector[detectorType] = (byDetector[detectorType] || 0) + 1;
    });

    return { critical, warnings, info, byDetector };
  }
}