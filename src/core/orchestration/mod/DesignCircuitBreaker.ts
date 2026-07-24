import { Logger } from "@/shared/services/Logger"

export interface CircuitBreakerOptions<T> {
	name: string
	timeoutMs?: number
	fallback: () => T
}

/**
 * Adaptive Design Circuit Breaker
 * Enforces strict timeouts and instant fallback triggers on model streams and external calls
 * so the Designer-in-Residence pipeline never stalls or hangs.
 */
export class DesignCircuitBreaker {
	public static async executeWithFallback<T>(action: () => Promise<T>, options: CircuitBreakerOptions<T>): Promise<T> {
		const timeoutMs = options.timeoutMs ?? 15_000

		let timer: NodeJS.Timeout | undefined
		const timeoutPromise = new Promise<never>((_, reject) => {
			timer = setTimeout(() => {
				reject(new Error(`[CircuitBreaker] ${options.name} timed out after ${timeoutMs}ms`))
			}, timeoutMs)
		})

		try {
			const result = await Promise.race([action(), timeoutPromise])
			if (timer) clearTimeout(timer)
			return result
		} catch (error) {
			if (timer) clearTimeout(timer)
			Logger.warn(`[CircuitBreaker] ${options.name} failed or timed out; activating deterministic fallback`, error)
			return options.fallback()
		}
	}
}
