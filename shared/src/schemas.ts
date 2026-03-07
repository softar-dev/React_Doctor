import * as v from 'valibot';

// Valibot schemas for validation
export const WebVitalsSchema = v.object({
  lcp: v.number(),
  fcp: v.number(),
  cls: v.number(),
  inp: v.number(),
  ttfb: v.number(),
});

export const ComponentIssueSchema = v.object({
  id: v.string(),
  component: v.string(),
  file: v.string(),
  line: v.number(),
  severity: v.picklist(['critical', 'warning', 'info']),
  message: v.string(),
  suggestion: v.string(),
});

export const StaticReportSchema = v.object({
  timestamp: v.string(),
  issues: v.array(ComponentIssueSchema),
  bundleSize: v.number(),
  componentCount: v.number(),
});

export const RuntimeReportSchema = v.object({
  timestamp: v.string(),
  metrics: WebVitalsSchema,
  rerenders: v.record(v.string(), v.number()),
  commitDurations: v.array(v.number()),
});

export const SuggestionSchema = v.object({
  id: v.string(),
  title: v.string(),
  description: v.string(),
  severity: v.picklist(['critical', 'warning', 'info']),
  affectedComponent: v.optional(v.string()),
  fix: v.string(),
});

export const FinalReportSchema = v.object({
  projectName: v.string(),
  analyzedAt: v.string(),
  static: StaticReportSchema,
  runtime: RuntimeReportSchema,
  suggestions: v.array(SuggestionSchema),
  performanceScore: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
});

///lol