import { compareASTs } from "./ast/compare";
import { generateAST } from "./ast/generate";
import { generateDiffs } from "./diff/generate";
import * as prettier from 'prettier';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';

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

        // Prettify code before comparison
        try {
            // Assuming 'babel' parser is suitable for .js files. Adjust if needed.
            const prettierOptions = { parser: "babel", printWidth: 80 };
            console.log("Attempting to prettify code snippets...");
            snippet1 = await prettier.format(snippet1, prettierOptions);
            snippet2 = await prettier.format(snippet2, prettierOptions);
            console.log("Code snippets successfully prettified.");
        } catch (error) {
            console.error("Failed to prettify code snippets:", error);
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
            } catch(error) {
                 console.error("Failed to generate ASTs. Aborting comparison.");
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
    // Catch errors not handled by yargs.fail
    console.error("\nAn unexpected error occurred during execution:");
    console.error(error);
    process.exit(1);
});