import * as crypto from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { ensureTaskDirectoryExists } from "@core/storage/disk"
import { Logger } from "@/shared/services/Logger"
import { DesignIntelligenceGraph } from "./types"

/** Persists the resident's product model by workspace, independently of an individual task receipt. */
export class DesignIntelligenceStore {
	public static async load(workspaceDir: string): Promise<DesignIntelligenceGraph | undefined> {
		try {
			const content = await fs.readFile(await DesignIntelligenceStore.filePath(workspaceDir), "utf8")
			return JSON.parse(content) as DesignIntelligenceGraph
		} catch {
			return undefined
		}
	}

	public static async save(workspaceDir: string, graph: DesignIntelligenceGraph): Promise<void> {
		try {
			await fs.writeFile(await DesignIntelligenceStore.filePath(workspaceDir), JSON.stringify(graph, null, 2), "utf8")
		} catch (error) {
			Logger.warn("[Designer-in-Residence] Could not persist the workspace design intelligence graph", error)
		}
	}

	private static async filePath(workspaceDir: string): Promise<string> {
		const workspaceId = crypto.createHash("sha256").update(workspaceDir).digest("hex").slice(0, 24)
		const directory = await ensureTaskDirectoryExists(`designer-in-residence-${workspaceId}`)
		return path.join(directory, "design_intelligence_graph.json")
	}
}
