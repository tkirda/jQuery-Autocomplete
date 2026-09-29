import type { AutocompleteResponse, ResolvedOptions, Suggestion } from "./types";
import { utils } from "./utils";

export function lookupFilter(
    suggestion: Suggestion,
    _originalQuery: string,
    queryLowerCase: string,
    options?: ResolvedOptions
): boolean {
    if (options?.ignoreDiacritics) {
        return foldText(suggestion.value).text.indexOf(foldText(queryLowerCase).text) !== -1;
    }
    return suggestion.value.toLowerCase().indexOf(queryLowerCase) !== -1;
}

export function transformResult(response: string | AutocompleteResponse): AutocompleteResponse {
    return typeof response === "string" ? (JSON.parse(response) as AutocompleteResponse) : response;
}

export function formatResult(
    suggestion: Suggestion,
    currentValue: string,
    _index?: number,
    options?: ResolvedOptions
): string {
    if (!currentValue) {
        // Same escaping channel as formatGroup — let the browser handle entities
        // so an HTML-bearing suggestion.value can't break out of the text node.
        const span = document.createElement("span");
        span.textContent = suggestion.value;
        return span.innerHTML;
    }

    if (options?.ignoreDiacritics) {
        return highlightFolded(suggestion.value, currentValue);
    }

    const pattern = "(" + utils.escapeRegExChars(currentValue) + ")";

    return escapeHtml(
        suggestion.value.replace(new RegExp(pattern, "gi"), "<strong>$1</strong>")
    ).replace(/&lt;(\/?strong)&gt;/g, "<$1>");
}

export function formatGroup(_suggestion: Suggestion, category: string): string {
    const div = document.createElement("div");
    div.className = "autocomplete-group";
    div.textContent = category;
    return div.outerHTML;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

interface FoldedText {
    text: string;
    // For each UTF-16 unit of `text`, the [start, end) range of the source
    // character it came from — lets a match in folded text be mapped back.
    starts: number[];
    ends: number[];
}

// Lowercases and strips combining marks one character at a time, so every
// folded unit traces back to exactly one source character. Filtering and
// highlighting share this function so they always agree on what matches.
function foldText(value: string): FoldedText {
    const folded: FoldedText = { text: "", starts: [], ends: [] };
    let offset = 0;
    for (const char of value) {
        const end = offset + char.length;
        const piece = char.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC").toLowerCase();
        // A standalone combining mark folds to nothing; attach it to the
        // preceding character so a highlight doesn't split them apart.
        for (let k = folded.ends.length - 1; !piece && k >= 0 && folded.ends[k] === offset; k--) {
            folded.ends[k] = end;
        }
        for (let i = 0; i < piece.length; i++) {
            folded.starts.push(offset);
            folded.ends.push(end);
        }
        folded.text += piece;
        offset = end;
    }
    return folded;
}

function highlightFolded(value: string, currentValue: string): string {
    const query = foldText(currentValue).text;
    if (!query) {
        return escapeHtml(value);
    }

    const folded = foldText(value);
    let html = "";
    let last = 0;
    let from = 0;
    let hit: number;
    while ((hit = folded.text.indexOf(query, from)) !== -1) {
        // A match can begin inside a character that folds to several units
        // and was already consumed by the previous match.
        const start = Math.max(folded.starts[hit]!, last);
        const end = folded.ends[hit + query.length - 1]!;
        html += escapeHtml(value.slice(last, start));
        html += "<strong>" + escapeHtml(value.slice(start, end)) + "</strong>";
        last = end;
        from = hit + query.length;
    }
    return html + escapeHtml(value.slice(last));
}
