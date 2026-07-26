#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = process.cwd()
const sourceRoot = path.join(root, "src")
const allowedProjectionWriter = path.normalize("src/core/task/lifecycle/TaskLifecycleFunnel.ts")
const allowedPersistence = path.normalize("src/core/task/lifecycle/TaskLifecyclePersistence.ts")
const allowedSchemaBootstrap = path.normalize("src/infrastructure/db/Config.ts")
const allowedAuthorityBindings = new Set([
	allowedProjectionWriter,
	path.normalize("src/core/task/index.ts"),
	path.normalize("src/core/task/tools/subagent/SubagentRunner.ts"),
])

const forbiddenWrites = [
	{
		label: "direct cancellation-state mutation",
		pattern: /\b(?:taskState|state)\.(?:abort|abandoned|didFinishAbortingStream)\s*=(?!=)/,
	},
	{
		label: "direct terminal-state mutation",
		pattern: /\b(?:taskState|state)\.isTerminalState\s*=(?!=)/,
	},
	{
		label: "direct generation replacement",
		pattern: /\b(?:taskState|state)\.executionGeneration\s*=(?!=)/,
	},
	{
		label: "direct lifecycle record projection write",
		pattern: /\.lifecycleFunnelRecordJson\s*=/,
		allow: new Set([allowedProjectionWriter]),
	},
	{
		label: "direct lifecycle event projection write",
		pattern: /\.lifecycleFunnelEventJson\s*=/,
		allow: new Set([allowedProjectionWriter]),
	},
	{
		label: "direct lifecycle history projection write",
		pattern: /\.lifecycleFunnelHistory\s*=/,
		allow: new Set([allowedProjectionWriter]),
	},
	{
		label: "internal lifecycle persistence import outside the funnel",
		pattern: /from\s+["'][^"']*TaskLifecyclePersistence["']/,
		allow: new Set([allowedProjectionWriter]),
	},
	{
		label: "test-only lifecycle authority in production",
		pattern: /\bcreateInMemoryTaskLifecycleFunnel\b/,
		allow: new Set([allowedProjectionWriter]),
	},
	{
		label: "lifecycle authority construction outside the canonical funnel",
		pattern: /\bnew\s+TaskLifecycleFunnel\s*\(/,
		allow: new Set([allowedProjectionWriter]),
	},
	{
		label: "lifecycle authority binding outside approved task adapters",
		pattern: /\bbindTaskLifecycleAuthority\b/,
		allow: allowedAuthorityBindings,
	},
	{
		label: "lifecycle persistence write outside the persistence adapter",
		pattern:
			/(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO|UPDATE|DELETE\s+FROM)\s+task_lifecycle_(?:records|events|sequence)/i,
		allow: new Set([allowedPersistence, allowedSchemaBootstrap]),
	},
]

const IGNORED_DIRS = new Set([
	"node_modules",
	"generated",
	"dist",
	".git",
	"out",
	"build",
	"coverage",
	".nyc_output",
	"test_workspace",
])

async function walkAsync(directory) {
	const entries = await fs.promises.readdir(directory, { withFileTypes: true })
	const files = await Promise.all(
		entries.map(async (entry) => {
			if (IGNORED_DIRS.has(entry.name)) return []
			const absolute = path.join(directory, entry.name)
			if (entry.isDirectory()) {
				return walkAsync(absolute)
			}
			if (entry.isFile() && /\.(?:ts|tsx|js|mjs)$/.test(entry.name)) {
				return [absolute]
			}
			return []
		}),
	)
	return files.flat()
}

async function run() {
	const allFiles = await walkAsync(sourceRoot)
	const violations = []

	await Promise.all(
		allFiles.map(async (absolute) => {
			const relative = path.normalize(path.relative(root, absolute))
			if (relative.includes(`${path.sep}__tests__${path.sep}`) || /\.(?:test|spec)\.[^.]+$/.test(relative)) return
			const contents = await fs.promises.readFile(absolute, "utf8")

			for (const rule of forbiddenWrites) {
				if (rule.allow?.has(relative)) continue
				if (!rule.pattern.test(contents)) continue

				const lines = contents.split(/\r?\n/)
				for (let index = 0; index < lines.length; index++) {
					if (rule.pattern.test(lines[index])) {
						violations.push(`${relative}:${index + 1}: ${rule.label}`)
					}
				}
			}
		}),
	)

	if (violations.length > 0) {
		console.error("Task lifecycle authority boundary violations:")
		for (const violation of violations) console.error(`- ${violation}`)
		process.exit(1)
	}

	console.log("Task lifecycle boundary check passed.")
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
