import type React from "react"
import styled from "styled-components"

const StyledTabButton = styled.button.withConfig({
	shouldForwardProp: (prop) => !["isActive"].includes(prop),
})<{ isActive: boolean; disabled?: boolean }>`
	background: none;
	border: none;
	border-bottom: 2px solid ${(props) => (props.isActive ? "var(--vscode-foreground)" : "transparent")};
	color: ${(props) => (props.isActive ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)")};
	padding: 8px 16px;
	cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
	font-size: 13px;
	margin-bottom: -1px;
	font-family: inherit;
	opacity: ${(props) => (props.disabled ? 0.6 : 1)};
	pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
	min-height: 36px;

	&:hover {
		color: ${(props) => (props.disabled ? "var(--vscode-descriptionForeground)" : "var(--vscode-foreground)")};
	}

	&:focus-visible {
		outline: 2px solid var(--vscode-focusBorder);
		outline-offset: -2px;
	}
`

export const TabButton = ({
	children,
	isActive,
	onClick,
	disabled,
	style,
}: {
	children: React.ReactNode
	isActive: boolean
	onClick: () => void
	disabled?: boolean
	style?: React.CSSProperties
}) => (
	<StyledTabButton
		aria-pressed={isActive}
		disabled={disabled}
		isActive={isActive}
		onClick={onClick}
		style={style}
		type="button">
		{children}
	</StyledTabButton>
)

export default TabButton
