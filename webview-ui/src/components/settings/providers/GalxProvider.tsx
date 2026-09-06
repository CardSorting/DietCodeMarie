import { Mode } from "@shared/storage/types"
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/**
 * Props for the GalxProvider component
 */
interface GalxProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * GALXAI Provider Configuration Component
 *
 * GALXAI operates as a managed Cloudflare Anycast edge compute clearinghouse (https://galx.ai/v1).
 * There is no local endpoint or server to configure — users only need to provide their API key.
 */
export const GalxProvider = ({
	showModelOptions: _showModelOptions,
	isPopup: _isPopup,
	currentMode: _currentMode,
}: GalxProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleFieldChange } = useApiConfigurationHandlers()

	return (
		<div className="flex flex-col gap-3">
			<div>
				<DebouncedTextField
					initialValue={apiConfiguration?.galxApiKey || ""}
					onChange={(value) => handleFieldChange("galxApiKey", value)}
					placeholder="Enter GALXAI API Key (galx_live_...)"
					style={{ width: "100%" }}
					type="password">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
						<span style={{ fontWeight: 500 }}>GALXAI API Key</span>
						<VSCodeLink
							href="https://galx.ai/keys"
							style={{
								fontSize: "12px",
								color: "var(--vscode-textLink-foreground)",
								textDecoration: "none",
								fontWeight: 500,
								cursor: "pointer",
							}}>
							Get API Key
						</VSCodeLink>
					</div>
				</DebouncedTextField>
				{!apiConfiguration?.galxApiKey && (
					<div style={{ marginTop: "6px" }}>
						<a href="https://galx.ai/keys" rel="noreferrer" style={{ textDecoration: "none" }} target="_blank">
							<VSCodeButton appearance="secondary">Get GALXAI API Key</VSCodeButton>
						</a>
					</div>
				)}
				<p
					style={{
						fontSize: "12px",
						marginTop: "5px",
						color: "var(--vscode-descriptionForeground)",
					}}>
					Your GALX key is stored locally in SecretStorage and only used for direct requests.
				</p>
			</div>

			{/* Managed Cloud Endpoint Details */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "6px",
					padding: "10px 12px",
					borderRadius: "6px",
					backgroundColor: "var(--vscode-editor-inactiveSelectionBackground, rgba(255, 255, 255, 0.04))",
					border: "1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.08))",
					fontSize: "11px",
				}}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<span style={{ fontWeight: 600, color: "var(--vscode-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
						<span
							style={{
								width: "7px",
								height: "7px",
								borderRadius: "50%",
								backgroundColor: "#10b981",
								display: "inline-block",
							}}
						/>
						Managed Cloud Clearinghouse
					</span>
					<code
						style={{
							fontSize: "10px",
							color: "var(--vscode-descriptionForeground)",
							fontFamily: "var(--vscode-editor-font-family, monospace)",
						}}>
						https://galx.ai/v1
					</code>
				</div>
				<p
					style={{
						margin: 0,
						color: "var(--vscode-descriptionForeground)",
						lineHeight: "1.4",
					}}>
					Fully managed Anycast edge gateway (300+ PoPs). No local endpoint or proxy setup required — zero per-token anxiety, 75% prompt cache rebate, and automatic 429 quota cycling.
				</p>
			</div>
		</div>
	)
}

export default GalxProvider
