import { ModelInfo } from "@shared/api"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useMemo, useState } from "react"
import styled from "styled-components"
import { getModelBadges, isRecentModel, ModelFilterTabs, type ModelFilterType } from "./ModelTypeTab"

/**
 * Container for dropdowns that ensures proper z-index handling
 * This is necessary to ensure dropdown opens downward
 */
export const DropdownContainer = styled.div.attrs<{ zIndex?: number }>(({ zIndex }) => ({
	style: {
		zIndex: zIndex || 1000,
	},
}))`
	position: relative;

	// Force dropdowns to open downward
	& vscode-dropdown::part(listbox) {
		position: absolute !important;
		top: 100% !important;
		bottom: auto !important;
	}
`

/**
 * Props for the ModelSelector component
 */
interface ModelSelectorProps {
	models: Record<string, ModelInfo>
	selectedModelId: string | undefined
	onChange: (e: any) => void
	zIndex?: number
	label?: string
	initialFilterTab?: ModelFilterType
}

/**
 * A reusable component for selecting models from a dropdown with capability breakdown & pricing filtering tabs
 */
export const ModelSelector = ({
	models,
	selectedModelId,
	onChange,
	zIndex,
	label = "Model",
	initialFilterTab = "all",
}: ModelSelectorProps) => {
	const [activeFilter, setActiveFilter] = useState<ModelFilterType>(initialFilterTab)

	// Filter models based on active filter tab
	const filteredModels = useMemo(() => {
		if (activeFilter === "all") return models
		const result: Record<string, ModelInfo> = {}
		for (const [id, info] of Object.entries(models)) {
			if (activeFilter === "recent" && isRecentModel(id, info)) {
				result[id] = info
			}
		}
		return result
	}, [models, activeFilter])

	// If selectedModelId exists in original models but not in filteredModels, include it so choice is not lost
	const displayModels = useMemo(() => {
		if (selectedModelId && models[selectedModelId] && !(selectedModelId in filteredModels)) {
			return { [selectedModelId]: models[selectedModelId], ...filteredModels }
		}
		return filteredModels
	}, [filteredModels, selectedModelId, models])

	const modelKeys = Object.keys(models)

	return (
		<DropdownContainer className="dropdown-container" zIndex={zIndex}>
			<label htmlFor="model-id">
				<span className="font-medium">{label}</span>
			</label>

			{modelKeys.length > 1 && <ModelFilterTabs activeTab={activeFilter} models={models} onTabChange={setActiveFilter} />}

			<VSCodeDropdown className="w-full" id="model-id" onChange={onChange} value={selectedModelId}>
				<VSCodeOption value="">Select a model...</VSCodeOption>
				{Object.keys(displayModels).map((modelId) => {
					const badges = getModelBadges(modelId, displayModels[modelId])
					const badgeText = badges.length > 0 ? ` (${badges.join(", ")})` : ""
					return (
						<VSCodeOption className="break-words whitespace-normal max-w-full" key={modelId} value={modelId}>
							{modelId} {badgeText}
						</VSCodeOption>
					)
				})}
			</VSCodeDropdown>
		</DropdownContainer>
	)
}
