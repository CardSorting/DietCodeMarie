import should from "should"
import { DietCodeError, DietCodeErrorType } from "../DietCodeError"

describe("DietCodeError", () => {
	it("should cleanly unwrap nested JSON error payloads and extract code", () => {
		const rawPayload = JSON.stringify({
			error: {
				message: "Compute capacity is temporarily constrained for this model. Automatic failover active. Please retry shortly.",
				type: "rate_limit_error",
				code: "capacity_constrained",
			},
		})

		const error = new DietCodeError(new Error(rawPayload), "gpt-5.6-sol", "galx")
		should(error.message).equal(
			"Compute capacity is temporarily constrained for this model. Automatic failover active. Please retry shortly.",
		)
		should(error._error.code).equal("capacity_constrained")
		should(error._error.message).equal(
			"Compute capacity is temporarily constrained for this model. Automatic failover active. Please retry shortly.",
		)
	})

	it("should strip HTTP status prefixes from raw error strings", () => {
		const error = new DietCodeError(new Error("500 Server encountered a transient constraint"), "gpt-5.6-sol", "galx")
		should(error.message).equal("Server encountered a transient constraint")
	})

	it("should unwrap status prefix with embedded JSON cleanly", () => {
		const error = new DietCodeError(
			new Error('500 {"error":{"message":"Resource temporarily constrained","code":"capacity_constrained"}}'),
			"gpt-5.6-sol",
			"galx",
		)
		should(error.message).equal("Resource temporarily constrained")
		should(error._error.code).equal("capacity_constrained")
	})

	it("should classify HTTP 429 and capacity_constrained as RateLimit error type for seamless UI retry", () => {
		const error429 = new DietCodeError({
			status: 429,
			message: "Compute capacity is temporarily constrained for this model. Automatic failover active. Please retry shortly.",
			code: "capacity_constrained",
		})
		should(DietCodeError.getErrorType(error429)).equal(DietCodeErrorType.RateLimit)

		const errorSaturated = new DietCodeError({
			status: 503,
			message: "Compute capacity for provider 'openai' is temporarily saturated. Automatic failover active.",
		})
		should(DietCodeError.getErrorType(errorSaturated)).equal(DietCodeErrorType.RateLimit)

		const errorDispatchFailed = new DietCodeError({
			status: 500,
			code: "router_dispatch_failed",
			message: "Compute capacity is temporarily constrained for this model. Automatic failover active.",
		})
		should(DietCodeError.getErrorType(errorDispatchFailed)).equal(DietCodeErrorType.RateLimit)

		const errorPoolExhausted = new DietCodeError({
			status: 500,
			code: "pool_exhausted",
			message: "Compute capacity is temporarily constrained for provider 'openai'. Automatic failover active.",
		})
		should(DietCodeError.getErrorType(errorPoolExhausted)).equal(DietCodeErrorType.RateLimit)
	})
})
