import "../../src/index.css"

import { cn } from "@heroui/react"
import type { Decorator } from "@storybook/react-vite"
import React from "react"
import {
	DietCodeAuthContext,
	DietCodeAuthContextType,
	DietCodeAuthProvider,
	useDietCodeAuth,
} from "@/context/DietCodeAuthContext"
import {
	ChatMessagesContext,
	ExtensionStateContext,
	ExtensionStateContextProvider,
	ExtensionStateContextType,
	useExtensionState,
} from "@/context/ExtensionStateContext"
import { StorybookThemes } from "../../.storybook/themes"

// Component that handles theme switching
const ThemeHandler: React.FC<{ children: React.ReactNode; theme?: string }> = ({ children, theme }) => {
	React.useEffect(() => {
		const styles = theme?.includes("light") ? StorybookThemes.light : StorybookThemes.dark

		// Apply CSS variables to the document root
		const root = document.documentElement
		Object.entries(styles).forEach(([property, value]) => {
			root.style.setProperty(property, value)
		})

		document.body.style.backgroundColor = styles["--vscode-editor-background"]
		document.body.style.color = styles["--vscode-editor-foreground"]
		document.body.style.fontFamily = styles["--vscode-font-family"]
		document.body.style.fontSize = styles["--vscode-font-size"]

		return () => {
			// Cleanup on unmount
			Object.keys(styles).forEach((property) => {
				root.style.removeProperty(property)
			})
		}
	}, [theme])

	return <>{children}</>
}
function StorybookDecoratorProvider(className = "relative"): Decorator {
	return (story, parameters) => {
		return (
			<div className={className}>
				<ExtensionStateContextProvider>
					<DietCodeAuthProvider>
						<ThemeHandler theme={parameters?.globals?.theme}>{React.createElement(story)}</ThemeHandler>
					</DietCodeAuthProvider>
				</ExtensionStateContextProvider>
			</div>
		)
	}
}

// Wrapper component to safely use useExtensionState inside the provider
const ExtensionStateProviderWithOverrides: React.FC<{
	overrides?: Partial<ExtensionStateContextType>
	children: React.ReactNode
}> = ({ overrides, children }) => {
	const extensionState = useExtensionState()
	const value = { ...extensionState, ...overrides }
	return (
		<ExtensionStateContext.Provider value={value}>
			<ChatMessagesContext.Provider value={value.dietcodeMessages}>{children}</ChatMessagesContext.Provider>
		</ExtensionStateContext.Provider>
	)
}

const DietCodeAuthProviderWithOverrides: React.FC<{
	overrides?: Partial<DietCodeAuthContextType>
	children: React.ReactNode
}> = ({ overrides, children }) => {
	const authContext = useDietCodeAuth()
	return <DietCodeAuthContext.Provider value={{ ...authContext, ...overrides }}>{children}</DietCodeAuthContext.Provider>
}

export const createStorybookDecorator =
	(
		overrideStates?: Partial<ExtensionStateContextType>,
		classNames?: string,
		authOverrides?: Partial<DietCodeAuthContextType>,
	) =>
	(Story: any) => (
		<ExtensionStateProviderWithOverrides overrides={overrideStates}>
			<DietCodeAuthProviderWithOverrides overrides={authOverrides}>
				<div className={cn("max-w-lg mx-auto", classNames)}>
					<Story />
				</div>
			</DietCodeAuthProviderWithOverrides>
		</ExtensionStateProviderWithOverrides>
	)

export const StorybookWebview = StorybookDecoratorProvider()
