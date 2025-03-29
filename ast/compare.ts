import * as acorn from 'acorn';
import { getNodeDescription } from './utils';

/**
 * Defines the structure for reporting a deviation between two ASTs.
 */
export interface Deviation {
	/** Indicates whether the change is an addition or removal relative to the first AST. */
	type: 'addition' | 'removal';
	/** The starting character position of the deviated node in its respective source code. */
	start: number;
	/** The ending character position of the deviated node in its respective source code. */
	end: number;
	/** The type of the AST node involved in the deviation (e.g., 'FunctionDeclaration', 'Literal'). */
	nodeType: string;
	/** A brief description or the value of the node (e.g., string literal value). */
	description?: string;
}


/**
 * Recursively compares two AST nodes and returns a list of structural deviations.
 *
 * It ignores differences in variable names (Identifier nodes) but considers
 * changes in string literal values as significant structural deviations.
 * Other literal types (numbers, booleans, etc.) and comments are ignored.
 * Positional information (start, end, loc, range) and raw representations are ignored.
 *
 * @param node1 The first AST node (or null).
 * @param node2 The second AST node (or null).
 * @returns An array of `Deviation` objects describing the differences found.
 */
export function compareASTs(node1: acorn.Node | null, node2: acorn.Node | null): Deviation[] {
	const deviations: Deviation[] = [];

	// --- Base Cases ---
	if (!node1 && node2) {
		// Node added in the second AST
		deviations.push({
			type: 'addition',
			start: node2.start,
			end: node2.end,
			nodeType: node2.type,
			description: getNodeDescription(node2)
		});
		// Base case additions/removals are inherently novel, no need to filter here.
		return deviations;
	}
	if (node1 && !node2) {
		// Node removed from the first AST
		deviations.push({
			type: 'removal',
			start: node1.start,
			end: node1.end,
			nodeType: node1.type,
			description: getNodeDescription(node1)
		});
		// Base case additions/removals are inherently novel, no need to filter here.
		return deviations;
	}
	if (!node1 && !node2) {
		// Both are null, no difference
		return deviations;
	}
    // Both nodes exist from here
    if (!node1 || !node2) return deviations; // Should be unreachable due to above checks, but satisfies TS

	// --- Type Check ---
	if (node1.type !== node2.type) {
		// Fundamental difference in node type. Report node1 removed, node2 added.
		// These are considered novel changes, not moves.
		deviations.push({
			type: 'removal',
			start: node1.start,
			end: node1.end,
			nodeType: node1.type,
			description: getNodeDescription(node1)
		});
		deviations.push({
			type: 'addition',
			start: node2.start,
			end: node2.end,
			nodeType: node2.type,
			description: getNodeDescription(node2)
		});
		// Don't compare children if the parent types fundamentally differ.
		return deviations;
	}

	// --- Node-Specific Rules ---

	// Rule: Ignore variable name changes. Treat all Identifiers as structurally equivalent *unless*
    // they are property names in MemberExpressions or ObjectExpressions/ClassDeclarations where the name matters.
    // Simple approach: Ignore all Identifiers for now as per original prompt.
	if (node1.type === 'Identifier') {
		return deviations; // No difference reported for Identifiers
	}

	// Rule: String changes are important. Compare Literal nodes only if they contain strings.
	if (node1.type === 'Literal') {
		// We know node2 is also Literal due to the type check above.
		const lit1 = node1 as acorn.Literal;
		const lit2 = node2 as acorn.Literal;

		const isString1 = typeof lit1.value === 'string';
		const isString2 = typeof lit2.value === 'string';

		if (isString1 !== isString2 || (isString1 && lit1.value !== lit2.value)) {
			// Different literal types (string vs non-string) or different string values.
			// These are considered novel changes.
			deviations.push({
				type: 'removal',
				start: node1.start,
				end: node1.end,
				nodeType: node1.type,
				description: `Literal: ${lit1.raw}` // Use raw for better matching potential if needed later
			});
			deviations.push({
				type: 'addition',
				start: node2.start,
				end: node2.end,
				nodeType: node2.type,
				description: `Literal: ${lit2.raw}` // Use raw for better matching potential
			});
			return deviations;
		}
		// Ignore differences in non-string literal values (numbers, booleans, null, regex).
		return deviations;
	}

	// --- Generic Comparison for Other Node Types ---

	// Define properties to ignore during structural comparison.
	const keysToIgnore = new Set([
		'type',   // Already checked
		'start',  // Positional info
		'end',    // Positional info
		'loc',    // Positional info
		'range',  // Positional info
		'raw',    // Raw source representation (e.g., for Literals, already handled)
		'comments', // Attached comments
		// Acorn-specific metadata or potentially irrelevant details
        'leadingComments',
        'trailingComments',
        'innerComments',
        'extra', // Often contains raw values or parenthesis info
	]);

	// Get the list of relevant property keys for each node.
	const keys1 = Object.keys(node1).filter(k => !keysToIgnore.has(k));
	const keys2 = Object.keys(node2).filter(k => !keysToIgnore.has(k));

    // Check if the set of relevant keys is the same. Differences might indicate
    // optional properties being added/removed (e.g., `async` on FunctionDeclaration).
    // For simplicity, treat key differences as a modification of the parent node.
    const keySet1 = new Set(keys1);
    const keySet2 = new Set(keys2);
    if (keys1.length !== keys2.length || !keys1.every(k => keySet2.has(k)) || !keys2.every(k => keySet1.has(k))) {
        // Treat as fundamental change to parent, report as novel add/remove
        deviations.push({ type: 'removal', start: node1.start, end: node1.end, nodeType: node1.type, description: `Keys changed: ${keys1.join()}` });
        deviations.push({ type: 'addition', start: node2.start, end: node2.end, nodeType: node2.type, description: `Keys changed: ${keys2.join()}` });
        return deviations; // Stop comparison here if fundamental properties changed
    }

    let accumulatedDeviations: Deviation[] = [];

	// Iterate through the common relevant keys and compare their values.
	for (const key of keys1) {
		const val1 = (node1 as any)[key];
		const val2 = (node2 as any)[key];

		// Helper functions to check if a value is an AST node or an array of AST nodes.
		// Use a more robust check if possible, this is a heuristic.
		const isNode = (v: any): v is acorn.Node => v && typeof v === 'object' && v !== null && typeof v.type === 'string' && typeof v.start === 'number' && typeof v.end === 'number';
		const isNodeArray = (v: any): v is acorn.Node[] => Array.isArray(v) && v.every(item => item === null || isNode(item)); // Allow nulls in arrays (e.g., empty elements in ArrayExpression)

		if (isNode(val1) || isNode(val2)) {
            // If one is a node and the other isn't (or both are nodes), compare recursively.
			accumulatedDeviations.push(...compareASTs(isNode(val1) ? val1 : null, isNode(val2) ? val2 : null));
		} else if (isNodeArray(val1) && isNodeArray(val2)) {
			// If both values are arrays of AST nodes, compare them element by element.
			const maxLength = Math.max(val1.length, val2.length);
			for (let i = 0; i < maxLength; i++) {
				const child1 = i < val1.length ? val1[i] : null;
				const child2 = i < val2.length ? val2[i] : null;
                // Only compare if at least one child exists (handles trailing nulls if needed)
                if (child1 || child2) {
				    accumulatedDeviations.push(...compareASTs(child1, child2));
                }
			}
		} else if (Array.isArray(val1) && Array.isArray(val2)) {
            // Both are arrays, but not node arrays (or mixed content).
            // Perform a simple comparison for non-node arrays (e.g., TemplateElement quasis).
            // If they differ in length or content, mark the parent node as changed.
            if (val1.length !== val2.length || JSON.stringify(val1) !== JSON.stringify(val2)) {
                 // Treat as fundamental change to parent, report as novel add/remove
                 accumulatedDeviations.push({ type: 'removal', start: node1.start, end: node1.end, nodeType: node1.type, description: `Non-node array changed in key '${key}'` });
                 accumulatedDeviations.push({ type: 'addition', start: node2.start, end: node2.end, nodeType: node2.type, description: `Non-node array changed in key '${key}'` });
                 // Treat as fundamental change to parent, stop comparing children of this node.
                 // Filter moves before returning
                 return filterMoves(accumulatedDeviations);
            }
        } else if (val1 !== val2) {
			// If the values are primitives (or other non-node, non-array objects) and differ,
			// consider it a structural difference affecting the parent node.
			// This catches changes in properties like:
			// - `operator` in BinaryExpression ('+' vs '-')
			// - `kind` in VariableDeclaration ('var' vs 'let')
			// - `computed`, `static`, `method`, `shorthand` flags in properties/methods
			// We have already explicitly handled Identifiers and string Literals above.
            // Treat as fundamental change to parent, report as novel add/remove
			accumulatedDeviations.push({
				type: 'removal',
				start: node1.start,
				end: node1.end,
				nodeType: node1.type,
				description: `Property '${key}' changed from '${val1}'`
			});
			accumulatedDeviations.push({
				type: 'addition',
				start: node2.start,
				end: node2.end,
				nodeType: node2.type,
				description: `Property '${key}' changed to '${val2}'`
			});
			// Treat primitive property change as fundamental, stop comparing children of this node.
            // Filter moves before returning
			return filterMoves(accumulatedDeviations);
		}
		// If values are equal primitives, or recursively compared nodes/arrays yielded no deviations, continue checking other keys.
	}

	// If all relevant properties have been compared and no significant differences found according to the rules,
	// return the accumulated deviations (which might be empty or contain changes from deeper nodes).
    // Filter out moves before returning the final list for this level.
	return filterMoves(accumulatedDeviations);
}

/**
 * Filters a list of deviations, removing pairs of additions and removals
 * that likely represent the same node being moved. Matching is based on
 * nodeType and description.
 *
 * @param deviations The list of deviations to filter.
 * @returns A filtered list containing only novel additions and removals.
 */
function filterMoves(deviations: Deviation[]): Deviation[] {
    const removals = deviations.filter(d => d.type === 'removal');
    const additions = deviations.filter(d => d.type === 'addition');

    if (removals.length === 0 || additions.length === 0) {
        return deviations; // No potential moves if one list is empty
    }

    const matchedAdditionIndices = new Set<number>();
    const finalDeviations: Deviation[] = [];

    // Create a map of additions for efficient lookup
    // Key: `${nodeType}::${description}`, Value: Array of indices in the 'additions' array
    const additionMap = new Map<string, number[]>();
    additions.forEach((addition, index) => {
        const key = `${addition.nodeType}::${addition.description || ''}`;
        if (!additionMap.has(key)) {
            additionMap.set(key, []);
        }
        additionMap.get(key)!.push(index);
    });

    // Try to match each removal with an addition
    for (const removal of removals) {
        const key = `${removal.nodeType}::${removal.description || ''}`;
        const potentialMatches = additionMap.get(key);

        if (potentialMatches && potentialMatches.length > 0) {
            // Found a potential match. Use the first available one.
            const matchIndex = potentialMatches.shift(); // Remove index from map value array
            if (matchIndex !== undefined) {
                 matchedAdditionIndices.add(matchIndex);
                 // This removal is part of a move, so don't add it to finalDeviations
            } else {
                 // Should not happen if potentialMatches.length > 0, but defensively add removal
                 finalDeviations.push(removal);
            }
             if (potentialMatches.length === 0) {
                 additionMap.delete(key); // Clean up map if no more additions of this type
             }
        } else {
            // No matching addition found, this is a novel removal
            finalDeviations.push(removal);
        }
    }

    // Add all additions that were not matched
    additions.forEach((addition, index) => {
        if (!matchedAdditionIndices.has(index)) {
            finalDeviations.push(addition);
        }
    });

    return finalDeviations;
}