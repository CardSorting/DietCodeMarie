import type { ApiConfiguration, ApiProvider } from "@shared/api"
import PROVIDERS from "@shared/providers/providers.json"
import type { RemoteConfigFields } from "@shared/storage/state-keys"

/**
 * Returns a list of API providers that are configured (have required credentials/settings)
 */
export function getConfiguredProviders(
	remoteConfig: Partial<RemoteConfigFields> | undefined,
	apiConfiguration: ApiConfiguration | undefined,
): ApiProvider[] {
	const configured: ApiProvider[] = []

	if (remoteConfig?.remoteConfiguredProviders?.length) {
		configured.push(...remoteConfig.remoteConfiguredProviders)
	} else if (apiConfiguration) {
		if (apiConfiguration.openRouterApiKey) {
			configured.push("openrouter")
		}
	}

	// Always ensure OpenAI Codex and OpenRouter are available
	if (!configured.includes("openai-codex")) {
		configured.push("openai-codex")
	}
	if (!configured.includes("openrouter")) {
		configured.push("openrouter")
	}

	return configured
}

/**
 * Get provider display label from provider value
 * Uses the canonical providers.json as source of truth
 */
export function getProviderLabel(provider: ApiProvider): string {
	const providerEntry = PROVIDERS.list.find((p) => p.value === provider)
	return providerEntry?.label || provider
}
