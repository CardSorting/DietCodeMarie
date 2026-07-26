import { type ModelInfo } from "@shared/api"
import type React from "react"
import styled from "styled-components"

export type ModelFilterType = "recent" | "all"

/**
 * Utility to determine if a model is recent / latest release (SOTA models)
 */
export function isRecentModel(modelId: string, modelInfo?: ModelInfo): boolean {
	const lowerId = modelId.toLowerCase()
	return (
		lowerId.includes("3.7") ||
		lowerId.includes("4.5") ||
		lowerId.includes("3.5") ||
		lowerId.includes("2.0") ||
		lowerId.includes("v3") ||
		lowerId.includes("r1") ||
		lowerId.includes("o3") ||
		lowerId.includes("o1") ||
		lowerId.includes("grok") ||
		lowerId.includes("llama-3.3") ||
		lowerId.includes("qwen-2.5") ||
		lowerId.includes("2025") ||
		lowerId.includes("2026")
	)
}

/**
 * Utility to determine if a model is fast & lightweight
 */
export function isFastModel(modelId: string, modelInfo?: ModelInfo): boolean {
	const lowerId = modelId.toLowerCase()
	return (
		lowerId.includes("flash") ||
		lowerId.includes("haiku") ||
		lowerId.includes("mini") ||
		lowerId.includes("8b") ||
		lowerId.includes("7b") ||
		lowerId.includes("3b") ||
		lowerId.includes("turbo") ||
		lowerId.includes("lite")
	)
}

/**
 * Utility to determine if model has 100k+ context window
 */
export function isLargeContextModel(modelId: string, modelInfo?: ModelInfo): boolean {
	if (modelInfo?.contextWindow && modelInfo.contextWindow >= 100_000) return true
	const lowerId = modelId.toLowerCase()
	return lowerId.includes("128k") || lowerId.includes("200k") || lowerId.includes("1m") || lowerId.includes("sonnet")
}

/**
 * Get category badges for a model (Only NEW badge for recency)
 */
export function getModelBadges(modelId: string, modelInfo?: ModelInfo): string[] {
	const badges: string[] = []
	if (isRecentModel(modelId, modelInfo)) badges.push("NEW")
	return badges
}

interface ModelFilterTabsProps {
	activeTab: ModelFilterType
	onTabChange: (tab: ModelFilterType) => void
	models: Record<string, ModelInfo>
	style?: React.CSSProperties
}

/**
 * Filter Pills (Only Recent & All)
 */
export const ModelFilterTabs = ({ activeTab, onTabChange, models, style }: ModelFilterTabsProps) => {
	const modelKeys = Object.keys(models)
	let recentCount = 0

	for (const key of modelKeys) {
		const info = models[key]
		if (isRecentModel(key, info)) recentCount++
	}

	const tabs: { id: ModelFilterType; label: string; count: number; icon: string; title: string }[] = [
		{ id: "recent" as ModelFilterType, label: "Recent", count: recentCount, icon: "🔥", title: "Latest Model Releases" },
		{ id: "all" as ModelFilterType, label: "All Models", count: modelKeys.length, icon: "🌐", title: "All Models" },
	].filter((t) => t.count > 0)

	return (
		<PillCarousel style={style}>
			{tabs.map((t) => (
				<PillItem
					isActive={activeTab === t.id}
					key={t.id}
					onClick={() => onTabChange(t.id)}
					title={t.title}
					type="button">
					<span className="pill-icon">{t.icon}</span>
					<span className="pill-label">{t.label}</span>
					<span className="pill-count">{t.count}</span>
				</PillItem>
			))}
		</PillCarousel>
	)
}

const PillCarousel = styled.div`
	display: flex;
	gap: 4px;
	overflow-x: auto;
	white-space: nowrap;
	margin-top: 4px;
	margin-bottom: 6px;
	padding-bottom: 2px;

	&::-webkit-scrollbar {
		height: 2px;
	}
	&::-webkit-scrollbar-thumb {
		background: var(--vscode-scrollbarSlider-background);
		border-radius: 9999px;
	}
`

const PillItem = styled.button<{ isActive: boolean }>`
	display: inline-flex;
	align-items: center;
	gap: 4px;
	background: ${(props) => (props.isActive ? "var(--vscode-button-background)" : "var(--vscode-editor-background)")};
	color: ${(props) => (props.isActive ? "var(--vscode-button-foreground)" : "var(--vscode-foreground)")};
	border: 1px solid ${(props) => (props.isActive ? "var(--vscode-button-background)" : "var(--vscode-widget-border, var(--vscode-panel-border))")};
	border-radius: 9999px;
	padding: 2px 7px;
	font-size: 10px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.12s ease;
	flex-shrink: 0;

	.pill-icon {
		font-size: 10px;
		line-height: 1;
	}

	.pill-label {
		font-weight: ${(props) => (props.isActive ? "600" : "500")};
	}

	.pill-count {
		font-size: 9px;
		font-weight: 600;
		padding: 0 4px;
		border-radius: 9999px;
		background: ${(props) => (props.isActive ? "rgba(255, 255, 255, 0.25)" : "var(--vscode-badge-background, rgba(128, 128, 128, 0.2))")};
		color: ${(props) => (props.isActive ? "var(--vscode-button-foreground)" : "var(--vscode-badge-foreground, var(--vscode-foreground))")};
	}

	&:hover {
		border-color: var(--vscode-focusBorder);
		background: ${(props) => (props.isActive ? "var(--vscode-button-background)" : "var(--vscode-list-hoverBackground)")};
	}

	&:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
	}
`
