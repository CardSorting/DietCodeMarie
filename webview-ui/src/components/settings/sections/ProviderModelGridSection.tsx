import {
	cerebrasModels,
	clinePassModels,
	cloudflareModels,
	internationalZAiModels,
	ModelInfo,
	openAiCodexModels,
	qwenTokenPlanModels,
	nousResearchModels as staticNousResearchModels,
	xaiModels,
} from "@shared/api"
import { Search, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { getModelBadges, isRecentModel, ModelFilterTabs, type ModelFilterType } from "../common/ModelTypeTab"
import { CerebrasProvider } from "../providers/CerebrasProvider"
import { ClinePassProvider } from "../providers/ClinePassProvider"
import { CloudflareProvider } from "../providers/CloudflareProvider"
import { NousResearchProvider } from "../providers/NousresearchProvider"
import { OpenAiCodexProvider } from "../providers/OpenAiCodexProvider"
import { OpenRouterProvider } from "../providers/OpenRouterProvider"
import { QwenTokenPlanProvider } from "../providers/QwenTokenPlanProvider"
import { XAIOauthProvider } from "../providers/XAIOauthProvider"
import { ZAiProvider } from "../providers/ZAiProvider"
import Section from "../Section"
import { normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

export type SupportedProviderTabID =
	| "provider-openrouter"
	| "provider-openaicodex"
	| "provider-nousresearch"
	| "provider-cloudflare"
	| "provider-cerebras"
	| "provider-clinepass"
	| "provider-xaioauth"
	| "provider-qwen"
	| "provider-zai"

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
	{
		id: "provider-nousresearch",
		apiProviderValue: "nousResearch",
		name: "NousResearch",
		label: "NousResearch",
		iconName: "Cpu",
		description: "Nous Research high-performance inference API",
	},
	{
		id: "provider-cloudflare",
		apiProviderValue: "cloudflare",
		name: "Cloudflare",
		label: "Cloudflare Workers AI",
		iconName: "Cloud",
		description: "Cloudflare serverless AI inference network",
	},
	{
		id: "provider-cerebras",
		apiProviderValue: "cerebras",
		name: "Cerebras",
		label: "Cerebras",
		iconName: "Zap",
		description: "Ultra-fast Cerebras Wafer-Scale Engine inference",
	},
	{
		id: "provider-clinepass",
		apiProviderValue: "cline-pass",
		name: "ClinePass",
		label: "ClinePass",
		iconName: "Key",
		description: "ClinePass managed model access pass",
	},
	{
		id: "provider-xaioauth",
		apiProviderValue: "xai-oauth",
		name: "Grok",
		label: "Grok / xAI",
		iconName: "Flame",
		description: "xAI Grok reasoning & vision models",
	},
	{
		id: "provider-qwen",
		apiProviderValue: "qwen-token-plan",
		name: "Qwen",
		label: "Qwen Token Plan",
		iconName: "Layers",
		description: "Alibaba Qwen LLM & reasoning models",
	},
	{
		id: "provider-zai",
		apiProviderValue: "zai",
		name: "Z AI",
		label: "Z AI (GLM)",
		iconName: "Boxes",
		description: "Zhipu AI GLM series models",
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
	const { apiConfiguration, openRouterModels, nousResearchModels } = useExtensionState()
	const { handleModeFieldsChange } = useApiConfigurationHandlers()

	const [activeFilter, setActiveFilter] = useState<ModelFilterType>("all")
	const [searchQuery, setSearchQuery] = useState("")
	const [currentPage, setCurrentPage] = useState(1)
	const [lastActivatedModelId, setLastActivatedModelId] = useState<string | null>(null)

	// Reset pagination on filter or search change
	useEffect(() => {
		setCurrentPage(1)
	}, [activeFilter, searchQuery])

	const providerMeta = useMemo(() => {
		return SUPPORTED_PROVIDERS.find((p) => p.id === providerTabId) || SUPPORTED_PROVIDERS[0]
	}, [providerTabId])

	// Get models record for this specific provider
	const providerModelsRecord: Record<string, ModelInfo> = useMemo(() => {
		switch (providerMeta.apiProviderValue) {
			case "openrouter":
				return openRouterModels && Object.keys(openRouterModels).length > 0 ? openRouterModels : {}
			case "nousResearch":
				return nousResearchModels && Object.keys(nousResearchModels).length > 0
					? nousResearchModels
					: staticNousResearchModels
			case "openai-codex":
				return openAiCodexModels
			case "xai-oauth":
				return xaiModels
			case "cloudflare":
				return cloudflareModels
			case "cerebras":
				return cerebrasModels
			case "cline-pass":
				return clinePassModels
			case "qwen-token-plan":
				return qwenTokenPlanModels
			case "zai":
				return internationalZAiModels
			default:
				return {}
		}
	}, [providerMeta, openRouterModels, nousResearchModels])

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
		} else if (pVal === "nousResearch") {
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					nousResearchModelId: { plan: "planModeNousResearchModelId", act: "actModeNousResearchModelId" },
					nousResearchModelInfo: { plan: "planModeNousResearchModelInfo", act: "actModeNousResearchModelInfo" },
				},
				{ apiProvider: "nousResearch", nousResearchModelId: modelId, nousResearchModelInfo: modelInfo },
				"plan",
			)
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					nousResearchModelId: { plan: "planModeNousResearchModelId", act: "actModeNousResearchModelId" },
					nousResearchModelInfo: { plan: "planModeNousResearchModelInfo", act: "actModeNousResearchModelInfo" },
				},
				{ apiProvider: "nousResearch", nousResearchModelId: modelId, nousResearchModelInfo: modelInfo },
				"act",
			)
		} else {
			// Generic provider model selection
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					apiModelId: { plan: "planModeApiModelId", act: "actModeApiModelId" },
				},
				{ apiProvider: pVal as any, apiModelId: modelId },
				"plan",
			)
			handleModeFieldsChange(
				{
					apiProvider: { plan: "planModeApiProvider", act: "actModeApiProvider" },
					apiModelId: { plan: "planModeApiModelId", act: "actModeApiModelId" },
				},
				{ apiProvider: pVal as any, apiModelId: modelId },
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
			case "nousResearch":
				return <NousResearchProvider currentMode="plan" isPopup={false} showModelOptions={false} />
			case "cloudflare":
				return <CloudflareProvider currentMode="plan" isPopup={false} showModelOptions={false} />
			case "cerebras":
				return <CerebrasProvider currentMode="plan" isPopup={false} showModelOptions={false} />
			case "cline-pass":
				return <ClinePassProvider currentMode="plan" isPopup={false} showModelOptions={false} />
			case "xai-oauth":
				return <XAIOauthProvider currentMode="plan" isPopup={false} showModelOptions={false} />
			case "qwen-token-plan":
				return <QwenTokenPlanProvider currentMode="plan" isPopup={false} showModelOptions={false} />
			case "zai":
				return <ZAiProvider currentMode="plan" isPopup={false} showModelOptions={false} />
			default:
				return null
		}
	}

	return (
		<div>
			{renderSectionHeader?.(providerTabId)}

			<Section style={{ padding: "0 2px" }}>
				{/* Provider Banner */}
				<ProviderHeaderCard>
					<div className="header-info">
						<h3>{providerMeta.label}</h3>
						<p>{providerMeta.description}</p>
					</div>
					<div className="model-count-badge">{Object.keys(providerModelsRecord).length} Models</div>
				</ProviderHeaderCard>

				{/* Provider API Key & Credentials Setup */}
				<CredentialsBox>
					<CredentialsLabel>PROVIDER CREDENTIALS & KEYS</CredentialsLabel>
					{renderProviderCredentials()}
				</CredentialsBox>

				{/* Search & Filter Pills */}
				<SearchInputWrapper>
					<Search className="search-icon" size={12} />
					<input
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={`Search ${providerMeta.name} models...`}
						type="text"
						value={searchQuery}
					/>
					{searchQuery && (
						<button className="clear-btn" onClick={() => setSearchQuery("")} type="button">
							×
						</button>
					)}
				</SearchInputWrapper>

				<ModelFilterTabs activeTab={activeFilter} models={providerModelsRecord} onTabChange={setActiveFilter} />

				{/* Ultra-Compressed Paginated Model List */}
				{filteredGridModels.length === 0 ? (
					<EmptyState>
						<Sparkles size={16} />
						<p>No models found for {providerMeta.name}.</p>
						<button
							onClick={() => {
								setSearchQuery("")
								setActiveFilter("all")
							}}
							type="button">
							Reset Filters
						</button>
					</EmptyState>
				) : (
					<>
						<CompactModelList>
							{paginatedGridModels.map(([id, info]) => {
								const isActive = currentConfig.selectedModelId === id
								const isJustActivated = lastActivatedModelId === id
								const badges = getModelBadges(id, info)

								return (
									<CompactRowItem isActive={isActive} key={id}>
										<RowLeftInfo>
											{badges.length > 0 && <BadgeChip className="new">NEW</BadgeChip>}
											<ModelTitle title={id}>{info.name || id}</ModelTitle>
										</RowLeftInfo>

										<RowRightMeta>
											<MetaText>
												{info.contextWindow ? `${Math.round(info.contextWindow / 1000)}K` : "128K"}
											</MetaText>
											<SelectButton
												isActive={isActive}
												isSuccess={isJustActivated}
												onClick={() => handleSelectModel(id)}
												type="button">
												{isJustActivated ? "Active!" : isActive ? "Selected" : "Select"}
											</SelectButton>
										</RowRightMeta>
									</CompactRowItem>
								)
							})}
						</CompactModelList>

						{totalPages > 1 && (
							<PaginationBar>
								<button
									className="page-btn"
									disabled={currentPage === 1}
									onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
									type="button">
									‹ Prev
								</button>
								<span className="page-info">
									{currentPage} / {totalPages} ({filteredGridModels.length})
								</span>
								<button
									className="page-btn"
									disabled={currentPage >= totalPages}
									onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
									type="button">
									Next ›
								</button>
							</PaginationBar>
						)}
					</>
				)}
			</Section>
		</div>
	)
}

export default ProviderModelGridSection

const ProviderHeaderCard = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: var(--vscode-sideBar-background, rgba(0, 0, 0, 0.04));
	border: 1px solid var(--vscode-panel-border);
	border-radius: 5px;
	padding: 5px 8px;
	margin-bottom: 5px;

	.header-info {
		h3 {
			margin: 0;
			font-size: 11.5px;
			font-weight: 600;
			color: var(--vscode-foreground);
		}
		p {
			margin: 1px 0 0 0;
			font-size: 9px;
			color: var(--vscode-descriptionForeground);
		}
	}

	.model-count-badge {
		font-size: 8.5px;
		font-weight: 700;
		padding: 1.5px 5px;
		border-radius: 9999px;
		background: var(--vscode-badge-background, rgba(128, 128, 128, 0.2));
		color: var(--vscode-badge-foreground, var(--vscode-foreground));
		flex-shrink: 0;
	}
`

const CredentialsBox = styled.div`
	background: var(--vscode-editor-background);
	border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
	border-radius: 5px;
	padding: 6px 8px;
	margin-bottom: 6px;
`

const CredentialsLabel = styled.div`
	font-size: 8px;
	font-weight: 700;
	letter-spacing: 0.5px;
	color: var(--vscode-descriptionForeground);
	margin-bottom: 4px;
`

const SearchInputWrapper = styled.div`
	position: relative;
	width: 100%;
	margin-bottom: 3px;

	.search-icon {
		position: absolute;
		left: 7px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--vscode-descriptionForeground);
	}

	input {
		width: 100%;
		height: 22px;
		padding: 2px 18px 2px 22px;
		background: var(--vscode-input-background);
		color: var(--vscode-input-foreground);
		border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
		border-radius: 3px;
		font-size: 10px;
		outline: none;

		&:focus {
			border-color: var(--vscode-focusBorder);
		}
	}

	.clear-btn {
		position: absolute;
		right: 5px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--vscode-descriptionForeground);
		font-size: 11px;
		cursor: pointer;
	}
`

const CompactModelList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 3px;
	margin-top: 3px;
`

const CompactRowItem = styled.div<{ isActive?: boolean }>`
	background: var(--vscode-editor-background);
	border: 1px solid ${(props) => (props.isActive ? "var(--vscode-focusBorder)" : "var(--vscode-widget-border, var(--vscode-panel-border))")};
	border-radius: 3px;
	padding: 3px 6px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
	height: 24px;
	transition: all 0.12s ease;

	&:hover {
		border-color: var(--vscode-focusBorder);
		background: var(--vscode-list-hoverBackground);
	}
`

const RowLeftInfo = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	min-width: 0;
	flex: 1;
`

const RowRightMeta = styled.div`
	display: flex;
	align-items: center;
	gap: 5px;
	flex-shrink: 0;
`

const ModelTitle = styled.span`
	font-size: 9.5px;
	font-weight: 600;
	color: var(--vscode-foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`

const BadgeChip = styled.span`
	font-size: 7px;
	font-weight: 700;
	padding: 0 3px;
	border-radius: 2px;
	flex-shrink: 0;

	&.new {
		background: rgba(234, 88, 12, 0.15);
		color: #ea580c;
	}
`

const MetaText = styled.span`
	font-size: 8px;
	font-weight: 500;
	color: var(--vscode-descriptionForeground);
`

const SelectButton = styled.button<{ isActive?: boolean; isSuccess?: boolean }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 1px 6px;
	font-size: 8.5px;
	font-weight: 600;
	border-radius: 2.5px;
	cursor: pointer;
	border: none;
	height: 16px;

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

const PaginationBar = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 4px;
	padding: 2px 4px;
	background: var(--vscode-sideBar-background, rgba(0, 0, 0, 0.03));
	border: 1px solid var(--vscode-panel-border);
	border-radius: 3px;

	.page-btn {
		background: var(--vscode-button-background);
		color: var(--vscode-button-foreground);
		border: none;
		border-radius: 2.5px;
		padding: 1px 6px;
		font-size: 8.5px;
		font-weight: 600;
		cursor: pointer;

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	.page-info {
		font-size: 8px;
		font-weight: 500;
		color: var(--vscode-descriptionForeground);
	}
`

const EmptyState = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 12px 8px;
	color: var(--vscode-descriptionForeground);
	gap: 3px;
	font-size: 9.5px;

	button {
		background: var(--vscode-button-background);
		color: var(--vscode-button-foreground);
		border: none;
		border-radius: 2.5px;
		padding: 1.5px 6px;
		font-size: 9px;
		cursor: pointer;
	}
`
