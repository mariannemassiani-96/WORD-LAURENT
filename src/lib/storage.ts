import { DevisConfig } from "./types";

export interface SavedDevis {
  id: string;
  name: string;
  savedAt: string;
  config: DevisConfig;
}

const STORAGE_KEY = "casapertura_devis";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function getSavedDevisList(): SavedDevis[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveDevis(config: DevisConfig, name?: string): SavedDevis {
  const list = getSavedDevisList();
  const devisName =
    name ||
    `${config.client.nom || "Sans nom"} - ${config.reference || "Nouveau"}`;

  // Check if same reference exists → update it
  const existingIdx = list.findIndex(
    (d) => d.config.reference === config.reference && config.reference
  );

  const saved: SavedDevis = {
    id: existingIdx >= 0 ? list[existingIdx].id : generateId(),
    name: devisName,
    savedAt: new Date().toISOString(),
    config,
  };

  if (existingIdx >= 0) {
    list[existingIdx] = saved;
  } else {
    list.unshift(saved);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return saved;
}

export function loadDevis(id: string): DevisConfig | null {
  const list = getSavedDevisList();
  const found = list.find((d) => d.id === id);
  return found ? found.config : null;
}

export function deleteDevis(id: string): void {
  const list = getSavedDevisList().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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
        const config = JSON.parse(reader.result as string) as DevisConfig;
        resolve(config);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}
