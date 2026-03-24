import * as v from 'valibot';

export declare const WebVitalsSchema: v.ObjectSchema<{
    readonly lcp: v.NumberSchema<undefined>;
    readonly fcp: v.NumberSchema<undefined>;
    readonly cls: v.NumberSchema<undefined>;
    readonly inp: v.NumberSchema<undefined>;
    readonly ttfb: v.NumberSchema<undefined>;
}, undefined>;
export declare const ComponentIssueSchema: v.ObjectSchema<{
    readonly id: v.StringSchema<undefined>;
    readonly component: v.StringSchema<undefined>;
    readonly file: v.StringSchema<undefined>;
    readonly line: v.NumberSchema<undefined>;
    readonly severity: v.PicklistSchema<["critical", "warning", "info"], undefined>;
    readonly message: v.StringSchema<undefined>;
    readonly suggestion: v.StringSchema<undefined>;
}, undefined>;
export declare const StaticReportSchema: v.ObjectSchema<{
    readonly timestamp: v.StringSchema<undefined>;
    readonly issues: v.ArraySchema<v.ObjectSchema<{
        readonly id: v.StringSchema<undefined>;
        readonly component: v.StringSchema<undefined>;
        readonly file: v.StringSchema<undefined>;
        readonly line: v.NumberSchema<undefined>;
        readonly severity: v.PicklistSchema<["critical", "warning", "info"], undefined>;
        readonly message: v.StringSchema<undefined>;
        readonly suggestion: v.StringSchema<undefined>;
    }, undefined>, undefined>;
    readonly bundleSize: v.NumberSchema<undefined>;
    readonly componentCount: v.NumberSchema<undefined>;
}, undefined>;
export declare const RuntimeReportSchema: v.ObjectSchema<{
    readonly timestamp: v.StringSchema<undefined>;
    readonly metrics: v.ObjectSchema<{
        readonly lcp: v.NumberSchema<undefined>;
        readonly fcp: v.NumberSchema<undefined>;
        readonly cls: v.NumberSchema<undefined>;
        readonly inp: v.NumberSchema<undefined>;
        readonly ttfb: v.NumberSchema<undefined>;
    }, undefined>;
    readonly rerenders: v.RecordSchema<v.StringSchema<undefined>, v.NumberSchema<undefined>, undefined>;
    readonly commitDurations: v.ArraySchema<v.NumberSchema<undefined>, undefined>;
}, undefined>;
export declare const SuggestionSchema: v.ObjectSchema<{
    readonly id: v.StringSchema<undefined>;
    readonly title: v.StringSchema<undefined>;
    readonly description: v.StringSchema<undefined>;
    readonly severity: v.PicklistSchema<["critical", "warning", "info"], undefined>;
    readonly affectedComponent: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly fix: v.StringSchema<undefined>;
}, undefined>;
export declare const FinalReportSchema: v.ObjectSchema<{
    readonly projectName: v.StringSchema<undefined>;
    readonly analyzedAt: v.StringSchema<undefined>;
    readonly static: v.ObjectSchema<{
        readonly timestamp: v.StringSchema<undefined>;
        readonly issues: v.ArraySchema<v.ObjectSchema<{
            readonly id: v.StringSchema<undefined>;
            readonly component: v.StringSchema<undefined>;
            readonly file: v.StringSchema<undefined>;
            readonly line: v.NumberSchema<undefined>;
            readonly severity: v.PicklistSchema<["critical", "warning", "info"], undefined>;
            readonly message: v.StringSchema<undefined>;
            readonly suggestion: v.StringSchema<undefined>;
        }, undefined>, undefined>;
        readonly bundleSize: v.NumberSchema<undefined>;
        readonly componentCount: v.NumberSchema<undefined>;
    }, undefined>;
    readonly runtime: v.ObjectSchema<{
        readonly timestamp: v.StringSchema<undefined>;
        readonly metrics: v.ObjectSchema<{
            readonly lcp: v.NumberSchema<undefined>;
            readonly fcp: v.NumberSchema<undefined>;
            readonly cls: v.NumberSchema<undefined>;
            readonly inp: v.NumberSchema<undefined>;
            readonly ttfb: v.NumberSchema<undefined>;
        }, undefined>;
        readonly rerenders: v.RecordSchema<v.StringSchema<undefined>, v.NumberSchema<undefined>, undefined>;
        readonly commitDurations: v.ArraySchema<v.NumberSchema<undefined>, undefined>;
    }, undefined>;
    readonly suggestions: v.ArraySchema<v.ObjectSchema<{
        readonly id: v.StringSchema<undefined>;
        readonly title: v.StringSchema<undefined>;
        readonly description: v.StringSchema<undefined>;
        readonly severity: v.PicklistSchema<["critical", "warning", "info"], undefined>;
        readonly affectedComponent: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
        readonly fix: v.StringSchema<undefined>;
    }, undefined>, undefined>;
    readonly performanceScore: v.SchemaWithPipe<readonly [v.NumberSchema<undefined>, v.MinValueAction<number, 0, undefined>, v.MaxValueAction<number, 100, undefined>]>;
}, undefined>;
