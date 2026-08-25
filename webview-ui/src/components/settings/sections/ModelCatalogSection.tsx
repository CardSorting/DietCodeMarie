import { galxModels, ModelInfo } from "@shared/api"
import { Check, Search, Sparkles, Zap } from "lucide-react"
import { useMemo, useState } from "react"
import styled from "styled-components"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { getModelBadges, isRecentModel, ModelFilterTabs, type ModelFilterType } from "../common/ModelTypeTab"
import Section from "../Section"
import { filterOpenRouterModelIds, normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

interface ModelCatalogSectionProps {
	renderSectionHeader?: (tabId: string) => JSX.Element | null
}

/**
 * Sidebar-Optimized Model Catalog with Recency Sorting & Dynamic Facets
 */
export const ModelCatalogSection = ({ renderSectionHeader }: ModelCatalogSectionProps) => {
	const { apiConfiguration, openRouterModels } = useExtensionState()
	const { handleModeFieldsChange } = useApiConfigurationHandlers()

	const [activeFilter, setActiveFilter] = useState<ModelFilterType>("recent")
	const [searchQuery, setSearchQuery] = useState("")
	const [lastActivatedModelId, setLastActivatedModelId] = useState<string | null>(null)

	// Consolidate models from GALXAI and OpenRouter
	const combinedModels = useMemo(() => {
		const combined: Record<string, { info: ModelInfo; provider: "openrouter" | "galx" }> = {}

		for (const [id, info] of Object.entries(galxModels)) {
			combined[id] = { info, provider: "galx" }
		}

		if (openRouterModels) {
			const filteredIds = filterOpenRouterModelIds(Object.keys(openRouterModels), "openrouter")
			for (const id of filteredIds) {
				if (openRouterModels[id]) {
					combined[id] = { info: openRouterModels[id], provider: "openrouter" }
				}
			}
		}

		return combined
	}, [openRouterModels])

	const rawModelsRecord = useMemo(() => {
		const rec: Record<string, ModelInfo> = {}
		for (const [id, item] of Object.entries(combinedModels)) {
			rec[id] = item.info
		}
		return rec
	}, [combinedModels])

	// Current active configuration
	const currentConfig = useMemo(() => normalizeApiConfiguration(apiConfiguration, "plan"), [apiConfiguration])

	// Filter models by searchQuery and activeFilter tab
	const filteredCatalog = useMemo(() => {
		let entries = Object.entries(combinedModels)

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim()
			entries = entries.filter(
				([id, { info }]) => id.toLowerCase().includes(query) || info.name?.toLowerCase().includes(query),
			)
		}

		if (activeFilter === "recent") {
			entries = entries.filter(([id, { info }]) => isRecentModel(id, info))
		}

		return entries
	}, [combinedModels, searchQuery, activeFilter])

	const handleSelectModel = (modelId: string, provider: "openrouter" | "galx") => {
		const modelInfo = combinedModels[modelId]?.info

		if (provider === "openrouter") {
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					openRouterModelId: { plan: "planModeOpenRouterModelId", act: "actModeOpenRouterModelId" },
					openRouterModelInfo: { plan: "planModeOpenRouterModelInfo", act: "actModeOpenRouterModelInfo" },
				},
				{
					apiProvider: "openrouter",
					openRouterModelId: modelId,
					openRouterModelInfo: modelInfo,
				},
				"plan",
			)
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					openRouterModelId: { plan: "planModeOpenRouterModelId", act: "actModeOpenRouterModelId" },
					openRouterModelInfo: { plan: "planModeOpenRouterModelInfo", act: "actModeOpenRouterModelInfo" },
				},
				{
					apiProvider: "openrouter",
					openRouterModelId: modelId,
					openRouterModelInfo: modelInfo,
				},
				"act",
			)
		} else if (provider === "galx") {
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					apiModelId: { plan: "planModeApiModelId", act: "actModeApiModelId" },
				},
				{
					apiProvider: "galx",
					apiModelId: modelId,
				},
				"plan",
			)
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					apiModelId: { plan: "planModeApiModelId", act: "actModeApiModelId" },
				},
				{
					apiProvider: "galx",
					apiModelId: modelId,
				},
				"act",
			)
		}

		setLastActivatedModelId(modelId)
		setTimeout(() => setLastActivatedModelId(null), 2500)
	}

	return (
		<div>
			{renderSectionHeader?.("model-catalog")}

			<Section style={{ padding: "0 2px" }}>
				{/* Top Control: Full-Width Search Input */}
				<SearchInputWrapper>
					<Search className="search-icon" size={12} />
					<input
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search models..."
						type="text"
						value={searchQuery}
					/>
					{searchQuery && (
						<button className="clear-btn" onClick={() => setSearchQuery("")} type="button">
							×
						</button>
					)}
				</SearchInputWrapper>

				{/* Category Facet Filters */}
				<ModelFilterTabs activeTab={activeFilter} models={rawModelsRecord} onTabChange={setActiveFilter} />

				{/* Active Model Indicator */}
				<ActiveBanner>
					<span className="banner-label">Active:</span>
					<span className="banner-value">{currentConfig.selectedModelId}</span>
				</ActiveBanner>

				{/* Sidebar-Optimized Ultra-Dense List View */}
				{filteredCatalog.length === 0 ? (
					<EmptyState>
						<Sparkles size={18} />
						<p>No models found.</p>
						<button
							onClick={() => {
								setSearchQuery("")
								setActiveFilter("all")
							}}
							type="button">
							Reset
						</button>
					</EmptyState>
				) : (
					<CatalogList>
						{filteredCatalog.slice(0, 100).map(([id, { info, provider }]) => {
							const isActive = currentConfig.selectedModelId === id
							const isJustActivated = lastActivatedModelId === id
							const badges = getModelBadges(id, info)

							return (
								<CatalogRow key={id}>
									<RowLeft>
										<RowTitleRow>
											<ModelTitle title={id}>{info.name || id}</ModelTitle>
											<BadgesRow>
												{badges.map((b) => (
													<BadgeChip className={b.toLowerCase()} key={b}>
														{b}
													</BadgeChip>
												))}
											</BadgesRow>
										</RowTitleRow>

										<RowMetaRow>
											<MetaItem>
												{info.contextWindow ? `${Math.round(info.contextWindow / 1000)}K` : "N/A"}
											</MetaItem>
											<MetaDot>{"•"}</MetaDot>
											<MetaItem>{`$${info.inputPrice ?? 0}/$${info.outputPrice ?? 0}`}</MetaItem>
											<MetaDot>{"•"}</MetaDot>
											<MetaProvider>{provider}</MetaProvider>
										</RowMetaRow>
									</RowLeft>

									<RowRight>
										<UseModelButton
											isActive={isActive}
											isSuccess={isJustActivated}
											onClick={() => handleSelectModel(id, provider)}
											type="button">
											{isJustActivated ? (
												<>
													<Check size={10} /> Done
												</>
											) : isActive ? (
												<>
													<Check size={10} /> Active
												</>
											) : (
												<>
													<Zap size={10} /> Select
												</>
											)}
										</UseModelButton>
									</RowRight>
								</CatalogRow>
							)
						})}
					</CatalogList>
				)}
			</Section>
		</div>
	)
}

export default ModelCatalogSection

const SearchInputWrapper = styled.div`
	position: relative;
	width: 100%;
	margin-bottom: 4px;

	.search-icon {
		position: absolute;
		left: 8px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--vscode-descriptionForeground);
	}

	input {
		width: 100%;
		height: 24px;
		padding: 2px 20px 2px 24px;
		background: var(--vscode-input-background);
		color: var(--vscode-input-foreground);
		border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
		border-radius: 4px;
		font-size: 10.5px;
		outline: none;

		&:focus {
			border-color: var(--vscode-focusBorder);
		}
	}

	.clear-btn {
		position: absolute;
		right: 6px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--vscode-descriptionForeground);
		font-size: 12px;
		cursor: pointer;
	}
`

const ActiveBanner = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	background: var(--vscode-sideBar-background, rgba(0, 0, 0, 0.03));
	border-left: 2px solid var(--vscode-button-background);
	padding: 2px 6px;
	margin-bottom: 4px;
	font-size: 9.5px;
	border-radius: 0 3px 3px 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	.banner-label {
		color: var(--vscode-descriptionForeground);
		font-weight: 500;
	}

	.banner-value {
		font-weight: 600;
		color: var(--vscode-foreground);
		overflow: hidden;
		text-overflow: ellipsis;
	}
`

const CatalogList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 3px;
	max-height: 490px;
	overflow-y: auto;
	padding-right: 2px;

	&::-webkit-scrollbar {
		width: 3px;
	}
	&::-webkit-scrollbar-thumb {
		background: var(--vscode-scrollbarSlider-background);
		border-radius: 3px;
	}
`

const CatalogRow = styled.div`
	background: var(--vscode-editor-background);
	border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
	border-radius: 4px;
	padding: 4px 6px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;

	&:hover {
		border-color: var(--vscode-focusBorder);
		background: var(--vscode-list-hoverBackground, var(--vscode-editor-background));
	}
`

const RowLeft = styled.div`
	display: flex;
	flex-direction: column;
	gap: 1px;
	min-width: 0;
	flex: 1;
`

const RowTitleRow = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	min-width: 0;
`

const ModelTitle = styled.span`
	font-size: 10.5px;
	font-weight: 600;
	color: var(--vscode-foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`

const BadgesRow = styled.div`
	display: flex;
	gap: 2px;
	flex-shrink: 0;
`

const BadgeChip = styled.span`
	font-size: 8px;
	font-weight: 700;
	padding: 0 3px;
	border-radius: 2px;
	background: rgba(128, 128, 128, 0.12);
	color: var(--vscode-foreground);

	&.new {
		background: rgba(234, 88, 12, 0.15);
		color: #ea580c;
	}
	&.free {
		background: rgba(46, 160, 67, 0.15);
		color: #2ea043;
	}
	&.thinking {
		background: rgba(163, 113, 247, 0.15);
		color: #a371f7;
	}
	&.vision {
		background: rgba(210, 153, 34, 0.15);
		color: #d29922;
	}
	&.fast {
		background: rgba(56, 139, 253, 0.15);
		color: #388bfd;
	}
`

const RowMetaRow = styled.div`
	display: flex;
	align-items: center;
	gap: 3px;
	font-size: 9.5px;
	color: var(--vscode-descriptionForeground);
`

const MetaItem = styled.span``

const MetaDot = styled.span`
	opacity: 0.5;
`

const MetaProvider = styled.span`
	text-transform: uppercase;
	font-size: 8px;
	font-weight: 600;
`

const RowRight = styled.div`
	flex-shrink: 0;
`

const UseModelButton = styled.button<{ isActive?: boolean; isSuccess?: boolean }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 2px;
	padding: 2px 6px;
	font-size: 9.5px;
	font-weight: 600;
	border-radius: 3px;
	cursor: pointer;
	border: none;
	height: 20px;
	white-space: nowrap;

	background: ${(props) =>
		props.isSuccess
			? "#2ea043"
			: props.isActive
				? "var(--vscode-badge-background, #388bfd)"
				: "var(--vscode-button-background)"};
	color: var(--vscode-button-foreground);

	&:hover {
		opacity: 0.9;
	}
`

const EmptyState = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 16px 8px;
	color: var(--vscode-descriptionForeground);
	gap: 4px;
	font-size: 10px;

	button {
		background: var(--vscode-button-background);
		color: var(--vscode-button-foreground);
		border: none;
		border-radius: 3px;
		padding: 2px 8px;
		font-size: 9.5px;
		cursor: pointer;
	}
`
