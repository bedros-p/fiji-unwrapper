import * as acorn from 'acorn';

/**
 * Generates an Abstract Syntax Tree (AST) from a given JavaScript code string.
 *
 * @param code The JavaScript code string to parse.
 * @param options Optional acorn parsing options. Defaults will be used if not provided.
 * @returns The root node (Program) of the generated AST.
 * @throws {Error} If parsing fails.
 */
export function generateAST(code: string, options?: acorn.Options): acorn.Node {
	try {

		const defaultOptions: acorn.Options = {
			ecmaVersion: 'latest',
			sourceType: 'script',
			locations: true,
			ranges: true,
		};

		const parseOptions = { ...defaultOptions, ...options };

		const ast = acorn.parse(code, parseOptions);

		return ast as acorn.Node;
	} catch (error) {
		console.error("Error parsing JavaScript code into AST:", error);
		throw error;
	}
}