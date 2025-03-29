import chalk from "chalk";
import type { Deviation } from "../ast/compare";

// Helper function to get line number from character index (1-based)
function getLineNumber(code: string, charIndex: number): number {
	if (charIndex < 0) return 1;
	// Count newline characters before the index + 1
	return code.substring(0, Math.min(charIndex, code.length)).split('\n').length;
}

export function generateDiffs(code1: string, code2: string, deviations: Deviation[]): void {
	if (deviations.length === 0) {
		console.log("No structural differences found based on AST comparison.");
		return;
	}

	const lines1 = code1.split('\n');
	const lines2 = code2.split('\n');
	const contextLines = 3; // Number of context lines above and below

	// Enhance deviations with line number information for sorting and processing
	const deviationsWithLines = deviations.map(dev => {
		const isRemoval = dev.type === 'removal';
		const code = isRemoval ? code1 : code2;
		const lines = isRemoval ? lines1 : lines2;
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
        // If start lines are the same, removals ('-') should ideally come before additions ('+')
        // for standard diff presentation, but AST deviations might not map perfectly.
        // Simple sort by startLine then start char position is usually sufficient.
        if (a.startLine !== b.startLine) {
            return a.startLine - b.startLine;
        }
        // If start lines are the same, sort by character position
        return a.start - b.start;
    });


	console.log(chalk.bold("Differences found:"));

	// --- Process Deviations and Print Diff Blocks ---
	// This attempts to merge or group output for nearby changes.
	let lastPrintedEndLineCode1 = 0;
    let lastPrintedEndLineCode2 = 0;

	for (let i = 0; i < deviationsWithLines.length; i++) {
		const deviation = deviationsWithLines[i];
		const isRemoval = deviation.type === 'removal';
		const lines = isRemoval ? lines1 : lines2;
        const currentLastPrinted = isRemoval ? lastPrintedEndLineCode1 : lastPrintedEndLineCode2;

		const { startLine, endLine } = deviation;

		// Calculate display boundaries, including context
		const displayStartLine = Math.max(1, startLine - contextLines);
		const displayEndLine = Math.min(lines.length, endLine + contextLines);

        // Check if this change block is contiguous or overlapping with the last printed block
        // for the *same file context* (code1 or code2). Add 1 to allow adjacent blocks to merge.
        const shouldPrintHeader = displayStartLine > currentLastPrinted + 1;


		if (shouldPrintHeader) {
			// Print a separator/header for non-contiguous blocks
			if (currentLastPrinted > 0) { // Don't print separator before the first block
				console.log(chalk.dim("..."));
			}
			// Simple header indicating the change area
            console.log(chalk.cyan(`--- Change block around line ${startLine} (${deviation.nodeType} ${deviation.type}) ---`));
		}

		// Print lines within the calculated display range for the current deviation's file context
		for (let lineNum = displayStartLine; lineNum <= displayEndLine; lineNum++) {
            // Only print lines that haven't been printed as part of the previous block's context/change
            // in the *same file*.
            if (lineNum <= currentLastPrinted && !shouldPrintHeader) {
                continue;
            }

			const lineIndex = lineNum - 1; // 0-based index
			if (lineIndex < 0 || lineIndex >= lines.length) continue; // Bounds check

			const lineContent = lines[lineIndex];
            const lineNumberStr = lineNum.toString().padStart(4); // Pad line number for alignment

			if (lineNum >= startLine && lineNum <= endLine) {
				// This line is part of the deviation
				if (isRemoval) {
					console.log(chalk.red(`-${lineNumberStr}: ${lineContent}`));
				} else { // Addition
					console.log(chalk.green(`+${lineNumberStr}: ${lineContent}`));
				}
			} else {
				// This is a context line
				console.log(` ${lineNumberStr}: ${lineContent}`);
			}
		}

        // Update the last printed line number for the appropriate file context
        if (isRemoval) {
            lastPrintedEndLineCode1 = displayEndLine;
        } else {
            lastPrintedEndLineCode2 = displayEndLine;
        }
	}
}