import * as acorn from 'acorn';

export function getNodeDescription(node: acorn.Node | null): string | undefined {
    if (!node) return undefined;

    // Provide specific descriptions for common node types
    switch (node.type) {
        case 'Identifier':
            return `Identifier: ${(node as acorn.Identifier).name}`;
        case 'Literal':
            // Use raw value to represent strings, numbers, etc. accurately
            return `Literal: ${(node as acorn.Literal).raw}`;
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
            const func = node as acorn.FunctionDeclaration | acorn.FunctionExpression | acorn.ArrowFunctionExpression;
            const name = func.id ? ` ${func.id.name}` : '';
            return `${node.type}${name}`;
        case 'VariableDeclarator':
            const decl = node as acorn.VariableDeclarator;
            // Assuming id is usually an Identifier, might need adjustment for patterns
            const varName = decl.id.type === 'Identifier' ? (decl.id as acorn.Identifier).name : '[complex pattern]';
            return `Variable: ${varName}`;
        case 'CallExpression':
             const call = node as acorn.CallExpression;
             // Try to describe the function being called (e.g., identifier name, member expression)
             let calleeDesc = '[complex callee]';
             if (call.callee.type === 'Identifier') {
                 calleeDesc = (call.callee as acorn.Identifier).name;
             } else if (call.callee.type === 'MemberExpression') {
                 // Could potentially stringify the member expression, but keep it simple
                 calleeDesc = '[member access]';
             }
             return `Call: ${calleeDesc}()`;
        // Add more cases as needed for better descriptions
        default:
            // Generic description using the node type
            return node.type;
    }
}