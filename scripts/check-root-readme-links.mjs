#!/usr/bin/env node
/**
 * Verify relative links in root README.md resolve to existing files.
 */
import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8")

const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g
const broken = []

const fsMemo = new Map()
function existsCached(target) {
	if (fsMemo.has(target)) return fsMemo.get(target)
	const res = fs.existsSync(target)
	fsMemo.set(target, res)
	return res
}

function resolve(target) {
	if (!target || target.startsWith("http") || target.startsWith("mailto:") || target.startsWith("file://")) return null
	const noAnchor = target.split("#")[0]
	if (!noAnchor) return null
	const resolved = path.resolve(repoRoot, noAnchor)
	if (existsCached(resolved)) return resolved
	if (existsCached(`${resolved}.md`)) return `${resolved}.md`
	if (existsCached(`${resolved}.mdx`)) return `${resolved}.mdx`
	return resolved
}

let m
while ((m = linkPattern.exec(readme))) {
	const target = m[1]
	if (target.startsWith("http") || target.startsWith("mailto:") || target.startsWith("file://")) continue
	const noAnchor = target.split("#")[0]
	if (!noAnchor) continue
	const resolved = resolve(noAnchor)
	if (!resolved || !existsCached(resolved)) broken.push(target)
}

assert.strictEqual(broken.length, 0, `Broken root README links:\n${broken.join("\n")}`)
console.log("docs:check-root-readme-links OK")
