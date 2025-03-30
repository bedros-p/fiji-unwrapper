import { compareASTs } from "./ast/compare";
import { generateAST } from "./ast/generate";
import { generateDiffs } from "./diff/generate";
import { Biome, Distribution } from "@biomejs/js-api"; // Import Biome
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';
import * as path from 'path'; // Needed for file path info for Biome
const biome = await Biome.create({distribution:Distribution.NODE});
biome.applyConfiguration({files:{maxSize:99999999999999}, formatter:{indentStyle:"space"}})


async function main() {
    const argv = await yargs(hideBin(process.argv))
        .option('f', {
            alias: 'files',
            type: 'array',
            description: 'Specify two local files to diff (e.g., -f old.js new.js)',
            nargs: 2,
            string: true, // Ensure file paths are treated as strings
        })
        .option('u', {
            alias: 'url',
            type: 'string',
            description: 'Specify the URL to monitor [WIP]',
        })
        .option('i', {
            alias: 'interval',
            type: 'string',
            description: 'Set the interval for checking the URL (e.g., 1h, 2s) [WIP]',
        })
        .option('d', {
            alias: 'display-diff',
            type: 'boolean',
            description: 'Display the diff output [WIP]',
            default: true, // Default to showing diff for file comparison
        })
        .option('t', {
            alias: 'tokens',
            type: 'boolean',
            description: 'Output token & char start/stop positions [WIP]',
            default: false,
        })
        .usage('Usage: $0 -f <file1> <file2> [-d] [-t] | -u <url> [-i <interval>]')
        .help()
        .alias('help', 'h')
        .check((argv) => {
            if (!argv.f && !argv.u) {
                throw new Error('Error: You must specify either files to compare using -f or a URL to monitor using -u.');
            }
            if (argv.f && argv.u) {
                throw new Error('Error: Please specify either files (-f) or a URL (-u), not both.');
            }
            if (argv.f && argv.f.length !== 2) {
                 // yargs nargs: 2 should handle this, but added as a safeguard
                 throw new Error('Error: Option -f requires exactly two file paths.');
            }
            // Add more checks if needed (e.g., for interval format)
            return true; // Indicate success
        })
        .fail((msg, err, yargs) => {
            // Custom failure handler to show help
            console.error(msg || err?.message || 'An unknown error occurred.');
            console.error("\nPlease use '--help' for usage information.");
            process.exit(1);
        })
        .strict() // Report errors for unknown options
        .argv;

    let snippet1: string | undefined;
    let snippet2: string | undefined;

    if (argv.f) {
        // File comparison mode
        const [filePath1, filePath2] = argv.f;
        console.log(`Comparing files: ${filePath1} vs ${filePath2}`);

        try {
            snippet1 = fs.readFileSync(filePath1, 'utf-8');
            snippet2 = fs.readFileSync(filePath2, 'utf-8');
            console.log(`Successfully read files.`);
        } catch (error: any) {
            console.error(`Error reading files: ${error.message}`);
            process.exit(1);
        }

        // Format code using Biome before comparison
        try {
            console.log("Attempting to format code snippets with Biome...");
            // Biome needs to be created (can potentially load biome.json config)
            // Creating it here ensures it's only done when needed for file comparison

            // Use the actual file paths to help Biome determine the parser
            const formatOptions1 = { filePath: path.basename(filePath1) };
            const formatOptions2 = { filePath: path.basename(filePath2) };

            const result1 = biome.formatContent(snippet1, formatOptions1);
            const result2 = biome.formatContent(snippet2, formatOptions2);
    

            // Basic error check based on Biome's result structure (content might be null/undefined on failure)
            if (result1.content === undefined || result1.content === null) {
                 throw new Error(`Biome failed to format ${filePath1}. Diagnostics: ${JSON.stringify(result1.diagnostics)}`);
            }
             if (result2.content === undefined || result2.content === null) {
                 throw new Error(`Biome failed to format ${filePath2}. Diagnostics: ${JSON.stringify(result2.diagnostics)}`);
            }

            snippet1 = result1.content;
            snippet2 = result2.content;
            console.log("Code snippets successfully formatted with Biome.");

        } catch (error) {
            console.error("Failed to format code snippets with Biome:", error);
            console.warn("Proceeding with original code snippets for comparison. AST comparison might be affected by formatting differences.");
            // Execution continues with the original snippets
        }

        // Proceed with comparison only if snippets are loaded
        if (snippet1 !== undefined && snippet2 !== undefined) {
            // Generate ASTs
            console.log("Generating ASTs...");
            let ast1, ast2;
            try {
                 ast1 = generateAST(snippet1);
                 ast2 = generateAST(snippet2);
                 console.log("ASTs generated successfully.");
            } catch(error: any) {
                 console.error(`Failed to generate ASTs: ${error?.message || error}. Aborting comparison.`);
                 process.exit(1);
            }


            // Compare the generated ASTs
            console.log("Comparing ASTs...");
            const deviations = compareASTs(ast1, ast2);
            console.log(`Comparison complete. Found ${deviations.length} structural deviation(s).`);

            // Generate and display Diffs based on flags
            if (argv.d) {
                 console.log("Generating diff output (-d)...");
                 generateDiffs(snippet1, snippet2, deviations);
            } else {
                 console.log("Diff output skipped (use -d to display).");
            }

            // Output token/position info if requested
            if (argv.t) {
                 console.log("Outputting deviation details (-t):");
                 // Output deviations in a structured format (e.g., JSON)
                 // Consider filtering or formatting this output further based on requirements
                 console.log(JSON.stringify(deviations, null, 2));
            }
        } else {
             console.error("Code snippets were not loaded correctly. Cannot proceed.");
             process.exit(1);
        }

    } else if (argv.u) {
        // URL monitoring mode (WIP)
        console.log(`URL monitoring for ${argv.u} is not yet implemented.`);
        if (argv.i) {
            console.log(`Interval set to ${argv.i}, but monitoring is WIP.`);
        }
        console.log("Exiting - URL functionality is work in progress.");
        process.exit(0); // Exit gracefully for WIP feature
    }
}

// Execute the main function and handle potential errors
main().catch(error => {
    // Catch errors not handled by yargs.fail or Biome creation/formatting
    console.error("\nAn unexpected error occurred during execution:");
    console.error(error);
    process.exit(1);
});