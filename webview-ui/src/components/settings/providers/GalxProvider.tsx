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

			<div>
				<DebouncedTextField
					initialValue={apiConfiguration?.galxBaseUrl || ""}
					onChange={(value) => handleFieldChange("galxBaseUrl", value)}
					placeholder="https://galx.ai/v1"
					style={{ width: "100%" }}
					type="text">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
						<span style={{ fontWeight: 500 }}>Base URL (Optional)</span>
						<span style={{ fontSize: "11px", color: "var(--vscode-descriptionForeground)" }}>
							Default: https://galx.ai/v1
						</span>
					</div>
				</DebouncedTextField>
				<p
					style={{
						fontSize: "12px",
						marginTop: "5px",
						color: "var(--vscode-descriptionForeground)",
					}}>
					Override for local development or enterprise proxy endpoints.
				</p>
			</div>
		</div>
	)
}

export default GalxProvider
