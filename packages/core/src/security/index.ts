/**
 * Security scanning module for capability supply-chain safety
 *
 * Provides opt-in scanning for:
 * - Suspicious Unicode characters (bidi overrides, zero-width, control chars)
 * - Symlinks that escape capability directories
 * - Suspicious script patterns in hooks
 */

export * from "./scanner.js";
export * from "./types.js";
