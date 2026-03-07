import { FileScanner } from './static/scanner';
import { StaticAnalyzer } from './static/analyzer';
import path from 'path';

async function testCompleteAnalysis() {
  console.log("\n" + "=".repeat(70));
  console.log("🩺 React Doctor - Complete Static Analysis Test");
  console.log("=".repeat(70));

  try {
    const scanner = new FileScanner();
    const targetDir = path.join(process.cwd(), 'tests', 'mock-react-project');
    
    const files = await scanner.findFiles(targetDir);

    if (files.length === 0) {
      console.log("⚠️  No React files found!");
      return;
    }

    const analyzer = new StaticAnalyzer();
    const report = await analyzer.analyze(files);

    // ======================================================================
    // 🏆 NEW: HEALTH GRADE SECTION
    // ======================================================================
    console.log("\n" + "=".repeat(70));
    console.log(`🏆 PROJECT HEALTH GRADE: ${report.grade}`);
    console.log("=".repeat(70));
    console.log(getDoctorRecommendation(report.grade));
    console.log("=".repeat(70));

    // Display basic stats
    console.log(`\n📊 Analysis Summary:`);
    console.log(`Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`Files analyzed: ${report.filesAnalyzed}`);
    console.log(`Total issues: ${report.issues.length}`);

    const summary = analyzer.getSummary(report);
    console.log(`\n🎯 Issues by Severity:`);
    console.log(`   🔴 Critical: ${summary.critical}`);
    console.log(`   🟡 Warnings: ${summary.warnings}`);
    console.log(`   🔵 Info: ${summary.info}`);

    console.log(`\n🔍 Issues by Type:`);
    Object.entries(summary.byDetector).forEach(([type, count]) => {
      console.log(`   ${type.padEnd(10)}: ${count}`);
    });

    // Display issues with corrected math
    const DISPLAY_LIMIT = 30;
    if (report.issues.length > 0) {
      console.log(`\n📋 Detailed Issues (showing up to ${DISPLAY_LIMIT}):`);
      console.log("-".repeat(70));
      
      report.issues.slice(0, DISPLAY_LIMIT).forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.file}:${issue.line}:${issue.column || 0}`);
        console.log(`   Component: ${issue.component}`);
        console.log(`   Severity: ${getSeverityIcon(issue.severity)} ${issue.severity}`);
        console.log(`   Message: ${issue.message}`);
        console.log(`   💡 Fix: ${issue.suggestion}`);
      });

      // Fixed the negative math bug here:
      if (report.issues.length > DISPLAY_LIMIT) {
        console.log(`\n... and ${report.issues.length - DISPLAY_LIMIT} more issue(s)`);
      }
    } else {
      console.log(`\n✨ No issues found! Your code is in peak condition!`);
    }

    console.log("\n" + "=".repeat(70));
    const reportPath = analyzer.saveReport(report);
    console.log("\n" + "=".repeat(70));
    console.log(`💾 JSON Report saved to: ${path.basename(reportPath)}`);
    console.log("=".repeat(70));

  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error((error as Error).message);
    process.exit(1);
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'warning': return '🟡';
    case 'info': return '🔵';
    default: return '⚪';
  }
}

/**
 * 🩺 Provides a clinical recommendation based on the grade
 */
function getDoctorRecommendation(grade: string): string {
  switch (grade) {
    case 'A+': case 'A': 
      return "✅ DOCTOR'S NOTE: Excellent health. Continue with regular checkups.";
    case 'B': 
      return "🟡 DOCTOR'S NOTE: Minor congestion detected. Consider cleaning up warnings.";
    case 'C': 
      return "⚠️  DOCTOR'S NOTE: Chronic issues found. Technical debt is accumulating.";
    case 'D': 
      return "🟠 DOCTOR'S NOTE: Patient in poor condition. Immediate refactoring advised.";
    case 'F': 
      return "🚨 DOCTOR'S NOTE: CRITICAL CONDITION. Fix infinite loops and memory leaks immediately!";
    default: 
      return "🩺 DOCTOR'S NOTE: Analysis inconclusive.";
  }
}

testCompleteAnalysis();

