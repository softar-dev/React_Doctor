"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinalReportSchema = exports.SuggestionSchema = exports.RuntimeReportSchema = exports.StaticReportSchema = exports.ComponentIssueSchema = exports.WebVitalsSchema = void 0;
const v = __importStar(require("valibot"));
// Valibot schemas for validation
exports.WebVitalsSchema = v.object({
    lcp: v.number(),
    fcp: v.number(),
    cls: v.number(),
    inp: v.number(),
    ttfb: v.number(),
});
exports.ComponentIssueSchema = v.object({
    id: v.string(),
    component: v.string(),
    file: v.string(),
    line: v.number(),
    severity: v.picklist(['critical', 'warning', 'info']),
    message: v.string(),
    suggestion: v.string(),
});
exports.StaticReportSchema = v.object({
    timestamp: v.string(),
    issues: v.array(exports.ComponentIssueSchema),
    bundleSize: v.number(),
    componentCount: v.number(),
});
exports.RuntimeReportSchema = v.object({
    timestamp: v.string(),
    metrics: exports.WebVitalsSchema,
    rerenders: v.record(v.string(), v.number()),
    commitDurations: v.array(v.number()),
});
exports.SuggestionSchema = v.object({
    id: v.string(),
    title: v.string(),
    description: v.string(),
    severity: v.picklist(['critical', 'warning', 'info']),
    affectedComponent: v.optional(v.string()),
    fix: v.string(),
});
exports.FinalReportSchema = v.object({
    projectName: v.string(),
    analyzedAt: v.string(),
    static: exports.StaticReportSchema,
    runtime: exports.RuntimeReportSchema,
    suggestions: v.array(exports.SuggestionSchema),
    performanceScore: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
});
