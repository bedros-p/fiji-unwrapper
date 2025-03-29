# Fiji Unwrap

Diff minified JS files. Find new features. (WIP)

## Features

- Option to diff 2 files
- Option to run diffs on URLs on intervals (`--interval=2s`)

## Usage

### Arguments

- `-u URL`: Specify the URL to monitor. [WIP]
- `-i interval`: Set the interval for checking the URL (e.g., `1h`, `2s`). [WIP]
- `-f file1 file2`: Specify two local files to diff. [WIP]

### Settings

- `-d`: Display the diff output. [WIP]
- `-t`: Output token & char start and stop positions (useful for programmatic analysis). [WIP]

## About

Diffing JS files would prove very useful to bug hunters. Problem is, most JS files are minified, and all the variables change names. If we were to diff on the AST level (ignoring simple changes to variable names), it would be a lot more useful to pinpoint changes.

It's useful if you're a bug hunter, as you can quickly find new features. That means it's also great for people that dig up features to post about! 