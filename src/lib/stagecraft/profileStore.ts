// Dynamic profile store for Stagecraft.
// Reads from .stagecraft/profile.json when it exists (user-edited via the UI).
// Falls back to the hardcoded profile.ts when the file is absent.
// Server-only.

import { promises as fs } from "node:fs";
import path from "node:path";
import { profile as defaultProfile } from "./profile";
import type { Profile } from "./types";

const DATA_DIR = path.join(process.cwd(), ".stagecraft");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");

export async function getProfile(): Promise<Profile> {
  try {
    const raw = await fs.readFile(PROFILE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Profile;
    // Merge with defaults so new fields added to the type don't break old saves
    return { ...defaultProfile, ...parsed };
  } catch {
    // File doesn't exist yet → return the hardcoded default
    return defaultProfile;
  }
}

export async function saveProfile(p: Profile): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROFILE_FILE, JSON.stringify(p, null, 2), "utf8");
}

/** True once the user has saved a profile (i.e. not just the hardcoded default). */
export async function profileFileExists(): Promise<boolean> {
  try {
    await fs.access(PROFILE_FILE);
    return true;
  } catch {
    return false;
  }
}
