import { type ModelInfo, nousResearchModels } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { useMount } from "react-use"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ApiKeyField } from "../common/ApiKeyField"
import { ModelInfoView } from "../common/ModelInfoView"
import { ModelSelector } from "../common/ModelSelector"
import { normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/**
 * Props for the NousResearchProvider component
 */
interface NousResearchProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The NousResearch provider configuration component
 */
export const NousResearchProvider = ({ showModelOptions, isPopup, currentMode }: NousResearchProviderProps) => {
	const { apiConfiguration, nousResearchModels: nousResearchModelsState, refreshNousResearchModels } = useExtensionState()
	const { handleFieldChange, handleModeFieldsChange } = useApiConfigurationHandlers()

	useMount(() => {
		refreshNousResearchModels()
	})

	const models: Record<string, ModelInfo> =
		nousResearchModelsState && Object.keys(nousResearchModelsState).length > 0 ? nousResearchModelsState : nousResearchModels

	// Get the normalized configuration
	const { selectedModelId, selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, currentMode)

	const handleModelChange = (newModelId: string) => {
		handleModeFieldsChange(
			{
				nousResearchModelId: { plan: "planModeNousResearchModelId", act: "actModeNousResearchModelId" },
				nousResearchModelInfo: { plan: "planModeNousResearchModelInfo", act: "actModeNousResearchModelInfo" },
			},
			{
				nousResearchModelId: newModelId,
				nousResearchModelInfo: models[newModelId],
			},
			currentMode,
		)
	}

	return (
		<div>
			<ApiKeyField
				initialValue={apiConfiguration?.nousResearchApiKey || ""}
				onChange={(value) => {
					handleFieldChange("nousResearchApiKey", value)
					refreshNousResearchModels()
				}}
				providerName="NousResearch"
			/>

			{showModelOptions && (
				<>
					<ModelSelector
						label="Model"
						models={models}
						onChange={(e: any) => handleModelChange(e.target.value)}
						selectedModelId={selectedModelId}
					/>

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />

					<p
						style={{
							fontSize: "12px",
							marginTop: 3,
							color: "var(--vscode-descriptionForeground)",
						}}>
						<span style={{ color: "var(--vscode-errorForeground)" }}>
							(<span style={{ fontWeight: 500 }}>Note:</span> LUMI uses complex prompts and works best with Claude
							models. Less capable models may not work as expected.)
						</span>
					</p>
				</>
			)}
		</div>
	)
}
