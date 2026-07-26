import fs from "node:fs/promises"
import path from "node:path"
import { HostProvider } from "@/hosts/host-provider"
import { SensitiveDataMasker } from "@/shared/utils/SensitiveDataMasker"

export interface AuditEntry {
	ts: number
	command: string
	args: string[]
	duration?: number
	exitCode?: number
	error?: string
	metadata?: Record<string, any>
}

export class AuditLogService {
	private static instance: AuditLogService
	private logPath: string | null = null
	private buffer: string[] = []
	private flushTimer: NodeJS.Timeout | null = null

	public static getInstance(): AuditLogService {
		if (!AuditLogService.instance) {
			AuditLogService.instance = new AuditLogService()
		}
		return AuditLogService.instance
	}

	public async initialize(configDir?: string): Promise<void> {
		const baseDir = configDir || HostProvider.get().globalStorageFsPath
		this.logPath = path.join(baseDir, "audit.log.jsonl")

		try {
			await fs.mkdir(path.dirname(this.logPath), { recursive: true })
		} catch {
			// Ignore
		}
	}

	public async log(entry: Omit<AuditEntry, "ts">): Promise<void> {
		if (!this.logPath) return

		const maskedArgs = entry.args.map((arg) => SensitiveDataMasker.mask(arg))
		const maskedError = entry.error ? SensitiveDataMasker.mask(entry.error) : undefined

		const fullEntry: AuditEntry = {
			ts: Date.now(),
			command: entry.command,
			args: maskedArgs,
			duration: entry.duration,
			exitCode: entry.exitCode,
			error: maskedError,
			metadata: entry.metadata,
		}

		const line = JSON.stringify(fullEntry) + "\n"
		this.buffer.push(line)

		if (this.buffer.length >= 20) {
			await this.flush()
		} else if (!this.flushTimer) {
			this.flushTimer = setTimeout(() => {
				void this.flush()
			}, 1000)
		}
	}

	public async flush(): Promise<void> {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer)
			this.flushTimer = null
		}

		if (this.buffer.length === 0 || !this.logPath) {
			return
		}

		const payload = this.buffer.join("")
		this.buffer = []

		try {
			await fs.appendFile(this.logPath, payload, "utf8")
		} catch {
			// Fail silently to avoid interrupting main flow
		}
	}
}
