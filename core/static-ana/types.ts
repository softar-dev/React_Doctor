/**
 * Represents a single issue found in a component
 */
export interface ComponentIssue {
  id: string;              // Unique identifier (e.g., "large-component-App.tsx-12")
  component: string;       // Component name (e.g., "UserDashboard")
  file: string;            // File path
  line: number;            // Line number where issue was found
  column?: number;         // Column number (optional)
  severity: 'critical' | 'warning' | 'info';
  message: string;         // What's wrong (e.g., "Component is 450 lines")
  suggestion: string;      // How to fix it (e.g., "Split into smaller components")
}

/**
 * Complete static analysis report
 */
export interface StaticReport {
  timestamp: string;
  componentCount: number;  // Number of components analyzed
  issues: ComponentIssue[];
  filesAnalyzed: number;
  filesFailed: number;
  grade: string;
}