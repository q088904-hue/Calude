// Persistent user config for Stagecraft.
// Stored at .stagecraft/config.json alongside profile.json and sessions.json.
// Lightweight — only fields that don't belong in the coaching profile live here.

import { promises as fs } from "node:fs";
import * as path from "node:path";

export interface StagecraftConfig {
  /** ISO date string, e.g. "2026-06-20" */
  interviewDate?: string;
  /** Human-readable company + role, e.g. "Kohler India — Creative Director" */
  interviewCompany?: string;
}

const CONFIG_PATH = path.join(process.cwd(), ".stagecraft", "config.json");

export async function getConfig(): Promise<StagecraftConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as StagecraftConfig;
  } catch {
    return {};
  }
}

export async function saveConfig(c: StagecraftConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(c, null, 2), "utf8");
}
