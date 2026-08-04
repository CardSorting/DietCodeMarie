#!/usr/bin/env node
/**
 * Package VS Code Marketplace VSIX as CardSorting.lumi-vscode.
 *
 * Rebuilds better-sqlite3 for Electron and verifies the native binary is
 * included before the VSIX is considered valid.
 *
 * Usage:
 *   npm run package:vsix
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { assertVsixHasNativeModule, nativeTargetForHost, rebuildBetterSqlite3 } from "./vsix-native-deps.mjs"

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const packageJsonPath = path.join(repoRoot, "package.json")

function ensureBuildArtifacts(repoRoot) {
	const extensionJs = path.join(repoRoot, "dist", "extension.js")
	const webviewBuild = path.join(repoRoot, "webview-ui", "build")
	const packageJsonPath = path.join(repoRoot, "package.json")

	let needsRebuild = false
	if (!fs.existsSync(extensionJs) || !fs.existsSync(webviewBuild)) {
		needsRebuild = true
	} else {
		try {
			const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
			const extensionJsContent = fs.readFileSync(extensionJs, "utf8")
			if (!extensionJsContent.includes(`"${pkg.version}"`)) {
				needsRebuild = true
			}
		} catch {
			needsRebuild = true
		}
	}

	if (needsRebuild) {
		console.log("[vscode] build artifacts out-of-date or missing; compiling extension and webview via ci:build...")
		execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "ci:build"], {
			stdio: "inherit",
			cwd: repoRoot,
			shell: process.platform === "win32",
		})
	}
}

function main() {
	const originalPackageJson = fs.readFileSync(packageJsonPath, "utf8")
	const pkg = JSON.parse(originalPackageJson)
	const target = nativeTargetForHost()
	const outPath = path.join(repoRoot, "dist", `lumi-vscode-${pkg.version}-${target}.vsix`)
	const didPatchName = false

	fs.mkdirSync(path.dirname(outPath), { recursive: true })

	try {
		ensureBuildArtifacts(repoRoot)
		rebuildBetterSqlite3(repoRoot)

		pkg.name = "lumi-vscode"
		fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, "\t")}\n`)
		execFileSync("git", ["add", "package.json"], { cwd: repoRoot })
		console.log(`[vscode] patched name → "lumi-vscode" (CardSorting.lumi-vscode)`)

		const vsceArgs = ["package", "--target", target, "--allow-package-secrets", "sendgrid", "--out", outPath]

		execFileSync(process.platform === "win32" ? "vsce.cmd" : "vsce", vsceArgs, {
			stdio: "inherit",
			cwd: repoRoot,
			shell: process.platform === "win32",
		})
		assertVsixHasNativeModule(outPath)
		console.log(`[vscode] packaged ${outPath}`)
	} catch (error) {
		process.exitCode = 1
		if (error instanceof Error) {
			console.error(`[vscode] ${error.message}`)
		}
	}
}

main()
