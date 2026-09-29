import type { AutocompleteResponse, ResolvedOptions, Suggestion } from "./types";
export declare function lookupFilter(suggestion: Suggestion, _originalQuery: string, queryLowerCase: string, options?: ResolvedOptions): boolean;
export declare function transformResult(response: string | AutocompleteResponse): AutocompleteResponse;
export declare function formatResult(suggestion: Suggestion, currentValue: string, _index?: number, options?: ResolvedOptions): string;
export declare function formatGroup(_suggestion: Suggestion, category: string): string;
