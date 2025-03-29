import { compareASTs } from "./ast/compare";
import { generateAST } from "./ast/generate";
import { generateDiffs } from "./diff/generate";

const snippet1 = `_.v4a = function(a, b, c) {
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



const snippet2_deviation = `_.s4a = function(a, b, c) {
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
			e = d.next().value;
			d = _.n(e.value);
			var f = d.next().value;
			d = b;
			e = Ts(Us(e), f);
			_.$w(d, 3, _.hL, e)
		}
	c = new _.Ik;
	a.send(b, c);
	return c
}`

const snippet2 = `_.s4a = function(a, b, c) {
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

// Generate ASTs for the snippets
const ast1 = generateAST(snippet1);
const ast2 = generateAST(snippet2_deviation);

// Compare the generated ASTs
const deviations = compareASTs(ast1, ast2);

// // Output the deviations (for demonstration purposes)
// console.log("Comparing snippet1 and snippet2 ASTs:");
// if (deviations.length === 0) {
// 	console.log("No structural deviations found (ignoring identifier names and non-string literal values).");
// } else {
// 	console.log(`Found ${deviations.length} structural deviation(s):`);
// 	console.log(JSON.stringify(deviations, null, 2));
// }
generateDiffs(snippet1, snippet2_deviation, deviations)