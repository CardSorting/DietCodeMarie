#!/usr/bin/env node
const { execSync } = require("child_process")
const esbuild = require("esbuild")

const watch = process.argv.includes("--watch")

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: "esbuild-problem-matcher",

	setup(build) {
		build.onStart(() => {
			console.log("[watch] build started")
		})
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`)
				console.error(`    ${location.file}:${location.line}:${location.column}:`)
			})
			console.log("[watch] build finished")
		})
	},
}

const srcConfig = {
	bundle: true,
	minify: false,
	sourcemap: true,
	sourcesContent: true,
	logLevel: "silent",
	entryPoints: ["src/packages/**/*.ts"],
	outdir: "out/packages",
	format: "cjs",
	platform: "node",
	define: {
		"process.env.IS_TEST": "true",
	},
	external: ["vscode"],
	plugins: [esbuildProblemMatcherPlugin],
}

const { execFile } = require("child_process")
const { promisify } = require("util")
const execFileAsync = promisify(execFile)

async function runTsc() {
	const isWin = process.platform === "win32"
	const bin = isWin ? "npx.cmd" : "npx"
	await execFileAsync(bin, ["tsc", "-p", "./tsconfig.test.json", "--incremental", "--outDir", "out"], { encoding: "utf-8" })
}

async function main() {
	const srcCtx = await esbuild.context(srcConfig)

	if (watch) {
		runTsc().catch(() => {})
		await srcCtx.watch()
	} else {
		await Promise.all([runTsc(), srcCtx.rebuild()])
		await srcCtx.dispose()
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
