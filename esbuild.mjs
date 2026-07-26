import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"
import * as esbuild from "esbuild"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const production = process.argv.includes("--production") || process.env.IS_DEBUG_BUILD === "false"
const watch = process.argv.includes("--watch")
const e2eBuild = process.argv.includes("--e2e-build")
const destDir = "dist"

/**
 * @type {import('esbuild').Plugin}
 */
const aliasResolverPlugin = {
	name: "alias-resolver",
	setup(build) {
		const fsMemo = new Map()
		const cachedExists = (target) => {
			const key = path.normalize(target)
			if (fsMemo.has(key)) return fsMemo.get(key)
			const res = fs.existsSync(key)
			fsMemo.set(key, res)
			return res
		}

		// Handle relative and aliased .js/.jsx -> .ts/.tsx mapping
		build.onResolve({ filter: /\.jsx?$/ }, (args) => {
			if (args.path.startsWith(".") || args.path.startsWith("@")) {
				let resolvedPath = args.path
				if (args.path.startsWith("@")) {
					const aliasMap = {
						"@/": "src/",
						"@core/": "src/core/",
						"@generated/": "src/generated/",
						"@hosts/": "src/hosts/",
						"@integrations/": "src/integrations/",
						"@services/": "src/services/",
						"@shared/": "src/shared/",
						"@utils/": "src/utils/",
						"@packages/": "src/packages/",
					}
					for (const [prefix, target] of Object.entries(aliasMap)) {
						if (args.path.startsWith(prefix)) {
							resolvedPath = path.resolve(__dirname, args.path.replace(prefix, target))
							break
						}
					}
				} else {
					resolvedPath = path.resolve(args.resolveDir, args.path)
				}

				const tsPath = resolvedPath.replace(/\.js$/, ".ts").replace(/\.jsx$/, ".tsx")
				if (cachedExists(tsPath)) {
					return { path: tsPath }
				}
			}
		})
	},
}

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

const copyWasmFiles = {
	name: "copy-wasm-files",
	setup(build) {
		build.onEnd(() => {
			// tree sitter
			const sourceDir = path.join(__dirname, "node_modules", "web-tree-sitter")
			const targetDir = path.join(__dirname, destDir)

			// Copy tree-sitter.wasm
			fs.copyFileSync(path.join(sourceDir, "tree-sitter.wasm"), path.join(targetDir, "tree-sitter.wasm"))

			// Copy language-specific WASM files
			const languageWasmDir = path.join(__dirname, "node_modules", "tree-sitter-wasms", "out")
			const languages = [
				"typescript",
				"tsx",
				"python",
				"rust",
				"javascript",
				"go",
				"cpp",
				"c",
				"c_sharp",
				"ruby",
				"java",
				"php",
				"swift",
				"kotlin",
			]

			languages.forEach((lang) => {
				const filename = `tree-sitter-${lang}.wasm`
				fs.copyFileSync(path.join(languageWasmDir, filename), path.join(targetDir, filename))
			})
		})
	},
}

const buildEnvVars = {
	"import.meta.url": "_importMetaUrl",
	"process.env.IS_STANDALONE": JSON.stringify("false"),
	"process.env.GOOGLE_OAUTH_CLIENT_ID": JSON.stringify(process.env.GOOGLE_OAUTH_CLIENT_ID || ""),
	"process.env.GOOGLE_OAUTH_CLIENT_SECRET": JSON.stringify(process.env.GOOGLE_OAUTH_CLIENT_SECRET || ""),
}

if (production) {
	// IS_DEV is always disable in production builds.
	buildEnvVars["process.env.IS_DEV"] = "false"
}
// Set the environment and telemetry env vars. The API key env vars need to be populated in the GitHub
// workflows from the secrets.
if (process.env.DIETCODE_ENVIRONMENT || process.env.CLINE_ENVIRONMENT) {
	buildEnvVars["process.env.DIETCODE_ENVIRONMENT"] = JSON.stringify(
		process.env.DIETCODE_ENVIRONMENT || process.env.CLINE_ENVIRONMENT,
	)
	buildEnvVars["process.env.CLINE_ENVIRONMENT"] = JSON.stringify(
		process.env.DIETCODE_ENVIRONMENT || process.env.CLINE_ENVIRONMENT,
	)
}
if (process.env.TELEMETRY_SERVICE_API_KEY) {
	buildEnvVars["process.env.TELEMETRY_SERVICE_API_KEY"] = JSON.stringify(process.env.TELEMETRY_SERVICE_API_KEY)
}
if (process.env.ERROR_SERVICE_API_KEY) {
	buildEnvVars["process.env.ERROR_SERVICE_API_KEY"] = JSON.stringify(process.env.ERROR_SERVICE_API_KEY)
}

// OpenTelemetry configuration (injected at build time from GitHub secrets)
// These provide production defaults that can be overridden at runtime via environment variables
if (process.env.OTEL_TELEMETRY_ENABLED) {
	buildEnvVars["process.env.OTEL_TELEMETRY_ENABLED"] = JSON.stringify(process.env.OTEL_TELEMETRY_ENABLED)
}
if (process.env.OTEL_LOGS_EXPORTER) {
	buildEnvVars["process.env.OTEL_LOGS_EXPORTER"] = JSON.stringify(process.env.OTEL_LOGS_EXPORTER)
}
if (process.env.OTEL_METRICS_EXPORTER) {
	buildEnvVars["process.env.OTEL_METRICS_EXPORTER"] = JSON.stringify(process.env.OTEL_METRICS_EXPORTER)
}
if (process.env.OTEL_EXPORTER_OTLP_PROTOCOL) {
	buildEnvVars["process.env.OTEL_EXPORTER_OTLP_PROTOCOL"] = JSON.stringify(process.env.OTEL_EXPORTER_OTLP_PROTOCOL)
}
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
	buildEnvVars["process.env.OTEL_EXPORTER_OTLP_ENDPOINT"] = JSON.stringify(process.env.OTEL_EXPORTER_OTLP_ENDPOINT)
}
if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
	buildEnvVars["process.env.OTEL_EXPORTER_OTLP_HEADERS"] = JSON.stringify(process.env.OTEL_EXPORTER_OTLP_HEADERS)
}
if (process.env.OTEL_METRIC_EXPORT_INTERVAL) {
	buildEnvVars["process.env.OTEL_METRIC_EXPORT_INTERVAL"] = JSON.stringify(process.env.OTEL_METRIC_EXPORT_INTERVAL)
}
// Base configuration shared by extension builds
const baseConfig = {
	bundle: true,
	minify: production,
	legalComments: "none",
	sourcemap: !production,
	logLevel: "silent",
	target: "node20",
	treeShaking: true,
	define: buildEnvVars,
	tsconfig: path.resolve(__dirname, "tsconfig.json"),
	plugins: [
		copyWasmFiles,
		aliasResolverPlugin,
		/* add to the end of plugins array */
		esbuildProblemMatcherPlugin,
	],
	format: "cjs",
	sourcesContent: false,
	platform: "node",
	banner: {
		js: "const _importMetaUrl=require('url').pathToFileURL(__filename)",
	},
}

// Extension-specific configuration
const extensionConfig = {
	...baseConfig,
	entryPoints: ["src/extension.ts"],
	outfile: `${destDir}/extension.js`,
	external: ["vscode", "better-sqlite3", "bindings", "file-uri-to-path"],
}

// E2E build script configuration
const e2eBuildConfig = {
	...baseConfig,
	entryPoints: ["src/test/e2e/utils/build.ts"],
	outfile: `${destDir}/e2e-build.mjs`,
	external: ["@vscode/test-electron", "execa", "bindings", "file-uri-to-path"],
	sourcemap: false,
	plugins: [aliasResolverPlugin, esbuildProblemMatcherPlugin],
}

async function main() {
	const config = e2eBuild ? e2eBuildConfig : extensionConfig
	const extensionCtx = await esbuild.context(config)
	if (watch) {
		await extensionCtx.watch()
	} else {
		await extensionCtx.rebuild()
		await extensionCtx.dispose()
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
