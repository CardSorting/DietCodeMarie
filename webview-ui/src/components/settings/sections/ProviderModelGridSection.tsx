import { ApiProvider, ModelInfo, openAiCodexModels } from "@shared/api"
import { Search, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import styled from "styled-components"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { getModelBadges, isRecentModel, ModelFilterTabs, type ModelFilterType } from "../common/ModelTypeTab"
import { OpenAiCodexProvider } from "../providers/OpenAiCodexProvider"
import { OpenRouterProvider } from "../providers/OpenRouterProvider"
import Section from "../Section"
import { normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

export type SupportedProviderTabID = "provider-openrouter" | "provider-openaicodex"

export interface ProviderMeta {
	id: SupportedProviderTabID
	apiProviderValue: string
	name: string
	label: string
	iconName: string
	description: string
}

export const SUPPORTED_PROVIDERS: ProviderMeta[] = [
	{
		id: "provider-openrouter",
		apiProviderValue: "openrouter",
		name: "OpenRouter",
		label: "OpenRouter",
		iconName: "Globe",
		description: "Unified API for 300+ SOTA AI models",
	},
	{
		id: "provider-openaicodex",
		apiProviderValue: "openai-codex",
		name: "ChatGPT",
		label: "ChatGPT / OpenAI",
		iconName: "Sparkles",
		description: "ChatGPT Subscription & OpenAI Codex models",
	},
]

const ITEMS_PER_PAGE = 4

interface ProviderModelGridSectionProps {
	providerTabId: SupportedProviderTabID
	renderSectionHeader?: (tabId: string) => JSX.Element | null
}

/**
 * Provider-Specific Credential Setup & Paginated Ultra-Compressed Model List Section
 */
export const ProviderModelGridSection = ({ providerTabId, renderSectionHeader }: ProviderModelGridSectionProps) => {
	const { apiConfiguration, openRouterModels } = useExtensionState()
	const { handleModeFieldsChange } = useApiConfigurationHandlers()

	const [activeFilter, setActiveFilter] = useState<ModelFilterType>("all")
	const [searchQuery, setSearchQuery] = useState("")
	const [currentPage, setCurrentPage] = useState(1)
	const [lastActivatedModelId, setLastActivatedModelId] = useState<string | null>(null)

	const handleSearchChange = (query: string) => {
		setSearchQuery(query)
		setCurrentPage(1)
	}

	const handleFilterChange = (filter: ModelFilterType) => {
		setActiveFilter(filter)
		setCurrentPage(1)
	}

	const providerMeta = useMemo(() => {
		return SUPPORTED_PROVIDERS.find((p) => p.id === providerTabId) || SUPPORTED_PROVIDERS[0]
	}, [providerTabId])

	// Get models record for this specific provider
	const providerModelsRecord: Record<string, ModelInfo> = useMemo(() => {
		switch (providerMeta.apiProviderValue) {
			case "openrouter":
				return openRouterModels && Object.keys(openRouterModels).length > 0 ? openRouterModels : {}
			case "openai-codex":
				return openAiCodexModels
			default:
				return {}
		}
	}, [providerMeta, openRouterModels])

	// Active configuration
	const currentConfig = useMemo(() => normalizeApiConfiguration(apiConfiguration, "plan"), [apiConfiguration])

	// Filter models array by search and recency filter
	const filteredGridModels = useMemo(() => {
		let entries = Object.entries(providerModelsRecord)

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim()
			entries = entries.filter(([id, info]) => id.toLowerCase().includes(query) || info.name?.toLowerCase().includes(query))
		}

		if (activeFilter === "recent") {
			entries = entries.filter(([id, info]) => isRecentModel(id, info))
		}

		return entries
	}, [providerModelsRecord, searchQuery, activeFilter])

	// Pagination calculations
	const totalPages = Math.max(1, Math.ceil(filteredGridModels.length / ITEMS_PER_PAGE))
	const paginatedGridModels = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE
		return filteredGridModels.slice(start, start + ITEMS_PER_PAGE)
	}, [filteredGridModels, currentPage])

	const handleSelectModel = (modelId: string) => {
		const modelInfo = providerModelsRecord[modelId]
		const pVal = providerMeta.apiProviderValue

		// Update both Plan and Act modes with the selected provider model
		if (pVal === "openrouter") {
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					openRouterModelId: { plan: "planModeOpenRouterModelId", act: "actModeOpenRouterModelId" },
					openRouterModelInfo: { plan: "planModeOpenRouterModelInfo", act: "actModeOpenRouterModelInfo" },
				},
				{ apiProvider: "openrouter", openRouterModelId: modelId, openRouterModelInfo: modelInfo },
				"plan",
			)
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					openRouterModelId: { plan: "planModeOpenRouterModelId", act: "actModeOpenRouterModelId" },
					openRouterModelInfo: { plan: "planModeOpenRouterModelInfo", act: "actModeOpenRouterModelInfo" },
				},
				{ apiProvider: "openrouter", openRouterModelId: modelId, openRouterModelInfo: modelInfo },
				"act",
			)
		} else {
			// Generic provider model selection
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					apiModelId: { plan: "planModeApiModelId", act: "actModeApiModelId" },
				},
				{ apiProvider: pVal as ApiProvider, apiModelId: modelId },
				"plan",
			)
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					apiModelId: { plan: "planModeApiModelId", act: "actModeApiModelId" },
				},
				{ apiProvider: pVal as ApiProvider, apiModelId: modelId },
				"act",
			)
		}

		setLastActivatedModelId(modelId)
		setTimeout(() => setLastActivatedModelId(null), 2500)
	}

	const renderProviderCredentials = () => {
		switch (providerMeta.apiProviderValue) {
			case "openrouter":
				return <OpenRouterProvider currentMode="plan" isPopup={false} showModelOptions={false} />
			case "openai-codex":
				return <OpenAiCodexProvider currentMode="plan" isPopup={false} showModelOptions={false} />
			default:
				return null
		}
	}

	return (
		<div>
			{renderSectionHeader?.(providerTabId)}

			{/* Top Credentials & Settings Block */}
			<CredentialsCardWrapper>
				<div style={{ marginBottom: 12 }}>
					<SectionTitleRow>
						<h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--vscode-foreground)" }}>
							{providerMeta.name} Authentication & Configuration
						</h3>
					</SectionTitleRow>
					<p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--vscode-descriptionForeground)" }}>
						{providerMeta.description}
					</p>
				</div>
				{renderProviderCredentials()}
			</CredentialsCardWrapper>

			{/* Models Grid & Model Discovery Block */}
			<Section style={{ marginTop: 16 }}>
				<HeaderContainer>
					<TitleWrapper>
						<Sparkles className="size-4 text-lumi shrink-0" />
						<TitleText>{providerMeta.name} Model Catalog</TitleText>
					</TitleWrapper>
					<BadgeText>{filteredGridModels.length} models available</BadgeText>
				</HeaderContainer>

				{/* Search & Recency Filter Bar */}
				<FilterSearchRow>
					<SearchInputWrapper>
						<Search className="size-3.5 text-description absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
						<StyledSearchInput
							onChange={(e) => handleSearchChange(e.target.value)}
							placeholder={`Search ${providerMeta.name} models...`}
							type="text"
							value={searchQuery}
						/>
					</SearchInputWrapper>
				</FilterSearchRow>

				<ModelFilterTabs activeTab={activeFilter} models={providerModelsRecord} onTabChange={handleFilterChange} />

				{/* Models Compact Table */}
				{filteredGridModels.length === 0 ? (
					<EmptyStateWrapper>
						<p style={{ margin: 0, fontSize: 12, color: "var(--vscode-descriptionForeground)" }}>
							No models found matching "{searchQuery}"
						</p>
					</EmptyStateWrapper>
				) : (
					<ModelGridContainer>
						{paginatedGridModels.map(([modelId, modelInfo]) => {
							const isCurrentActive =
								currentConfig.selectedProvider === providerMeta.apiProviderValue &&
								currentConfig.selectedModelId === modelId
							const isRecentlyActivated = lastActivatedModelId === modelId
							const badges = getModelBadges(modelId, modelInfo)

							return (
								<CompactModelRow
									$isActive={isCurrentActive}
									key={modelId}
									onClick={() => handleSelectModel(modelId)}>
									<RowContentLeft>
										<ModelNameTitle $isActive={isCurrentActive}>{modelInfo.name || modelId}</ModelNameTitle>
										<ModelIdSubtitle>{modelId}</ModelIdSubtitle>
										{badges.length > 0 && (
											<BadgeRow>
												{badges.map((b) => (
													<CompactBadge key={b}>{b}</CompactBadge>
												))}
											</BadgeRow>
										)}
									</RowContentLeft>
									<RowContentRight>
										{isRecentlyActivated ? (
											<ActiveIndicatorLabel style={{ color: "var(--vscode-testing-iconPassed)" }}>
												Activated!
											</ActiveIndicatorLabel>
										) : isCurrentActive ? (
											<ActiveIndicatorLabel>Active</ActiveIndicatorLabel>
										) : (
											<SelectButtonLabel>Use</SelectButtonLabel>
										)}
									</RowContentRight>
								</CompactModelRow>
							)
						})}
					</ModelGridContainer>
				)}

				{/* Pagination Controls */}
				{totalPages > 1 && (
					<PaginationControlsRow>
						<PaginationButton disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
							Prev
						</PaginationButton>
						<PaginationInfoText>
							Page {currentPage} of {totalPages}
						</PaginationInfoText>
						<PaginationButton
							disabled={currentPage === totalPages}
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
							Next
						</PaginationButton>
					</PaginationControlsRow>
				)}
			</Section>
		</div>
	)
}

export default ProviderModelGridSection

const CredentialsCardWrapper = styled.div`
	background: var(--vscode-sideBar-background);
	border: 1px solid var(--vscode-sideBar-border, rgba(255, 255, 255, 0.08));
	border-radius: 8px;
	padding: 14px;
	margin-top: 8px;
`

const SectionTitleRow = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
`

const HeaderContainer = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
`

const TitleWrapper = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
`

const TitleText = styled.h3`
	font-size: 13px;
	font-weight: 600;
	margin: 0;
	color: var(--vscode-foreground);
`

const BadgeText = styled.span`
	font-size: 10px;
	color: var(--vscode-descriptionForeground);
	background: rgba(255, 255, 255, 0.05);
	padding: 2px 6px;
	border-radius: 4px;
`

const FilterSearchRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 8px;
`

const SearchInputWrapper = styled.div`
	position: relative;
	width: 100%;
`

const StyledSearchInput = styled.input`
	width: 100%;
	height: 28px;
	padding: 0 8px 0 28px;
	border-radius: 6px;
	font-size: 11px;
	background: var(--vscode-input-background);
	color: var(--vscode-input-foreground);
	border: 1px solid var(--vscode-input-border, rgba(255, 255, 255, 0.1));

	&:focus {
		outline: none;
		border-color: var(--vscode-focusBorder);
	}
`

const ModelGridContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-top: 8px;
`

const CompactModelRow = styled.div<{ $isActive: boolean }>`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 10px;
	background: ${({ $isActive }) => ($isActive ? "rgba(99, 102, 160, 0.12)" : "rgba(255, 255, 255, 0.02)")};
	border: 1px solid ${({ $isActive }) => ($isActive ? "var(--vscode-focusBorder)" : "rgba(255, 255, 255, 0.05)")};
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.15s ease;

	&:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.15);
	}
`

const RowContentLeft = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2px;
	overflow: hidden;
`

const ModelNameTitle = styled.span<{ $isActive: boolean }>`
	font-size: 12px;
	font-weight: 500;
	color: ${({ $isActive }) => ($isActive ? "var(--vscode-foreground)" : "var(--vscode-foreground)")};
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`

const ModelIdSubtitle = styled.span`
	font-size: 10px;
	color: var(--vscode-descriptionForeground);
	font-family: var(--vscode-editor-font-family);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`

const BadgeRow = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	margin-top: 2px;
`

const CompactBadge = styled.span<{ $variant?: string }>`
	font-size: 9px;
	padding: 1px 4px;
	border-radius: 3px;
	background: ${({ $variant }) =>
		$variant === "recency"
			? "rgba(34, 197, 94, 0.15)"
			: $variant === "thinking"
				? "rgba(168, 85, 247, 0.15)"
				: "rgba(255, 255, 255, 0.06)"};
	color: ${({ $variant }) =>
		$variant === "recency"
			? "var(--vscode-testing-iconPassed)"
			: $variant === "thinking"
				? "#c084fc"
				: "var(--vscode-descriptionForeground)"};
`

const RowContentRight = styled.div`
	margin-left: 8px;
	shrink: 0;
`

const ActiveIndicatorLabel = styled.span`
	font-size: 11px;
	font-weight: 600;
	color: var(--vscode-focusBorder);
`

const SelectButtonLabel = styled.span`
	font-size: 10px;
	padding: 3px 8px;
	border-radius: 4px;
	background: rgba(255, 255, 255, 0.05);
	color: var(--vscode-foreground);
	border: 1px solid rgba(255, 255, 255, 0.1);

	&:hover {
		background: rgba(255, 255, 255, 0.1);
	}
`

const PaginationControlsRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-top: 10px;
`

const PaginationButton = styled.button`
	font-size: 10px;
	padding: 3px 8px;
	border-radius: 4px;
	background: var(--vscode-button-secondaryBackground, rgba(255, 255, 255, 0.05));
	color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
	border: 1px solid rgba(255, 255, 255, 0.1);
	cursor: pointer;

	&:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
`

const PaginationInfoText = styled.span`
	font-size: 10px;
	color: var(--vscode-descriptionForeground);
`

const EmptyStateWrapper = styled.div`
	padding: 24px;
	text-align: center;
`
