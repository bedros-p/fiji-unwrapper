import { compareASTs } from "./ast/compare";
import { generateAST } from "./ast/generate";
import { generateDiffs } from "./diff/generate";
import * as prettier from 'prettier';

let snippet1 = `_.v4a = function(a, b, c) {
	var d = c.jsonMode ? "application/json" : "text/plain"
	  , e = (new _.eL).setModel(c.modelName);
	d = _.ZK(_.YK(_.XK(_.WK(new _.VK, c.temperature), .95), 40), d);
	d = _.as(d, _.Eu, 9, c.jsonMode ? c.schema : void 0);
	b = _.lPa(_.fL(e, d), b);
	b = _.XC(b, 7, _.tB, c.tools || []);
	c.systemInstructions && _.gL(b, _.OOa(_.QK(new _.KK, "model"), _.vy(new _.sy, c.systemInstructions)));
	if (c.safetySettings)
		for (c = _.n(c.safetySettings),
		e = c.next(); !e.done; e = c.next()) {
			d = _.n(e.value);
			e = d.next().value;
			var f = d.next().value;
			d = b;
			e = Ts(Us(e), f);
			_.Zw(d, 3, _.$K, e)
		}
	c = new _.Hk;
	a.send(b, c);
	return c
}`



// const snippet2_deviation = `_.s4a = function(a, b, c) {
// 	var d = c.jsonMode ? "application/json" : "text/plain"
// 	  , e = (new _.mL).setModel(c.modelName);
// 	d = _.gL(_.fL(_.eL(_.dL(new _.cL, c.temperature), .95), 40), d);
// 	d = _.bs(d, _.Eu, 9, c.jsonMode ? c.schema : void 0);
// 	b = _.iPa(_.nL(e, d), b);
// 	b = _.eD(b, 7, _.wB, c.tools || []);
// 	c.systemInstructions && _.oL(b, _.LOa(_.YK(new _.SK, "model"), _.wy(new _.ty, c.systemInstructions)));
// 	if (c.safetySettings)
// 		for (c = _.n(c.safetySettings),
// 		e = c.next(); !e.done; e = c.next()) {
// 			e = d.next().value;
// 			d = _.n(e.value);
// 			var f = d.next().value;
// 			d = b;
// 			e = Ts(Us(e), f);
// 			_.$w(d, 3, _.hL, e)
// 		}
// 	c = new _.Ik;
// 	a.send(b, c);
// 	return c
// }`

let snippet2 = `_.s4a = function(a, b, c) {
    var d = c.jsonMode ? "application/json" : "text/plain"
        , e = (new _.mL).setModel(c.modelName);
    d = _.gL(_.fL(_.eL(_.dL(new _.cL, c.temperature), .95), 40), d);
    d = _.bs(d, _.Eu, 9, c.jsonMode ? c.schema : void 0);
    b = _.iPa(_.nL(e, d), b);
    b = _.eD(b, 7, _.wB, c.tools || []);
    c.systemInstructions && _.oL(b, _.LOa(_.YK(new _.SK, "model"), _.wy(new _.ty, c.systemInstructions)));
    if (c.safetySettings)
        for (c = _.n(c.safetySettings),
        e = c.next(); !e.done; e = c.next()) {
            d = _.n(e.value);
            e = d.next().value;
            var f = d.next().value;
            d = b;
            e = Ts(Us(e), f);
            _.$w(d, 3, _.hL, e)
        }
    c = new _.Ik;
    a.send(b, c);
    return c
}`

import * as fs from 'fs';

// Define file paths (assuming they are in the same directory as index.ts)
// Adjust paths if necessary.
const filePath1 = 'new.js';
const filePath2 = 'old.js';

// Read file contents synchronously
// let snippet1 = fs.readFileSync(filePath1, 'utf-8');
// let snippet2 = fs.readFileSync(filePath2, 'utf-8');


// Note: This block requires the 'prettier' library.
// Ensure it's installed (`npm install prettier @types/prettier --save-dev` or `yarn add prettier @types/prettier --dev`)
// and imported, preferably at the top of this file (e.g., `import * as prettier from 'prettier';`).
// Also, the `snippet1` and `snippet2` variables declared above must be changed from `const` to `let` to allow reassignment here.
try {
    // Assuming 'babel' parser is suitable for .js files. Adjust if needed (e.g., 'typescript').
    const prettierOptions = { parser: "babel", printWidth: 80 }; // Common options

    console.log("Attempting to prettify code snippets...");
    // Reassign the variables with their prettified versions
    snippet1 = await prettier.format(snippet1, prettierOptions);
    snippet2 = await prettier.format(snippet2, prettierOptions);
    console.log("Code snippets successfully prettified.");

} catch (error) {
    console.error("Failed to prettify code snippets:", error);
    console.warn("Proceeding with original code snippets for comparison. AST comparison might be affected by formatting differences.");
    // Execution continues with the original, potentially unformatted snippets
}


/*
Note to colleague:
1. Please remove the hardcoded `snippet1`, `snippet2`, and `snippet2_deviation`
   variables defined just before this generated block.
2. Update the code below this block to use the `snippet2` variable
   (containing the content of old.js) instead of `snippet2_deviation`.
   Specifically, change:
   - `const ast2 = generateAST(snippet2_deviation);` to `const ast2 = generateAST(snippet2);`
   - `generateDiffs(snippet1, snippet2_deviation, deviations)` to `generateDiffs(snippet1, snippet2, deviations)`
*/


// Generate ASTs for the snippets
const ast1 = generateAST(snippet1);
const ast2 = generateAST(snippet2);

// Compare the generated ASTs
const deviations = compareASTs(ast1, ast2);

generateDiffs(snippet1, snippet2, deviations)