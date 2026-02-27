import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type KoleoConfig = {
  email?: string;
  password?: string;
  auth?: Record<string, string>;
};

export const DEFAULT_CONFIG_PATH = join(homedir(), ".config", "koleo-mcp", "config.json");

export async function loadConfig(path?: string): Promise<KoleoConfig> {
  const configPath = path ?? process.env.KOLEO_MCP_CONFIG ?? DEFAULT_CONFIG_PATH;
  if (!existsSync(configPath)) {
    return {};
  }

  const raw = await readFile(configPath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as KoleoConfig) : {};
  } catch {
    return {};
  }
}
