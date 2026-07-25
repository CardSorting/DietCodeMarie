import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import { writeCoalescer } from "../../core/storage/WriteCoalescer"
import { Logger } from "../services/Logger"
import { DietCodeSyncStorage } from "./DietCodeStorage"

export interface DietCodeFileStorageOptions {
	/**
	 * File permissions mode (e.g., 0o600 for owner read/write only).
	 * If not set, uses the system default.
	 */
	fileMode?: number
}

/**
 * Synchronous file-backed JSON storage.
 * Stores any JSON-serializable values with sync read and write.
 * Used for VSCode Memento compatibility and CLI environments.
 */
export class DietCodeFileStorage<T = unknown> extends DietCodeSyncStorage<T> {
	protected name: string
	private data: Record<string, T>
	private readonly fsPath: string
	private readonly fileMode?: number

	constructor(filePath: string, name = "DietCodeFileStorage", options?: DietCodeFileStorageOptions) {
		super()
		this.fsPath = filePath
		this.name = name
		this.fileMode = options?.fileMode
		this.data = this.readFromDisk()
	}

	protected _get(key: string): T | undefined {
		return this.data[key]
	}

	public override set(key: string, value: T | undefined): void {
		try {
			this.setBatch({ [key]: value })
		} catch (error) {
			Logger.error(`[${this.name}] failed to set '${key}':`, error)
		}
	}

	protected _set(key: string, value: T | undefined): void {
		// Use setBatch for consistency - all writes go through one path
		this.setBatch({ [key]: value })
	}

	protected _delete(key: string): void {
		this.setBatch({ [key]: undefined })
	}

	/**
	 * Set multiple keys in a single write operation.
	 * More efficient than calling set() for each key individually,
	 * since it only writes to disk once.
	 */
	public setBatch(entries: Record<string, T | undefined>): Thenable<void> {
		const changedKeys: string[] = []
		for (const [key, value] of Object.entries(entries)) {
			if (value === undefined) {
				if (key in this.data) {
					delete this.data[key]
					changedKeys.push(key)
				}
			} else {
				if (this.data[key] !== value) {
					this.data[key] = value
					changedKeys.push(key)
				}
			}
		}
		if (changedKeys.length > 0) {
			this.writeToDisk()
			for (const key of changedKeys) {
				this.fireChange(key)
			}
		}
		return Promise.resolve()
	}

	protected _keys(): readonly string[] {
		return Object.keys(this.data)
	}

	private readFromDisk(): Record<string, T> {
		try {
			if (fs.existsSync(this.fsPath)) {
				const content = fs.readFileSync(this.fsPath, "utf-8")
				try {
					return JSON.parse(content)
				} catch (parseError) {
					Logger.error(`[${this.name}] failed to parse ${this.fsPath}, attempting restore from backup:`, parseError)
					const bakPath = `${this.fsPath}.bak`
					if (fs.existsSync(bakPath)) {
						const bakContent = fs.readFileSync(bakPath, "utf-8")
						return JSON.parse(bakContent)
					}
				}
			}
		} catch (error) {
			Logger.error(`[${this.name}] failed to read from ${this.fsPath}:`, error)
		}
		return {}
	}

	private writeToDisk(): void {
		writeCoalescer.coalesceWriteWithPayload(
			this.fsPath,
			() => JSON.stringify(this.data),
			async (content) => {
				try {
					const dir = path.dirname(this.fsPath)
					await fs.promises.mkdir(dir, { recursive: true })
					const tmpPath = `${this.fsPath}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`
					await fs.promises.writeFile(tmpPath, content, { encoding: "utf-8", mode: this.fileMode })
					await fs.promises.rename(tmpPath, this.fsPath)
				} catch (error) {
					Logger.error(`[${this.name}] failed to write to ${this.fsPath}:`, error)
				}
			},
			500,
		)
	}
}
