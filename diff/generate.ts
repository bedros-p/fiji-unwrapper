import chalk from "chalk";
import type { Deviation } from "../ast/compare";

// Cache for line start indices to avoid recalculating
// Maps code strings to an array containing the character index where each line starts.
const lineStartCache = new Map<string, number[]>();


// Helper function to get line number from character index (1-based)
function getLineNumber(code: string, charIndex: number): number {
	// Assumes a cache `lineStartCache` (e.g., WeakMap<string, number[]>) exists in the outer scope.
	// `lineStartCache` maps code strings to arrays of character indices where each line starts.
	if (charIndex < 0) return 1;
	const safeCharIndex = Math.min(charIndex, code.length); // Ensure charIndex is within bounds

	let lineStarts: number[] | undefined = lineStartCache.get(code);

	if (!lineStarts) {
		// Calculate line starts if not cached for this code string
		lineStarts = [0]; // Line 1 starts at index 0
		const newlineRegex = /\n/g;
		let match;
		while ((match = newlineRegex.exec(code)) !== null) {
			// The character index immediately *after* the newline is the start of the next line.
			lineStarts.push(match.index + 1);
		}
		lineStartCache.set(code, lineStarts);
	}

	// Find the line number using the cached line starts via binary search.
	// We are looking for the largest index `i` such that lineStarts[i] <= safeCharIndex.
	// The line number will be `i + 1`.
	let low = 0;
	let high = lineStarts.length - 1;
	let line = 1; // Default to line 1 if charIndex is before the start of line 2

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		if (lineStarts[mid] <= safeCharIndex) {
			// This line starts at or before the character index.
			// It's a potential candidate. Record it and search higher.
			line = mid + 1;
			low = mid + 1;
		} else {
			// This line starts *after* the character index. Search lower.
			high = mid - 1;
		}
	}

	return line;
}

export function generateDiffs(code1: string, code2: string, deviations: Deviation[]): void {
	if (deviations.length === 0) {
		console.log("No structural differences found based on AST comparison.");
		return;
	}

	const lines1 = code1.split('\n');
	const lines2 = code2.split('\n');
	const contextLines = 2; // Number of context lines above and below

	// Enhance deviations with line number information for sorting and processing

    // These two SWALLOW memory. the map operation is notorious for this.
	const deviationsWithLines = deviations.map(dev => {
		const isRemoval = dev.type === 'removal';
		const code = isRemoval ? code1 : code2;
		// const lines = isRemoval ? lines1 : lines2; // Not needed here anymore
		const startLine = getLineNumber(code, dev.start);
		// Get the line the node *ends* on. Use end-1 unless end is 0 or start==end.
		// If end is exactly on a newline, it belongs to the previous line.
		const endCharIndexForLine = (dev.end > dev.start && dev.end > 0) ? dev.end - 1 : dev.start;
		const endLine = getLineNumber(code, endCharIndexForLine);

		// Ensure endLine is at least startLine
		const correctedEndLine = Math.max(startLine, endLine);

		return { ...dev, startLine, endLine: correctedEndLine };
	}).sort((a, b) => {
        // Sort primarily by the starting line number of the change.
        // Simple sort by startLine then start char position is usually sufficient.
        if (a.startLine !== b.startLine) {
            return a.startLine - b.startLine;
        }
        // If start lines are the same, sort by character position
        return a.start - b.start;
        // Future enhancement: could sort removals before additions at the same line for classic diff feel
    });


	console.log(chalk.bold("Differences found (Side-by-Side):"));
    console.log(chalk.dim("--- File 1 (Original) --- | --- File 2 (Modified) ---"));

	// --- Process Deviations and Print Side-by-Side Diff Blocks ---

    // Get terminal width for layout
    const totalWidth = process.stdout.columns || 80; // Default to 80 columns if unavailable
    const gutterWidth = 1; // Space for the central separator '│'
    const lineNumberWidth = 5; // e.g., "-123:" or "+123:" or " 123:" (prefix + 4 digits + colon)
    const lineNumPrefixSpace = 1; // Space after the line number/prefix
    const leftIndentWidth = lineNumberWidth + lineNumPrefixSpace; // Total width before left content starts
    // Calculate available width for content per side
    const availableContentWidth = totalWidth - (leftIndentWidth * 2) - gutterWidth;
    const halfWidth = Math.max(10, Math.floor(availableContentWidth / 2)); // Ensure minimum width

    // Helper function to format one side of the diff line
    function formatSide(
        lineNum: number | null,
        content: string | undefined,
        width: number,
        prefix: string,
        colorizer: (s: string) => string = chalk.reset,
        highlight: boolean = false
    ): string {
        // Format line number part (prefix + number + :)
        const numStr = lineNum !== null
            ? (prefix + String(lineNum)).padEnd(lineNumberWidth -1) + ":" // Pad prefix+num, add colon
            : "".padStart(lineNumberWidth); // Empty space if no line number

        const contStr = content !== undefined ? content : "";
        // Truncate content if it exceeds width
        const truncatedContent = contStr.length > width ? contStr.substring(0, width - 1) + "…" : contStr;
        // Combine number string, space, and padded/truncated content
        const text = `${numStr}${" ".repeat(lineNumPrefixSpace)}${truncatedContent.padEnd(width)}`;
        return highlight ? colorizer(text) : colorizer(text); // Apply colorizer (chalk)
    }

	let lastPrintedUnifiedEndLine = 0;

	for (const deviation of deviationsWithLines) {
		const isRemoval = deviation.type === 'removal';
		const { startLine, endLine } = deviation; // Line numbers in the file where the change occurred

		// Calculate display range including context lines
        // The range is based on the deviation's location
		const displayStartLine = Math.max(1, startLine - contextLines);
		const displayEndLine = Math.min(Math.max(lines1.length, lines2.length), endLine + contextLines);

		// Check for a gap between the last printed block and the current one
		if (displayStartLine > lastPrintedUnifiedEndLine + 1 && lastPrintedUnifiedEndLine > 0) {
            // Print a separator for non-contiguous blocks
            const separatorText = "...";
            // Calculate padding to center the separator roughly in the middle, accounting for left indent
            const spaceForSeparator = totalWidth - leftIndentWidth; // Space available after left indent
            const padding = Math.max(0, Math.floor((spaceForSeparator - separatorText.length) / 2));
            console.log(chalk.dim(" ".repeat(leftIndentWidth) + " ".repeat(padding) + separatorText));
		}

        // Determine the actual starting line number to print for this block, avoiding overlaps
        const printStart = Math.max(displayStartLine, lastPrintedUnifiedEndLine + 1);

		// Print lines within the calculated display range for the current deviation
		for (let lineNum = printStart; lineNum <= displayEndLine; lineNum++) {
			const lineIndex = lineNum - 1; // 0-based index
			const line1Content = lines1[lineIndex];
			const line2Content = lines2[lineIndex];

            // Determine line status: context, removal, or addition
            const isLineInDeviationRange = lineNum >= startLine && lineNum <= endLine;

            let leftPrefix = " ";
            let rightPrefix = " ";
            let leftColor = chalk.reset;
            let rightColor = chalk.reset;
            let leftHighlight = false;
            let rightHighlight = false;
            let leftNum: number | null = lineNum;
            let rightNum: number | null = lineNum;

            // Handle lines potentially outside the bounds of one file
            if (lineIndex >= lines1.length) {
                 leftNum = null;
                 // Don't dim right side if left side simply doesn't exist
            }
             if (lineIndex >= lines2.length) {
                 rightNum = null;
                 // Don't dim left side if right side simply doesn't exist
             }


            if (isLineInDeviationRange) {
                if (isRemoval) {
                    leftPrefix = "-";
                    leftColor = chalk.red;
                    leftHighlight = true;
                    // Dim the corresponding line on the right side only if it exists
                    if (rightNum !== null) {
                        rightColor = chalk.dim;
                    }
                } else { // Addition
                    rightPrefix = "+";
                    rightColor = chalk.green;
                    rightHighlight = true;
                     // Dim the corresponding line on the left side only if it exists
                    if (leftNum !== null) {
                        leftColor = chalk.dim;
                    }
                }
            } else {
                 // Context line: Dim slightly if desired, or keep normal
                 // leftColor = chalk.dim;
                 // rightColor = chalk.dim;
            }

            // Format both sides
            const leftFormatted = formatSide(leftNum, line1Content, halfWidth, leftPrefix, leftColor, leftHighlight);
            const rightFormatted = formatSide(rightNum, line2Content, halfWidth, rightPrefix, rightColor, rightHighlight);

            // Print the combined side-by-side line
			console.log(`${leftFormatted}${chalk.dim("│")}${rightFormatted}`);
		}

        // Update the last line number printed for the unified view
        lastPrintedUnifiedEndLine = Math.max(lastPrintedUnifiedEndLine, displayEndLine);
	}
}