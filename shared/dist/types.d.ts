export interface WebVitals {
    lcp: number;
    fcp: number;
    cls: number;
    inp: number;
    ttfb: number;
}
export interface ComponentIssue {
    id: string;
    component: string;
    file: string;
    line: number;
    severity: "critical" | "warning" | "info";
    message: string;
    suggestion: string;
}
export interface StaticReport {
    timestamp: string;
    issues: ComponentIssue[];
    bundleSize: number;
    componentCount: number;
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
