import { DevisConfig } from "./types";

export interface SavedDevis {
  id: string;
  name: string;
  reference?: string;
  client_nom?: string;
  created_at?: string;
  updated_at?: string;
  config?: DevisConfig;
}

export async function getSavedDevisList(): Promise<SavedDevis[]> {
  try {
    const res = await fetch("/api/devis");
    if (!res.ok) return getLocalList();
    return await res.json();
  } catch {
    return getLocalList();
  }
}

export async function saveDevis(
  config: DevisConfig,
  existingId?: string
): Promise<SavedDevis> {
  const name = `${config.client?.nom || "Sans nom"} - ${config.reference || "Nouveau"}`;
  try {
    const res = await fetch("/api/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: existingId, name, config }),
    });
    if (!res.ok) throw new Error("API error");
    const saved = await res.json();
    // Also save locally as fallback
    saveLocal(saved.id, name, config);
    return saved;
  } catch {
    // Fallback to localStorage
    const id = existingId || Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    saveLocal(id, name, config);
    return { id, name };
  }
}

export async function loadDevis(id: string): Promise<DevisConfig | null> {
  try {
    const res = await fetch(`/api/devis/${id}`);
    if (!res.ok) throw new Error("Not found");
    const data = await res.json();
    return data.config;
  } catch {
    // Fallback to localStorage
    return loadLocal(id);
  }
}

export async function deleteDevis(id: string): Promise<void> {
  try {
    await fetch(`/api/devis/${id}`, { method: "DELETE" });
  } catch {
    // ignore
  }
  deleteLocal(id);
}

export function exportDevisToJson(config: DevisConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `devis_${config.reference || "export"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDevisFromJson(file: File): Promise<DevisConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string) as DevisConfig);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}

// --- localStorage fallback ---
const STORAGE_KEY = "casapertura_devis";

function getLocalList(): SavedDevis[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocal(id: string, name: string, config: DevisConfig): void {
  if (typeof window === "undefined") return;
  const list = getLocalList();
  const idx = list.findIndex((d) => d.id === id);
  const entry: SavedDevis = {
    id,
    name,
    updated_at: new Date().toISOString(),
    config,
  };
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadLocal(id: string): DevisConfig | null {
  const list = getLocalList();
  return list.find((d) => d.id === id)?.config || null;
}

function deleteLocal(id: string): void {
  if (typeof window === "undefined") return;
  const list = getLocalList().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
