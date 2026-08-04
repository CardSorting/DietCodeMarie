import { type ReactNode } from "react"
import { DietCodeAuthProvider } from "./context/DietCodeAuthContext"
import { ExtensionStateContextProvider } from "./context/ExtensionStateContext"
import { PlatformProvider } from "./context/PlatformContext"

export function Providers({ children }: { children: ReactNode }) {
	return (
		<PlatformProvider>
			<ExtensionStateContextProvider>
				<DietCodeAuthProvider>{children}</DietCodeAuthProvider>
			</ExtensionStateContextProvider>
		</PlatformProvider>
	)
}
