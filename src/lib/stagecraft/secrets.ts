// Server-only secret resolution for Stagecraft.
// Precedence: process.env → .stagecraft/secrets.json (gitignored, never
// returned to the client). Single-user v0 model — do NOT import from a
// client component.

import { promises as fs } from "node:fs";
import path from "node:path";

const SECRETS_PATH = path.join(process.cwd(), ".stagecraft", "secrets.json");

export type SecretName = "ANTHROPIC_API_KEY" | "OPENAI_API_KEY";

async function readFileSecrets(): Promise<Partial<Record<SecretName, string>>> {
  try {
    return JSON.parse(await fs.readFile(SECRETS_PATH, "utf8")) as Partial<
      Record<SecretName, string>
    >;
  } catch {
    return {};
  }
}

async function resolve(name: SecretName): Promise<string | undefined> {
  const env = process.env[name];
  if (env) return env;
  return (await readFileSecrets())[name];
}

export const getAnthropicKey = (): Promise<string | undefined> =>
  resolve("ANTHROPIC_API_KEY");
export const getOpenAIKey = (): Promise<string | undefined> =>
  resolve("OPENAI_API_KEY");

export async function setSecret(name: SecretName, value: string): Promise<void> {
  await fs.mkdir(path.dirname(SECRETS_PATH), { recursive: true });
  const current = await readFileSecrets();
  current[name] = value.trim();
  await fs.writeFile(SECRETS_PATH, JSON.stringify(current, null, 2), "utf8");
  try {
    await fs.chmod(SECRETS_PATH, 0o600);
  } catch {
    /* best-effort file perms */
  }
}

export async function clearSecret(name: SecretName): Promise<void> {
  const current = await readFileSecrets();
  delete current[name];
  await fs.writeFile(SECRETS_PATH, JSON.stringify(current, null, 2), "utf8");
}

/** Booleans only — never the values. Env presence OR file presence. */
export async function getSecretStatus(): Promise<Record<SecretName, boolean>> {
  const file = await readFileSecrets();
  return {
    ANTHROPIC_API_KEY: Boolean(
      process.env.ANTHROPIC_API_KEY || file.ANTHROPIC_API_KEY,
    ),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY || file.OPENAI_API_KEY),
  };
}
