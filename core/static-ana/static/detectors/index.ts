/**
 * Central export for all detectors
 */

export { detectConsoleLogs } from './console-log';
export { detectLargeComponents } from './large-component';
export { detectInlineFunctions } from './inline-function';
export { detectMissingKeys } from './missing-key';
export { detectInfiniteLoops } from './effect-loop';
export { detectPropDrilling } from './prop-drilling';
export { detectMissingMemo } from './missing-memo';
export { detectInlineStyles } from './inline-style';
export { detectDeadCode } from './dead-code';
// As you build more detectors, export them here
// export { detectMissingKeys } from './missing-key';
// export { detectMissingMemo } from './missing-memo';