import { ApiProvider as ProtoApiProvider } from "@shared/proto/dietcode/models"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelsServiceClient } from "@/services/grpc-client"
import { useApiConfigurationHandlers } from "../useApiConfigurationHandlers"

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: vi.fn(),
}))

vi.mock("@/services/grpc-client", () => ({
	ModelsServiceClient: {
		updateApiConfigurationPartial: vi.fn().mockResolvedValue({}),
	},
}))

describe("useApiConfigurationHandlers", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useExtensionState).mockReturnValue({
			planActSeparateModelsSetting: true,
		} as unknown as ReturnType<typeof useExtensionState>)
	})

	it("updates openrouter without sending a stale full configuration", async () => {
		const { result } = renderHook(() => useApiConfigurationHandlers())

		await act(() =>
			result.current.handleModeFieldChange({ plan: "planModeApiProvider", act: "actModeApiProvider" }, "openrouter", "act"),
		)

		expect(ModelsServiceClient.updateApiConfigurationPartial).toHaveBeenCalledWith(
			expect.objectContaining({
				updateMask: ["actModeApiProvider"],
				apiConfiguration: expect.objectContaining({
					actModeApiProvider: ProtoApiProvider.OPENROUTER,
					planModeApiProvider: undefined,
				}),
			}),
		)
	})

	it("persists the OpenRouter API key through the partial request", async () => {
		const { result } = renderHook(() => useApiConfigurationHandlers())

		await act(() => result.current.handleFieldChange("openRouterApiKey", "sk-or-v1-test"))

		expect(ModelsServiceClient.updateApiConfigurationPartial).toHaveBeenCalledWith(
			expect.objectContaining({
				updateMask: ["openRouterApiKey"],
				apiConfiguration: expect.objectContaining({ openRouterApiKey: "sk-or-v1-test" }),
			}),
		)
	})

	it("marks OpenRouter API key for immediate backend persistence", async () => {
		const { result } = renderHook(() => useApiConfigurationHandlers())

		await act(() =>
			result.current.handleFieldChange("openRouterApiKey", "sk-or-v1-test", {
				flushImmediately: true,
			}),
		)

		expect(ModelsServiceClient.updateApiConfigurationPartial).toHaveBeenCalledWith(
			expect.objectContaining({
				updateMask: ["openRouterApiKey"],
				flushImmediately: true,
				apiConfiguration: expect.objectContaining({ openRouterApiKey: "sk-or-v1-test" }),
			}),
		)
	})

	it("updates both provider fields atomically when Plan and Act are linked", async () => {
		vi.mocked(useExtensionState).mockReturnValue({
			planActSeparateModelsSetting: false,
		} as unknown as ReturnType<typeof useExtensionState>)
		const { result } = renderHook(() => useApiConfigurationHandlers())

		await act(() =>
			result.current.handleModeFieldChange({ plan: "planModeApiProvider", act: "actModeApiProvider" }, "openrouter", "act"),
		)

		expect(ModelsServiceClient.updateApiConfigurationPartial).toHaveBeenCalledWith(
			expect.objectContaining({
				updateMask: ["planModeApiProvider", "actModeApiProvider"],
				apiConfiguration: expect.objectContaining({
					planModeApiProvider: ProtoApiProvider.OPENROUTER,
					actModeApiProvider: ProtoApiProvider.OPENROUTER,
				}),
			}),
		)
	})
})
