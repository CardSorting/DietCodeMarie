import path from "node:path"
import { Controller } from "@core/controller/index"
import axios from "axios"
import { readFile } from "fs/promises"
import { HostProvider } from "@/hosts/host-provider"
import { DietCodeExtensionContext } from "@/shared/dietcode"
import { ShowMessageType } from "@/shared/proto/host/window"
import { Logger } from "@/shared/services/Logger"
import { getNonce } from "./getNonce"

export abstract class WebviewProvider {
	private static instance: WebviewProvider | null = null
	controller: Controller

	constructor(readonly context: DietCodeExtensionContext) {
		WebviewProvider.instance = this

		// Create controller with cache service
		this.controller = new Controller(context)
	}

	async dispose() {
		await this.controller.dispose()
		WebviewProvider.instance = null
	}

	public static getInstance(): WebviewProvider {
		if (!WebviewProvider.instance) {
			throw new Error("WebviewProvider instance not initialized. Make sure to create a WebviewProvider instance first.")
		}
		return WebviewProvider.instance
	}

	public static getVisibleInstance(): WebviewProvider | undefined {
		return WebviewProvider.instance?.isVisible() ? WebviewProvider.instance : undefined
	}

	public static async disposeAllInstances() {
		if (WebviewProvider.instance) {
			await WebviewProvider.instance.dispose()
		}
	}

	/**
	 * Converts a local filesystem path to a URL that can be used within the webview.
	 *
	 * @param path - The local path to convert
	 * @returns A URL that can be used within the webview
	 */
	abstract getWebviewUrl(path: string): string

	/**
	 * Gets the Content Security Policy source for the webview.
	 *
	 * @returns The CSP source string to be used in the webview's Content-Security-Policy
	 */
	abstract getCspSource(): string

	/**
	 * Checks if the webview is currently visible to the user.
	 *
	 * @returns True if the webview is visible, false otherwise
	 */
	abstract isVisible(): boolean

	/**
	 * Builds a robust Content Security Policy array for webview rendering.
	 *
	 * @param nonce - Nonce string for inline script execution.
	 * @param isHmr - Whether HMR mode is active (adds Vite HMR endpoints/eval).
	 * @param hmrServer - Optional dev server URL string (e.g. `localhost:25463`).
	 * @param hmrPort - Optional dev server port number.
	 */
	protected buildCspDirectives(nonce: string, isHmr = false, hmrServer?: string, hmrPort?: number): string[] {
		const cspSource = this.getCspSource()

		const connectSrc = ["https:", "http://localhost:*", "http://127.0.0.1:*", "ws:", "wss:", cspSource]

		const styleSrc = [cspSource, "'unsafe-inline'", "https:"]
		const scriptSrc = [`'nonce-${nonce}'`]

		if (isHmr && hmrServer && hmrPort) {
			connectSrc.push(`ws://${hmrServer}`, `ws://0.0.0.0:${hmrPort}`, `http://${hmrServer}`, `http://0.0.0.0:${hmrPort}`)
			styleSrc.push(`http://${hmrServer}`, `http://0.0.0.0:${hmrPort}`)
			scriptSrc.push("'unsafe-eval'", "https://*", `http://${hmrServer}`, `http://0.0.0.0:${hmrPort}`)
		}

		return [
			"default-src 'none'",
			`connect-src ${connectSrc.join(" ")}`,
			`font-src ${cspSource} data: https:`,
			`style-src ${styleSrc.join(" ")}`,
			`img-src ${cspSource} https: data: blob:`,
			`media-src ${cspSource} https: data: blob:`,
			`worker-src ${cspSource} blob: 'unsafe-inline'`,
			`child-src ${cspSource} blob:`,
			`frame-src ${cspSource} https:`,
			`manifest-src ${cspSource}`,
			`script-src ${scriptSrc.join(" ")}`,
		]
	}

	/**
	 * Renders the HTML document structure for webviews in both production and HMR modes.
	 */
	protected renderHtmlDocument(options: {
		stylesUrl: string
		codiconsUrl: string
		scriptUrl: string
		nonce: string
		csp: string[]
		extraHead?: string
		extraBody?: string
	}): string {
		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
					<meta name="theme-color" content="#000000">
					${options.extraHead || ""}
					<link rel="stylesheet" type="text/css" href="${options.stylesUrl}">
					<link href="${options.codiconsUrl}" rel="stylesheet" />
					<meta http-equiv="Content-Security-Policy" content="${options.csp.join("; ")}">
					<title>DietCode</title>
				</head>
				<body>
					<noscript>You need to enable JavaScript to run this app.</noscript>
					<div id="root"></div>
					${options.extraBody || ""}
					<script type="module" nonce="${options.nonce}" src="${options.scriptUrl}"></script>
				</body>
			</html>
		`
	}

	/**
	 * Defines and returns the HTML that should be rendered within the webview panel.
	 *
	 * @remarks This is also the place where references to the React webview build files
	 * are created and inserted into the webview HTML.
	 *
	 * @returns A template string literal containing the HTML that should be
	 * rendered within the webview panel
	 */
	public getHtmlContent(): string {
		// Get the local path to main script run in the webview,
		// then convert it to a url we can use in the webview.
		// The JS file from the React build output
		const scriptUrl = this.getExtensionUrl("webview-ui", "build", "assets", "index.js")

		// The CSS file from the React build output
		const stylesUrl = this.getExtensionUrl("webview-ui", "build", "assets", "index.css")

		// The codicon font from the React build output
		// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-codicons-sample/src/extension.ts
		// we installed this package in the extension so that we can access it how its intended from the extension (the font file is likely bundled in vscode), and we just import the css fileinto our react app we don't have access to it
		// don't forget to add font-src ${webview.cspSource};
		const codiconsUrl = this.getExtensionUrl("node_modules", "@vscode", "codicons", "dist", "codicon.css")

		const nonce = getNonce()

		return this.renderHtmlDocument({
			stylesUrl,
			codiconsUrl,
			scriptUrl,
			nonce,
			csp: this.buildCspDirectives(nonce),
		})
	}

	/**
	 * Reads the Vite dev server port from the generated port file to avoid conflicts
	 * Returns a Promise that resolves to the port number
	 * If the file doesn't exist or can't be read, it resolves to the default port
	 */
	private getDevServerPort(): Promise<number> {
		const DEFAULT_PORT = 25463

		const portFilePath = path.join(__dirname, "..", "webview-ui", ".vite-port")

		return readFile(portFilePath, "utf8")
			.then((portFile) => {
				const port = Number.parseInt(portFile.trim(), 10) || DEFAULT_PORT
				Logger.info(`[getDevServerPort] Using dev server port ${port} from .vite-port file`)

				return port
			})
			.catch((_err) => {
				Logger.warn(
					`[getDevServerPort] Port file not found or couldn't be read at ${portFilePath}, using default port: ${DEFAULT_PORT}`,
				)
				return DEFAULT_PORT
			})
	}

	/**
	 * Connects to the local Vite dev server to allow HMR, with fallback to the bundled assets
	 *
	 * @param webview A reference to the extension webview
	 * @returns A template string literal containing the HTML that should be
	 * rendered within the webview panel
	 */
	protected async getHMRHtmlContent(): Promise<string> {
		const localPort = await this.getDevServerPort()
		const localServerUrl = `localhost:${localPort}`

		// Check if local dev server is running.
		try {
			await axios.get(`http://${localServerUrl}`)
		} catch (_error) {
			// Only show the error message when in development mode.
			if (process.env.IS_DEV) {
				HostProvider.window.showMessage({
					type: ShowMessageType.ERROR,
					message:
						"DietCode: Local webview dev server is not running, HMR will not work. Please run 'npm run dev:webview' before launching the extension to enable HMR. Using bundled assets.",
				})
			}

			return this.getHtmlContent()
		}

		const nonce = getNonce()
		const stylesUrl = this.getExtensionUrl("webview-ui", "build", "assets", "index.css")
		const codiconsUrl = this.getExtensionUrl("node_modules", "@vscode", "codicons", "dist", "codicon.css")

		const scriptEntrypoint = "src/main.tsx"
		const scriptUrl = `http://${localServerUrl}/${scriptEntrypoint}`

		const reactRefresh = /*html*/ `
			<script nonce="${nonce}" type="module">
				import RefreshRuntime from "http://${localServerUrl}/@react-refresh"
				RefreshRuntime.injectIntoGlobalHook(window)
				window.$RefreshReg$ = () => {}
				window.$RefreshSig$ = () => (type) => type
				window.__vite_plugin_react_preamble_installed__ = true
			</script>
		`

		return this.renderHtmlDocument({
			stylesUrl,
			codiconsUrl,
			scriptUrl,
			nonce,
			csp: this.buildCspDirectives(nonce, true, localServerUrl, localPort),
			extraHead: process.env.IS_DEV ? '<script src="http://localhost:8097"></script>' : "",
			extraBody: reactRefresh,
		})
	}
	/**
	 * A helper function which will get the webview URL of a given file or resource in the extension directory.
	 *
	 * @remarks This URL can be used within a webview's HTML as a link to the
	 * given file/resource.
	 *
	 * @param pathList An array of strings representing the path to a file/resource in the extension directory.
	 * @returns A URL pointing to the file/resource
	 */
	private getExtensionUrl(...pathList: string[]): string {
		const assetPath = path.resolve(HostProvider.get().extensionFsPath, ...pathList)
		return this.getWebviewUrl(assetPath)
	}
}
