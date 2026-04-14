export interface SialPosition {
  position: number;
  type: string; // e.g. "OF2"
  gamme: string;
  dimensions: string;
  coloris: string;
  teinteAccessoires: string;
  ouverture: string;
  hauteurPoignee: string;
  vitrage: string;
  poids: string;
  surface: string;
  prixUnitaireHT: number;
  quantite: number;
  totalHT: number;
  options: string[];
  imageDataUrl?: string; // base64 data URL for position image
}

export interface DevisLine {
  id: string;
  position: number;
  designation: string;
  description: string;
  details: Record<string, string>;
  prixUnitaireHT: number;
  quantite: number;
  totalHT: number;
  margePercent: number;
  prixVenteUnitaireHT: number;
  totalVenteHT: number;
  isSialImport: boolean;
  imageDataUrl?: string; // base64 data URL for position image
}

export interface ExtraLine {
  id: string;
  designation: string;
  prixUnitaireHT: number;
  quantite: number;
  totalHT: number;
}

export interface ClientInfo {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
}

export interface DevisConfig {
  reference: string;
  date: string;
  concepteur: string;
  client: ClientInfo;
  lines: DevisLine[];
  extraLines: ExtraLine[];
  tvaRate: number;
  ecoParticipation: number;
}
