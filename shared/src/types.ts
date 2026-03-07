export interface WebVitals {
    lcp: number; // Largest Contentful Paint
    fcp: number; // First Contentful Paint
    cls: number; // Cumulative Layout Shift
    inp: number; // Interaction to Next Paint
    ttfb: number; // Time to First Byte
}

export interface ComponentIssue {
    id: string;
    component: string;
    file: string;
    line: number;
    severity: "critical" | "warning" | "info";
    message: string;
    column?: number;
    suggestion: string;
}

export interface StaticReport {
    timestamp: string;
    issues: ComponentIssue[];
    filesAnalyzed: number;
    filesFailed: number;
    componentCount: number;
    grade: string;
}

export interface RuntimeReport {
    timestamp: string;
    metrics: WebVitals;
    rerenders: Record<string, number>;
    commitDurations: number[];
}

export interface Suggestion {
    id: string;
    title: string;
    description: string;
    severity: "critical" | "warning" | "info";
    affectedComponent?: string;
    fix: string;
}

export interface FinalReport {
    projectName: string;
    analyzedAt: string;
    static: StaticReport;
    runtime: RuntimeReport;
    suggestions: Suggestion[];
    performanceScore: number; 
}
