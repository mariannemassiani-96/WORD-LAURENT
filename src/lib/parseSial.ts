import { SialPosition } from "./types";

function stripRtf(rtf: string): string {
  let text = rtf;

  // Handle RTF encoded characters \'XX
  const cp1252Map: Record<string, string> = {
    "80": "\u20AC", "82": "\u201A", "83": "\u0192", "84": "\u201E",
    "85": "\u2026", "86": "\u2020", "87": "\u2021", "88": "\u02C6",
    "89": "\u2030", "8a": "\u0160", "8b": "\u2039", "8c": "\u0152",
    "8e": "\u017D", "91": "\u2018", "92": "\u2019", "93": "\u201C",
    "94": "\u201D", "95": "\u2022", "96": "\u2013", "97": "\u2014",
    "98": "\u02DC", "99": "\u2122", "9a": "\u0161", "9b": "\u203A",
    "9c": "\u0153", "9e": "\u017E", "9f": "\u0178",
    "e0": "\u00E0", "e1": "\u00E1", "e2": "\u00E2", "e3": "\u00E3",
    "e4": "\u00E4", "e7": "\u00E7", "e8": "\u00E8", "e9": "\u00E9",
    "ea": "\u00EA", "eb": "\u00EB", "ee": "\u00EE", "ef": "\u00EF",
    "f4": "\u00F4", "f9": "\u00F9", "fa": "\u00FA", "fb": "\u00FB",
    "fc": "\u00FC", "c0": "\u00C0", "c9": "\u00C9", "ca": "\u00CA",
    "a0": "\u00A0", "ab": "\u00AB", "bb": "\u00BB", "b0": "\u00B0",
    "b2": "\u00B2", "a7": "\u00A7", "b7": "\u00B7", "2d": "-",
    "20": " ",
  };

  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
    const lower = hex.toLowerCase();
    if (cp1252Map[lower]) return cp1252Map[lower];
    const code = parseInt(hex, 16);
    return String.fromCharCode(code);
  });

  // Remove RTF groups using brace counting
  let result = "";
  let depth = 0;
  let skipDepth = -1;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === "{") {
      depth++;
      const ahead = text.substring(i + 1, i + 50);
      if (
        /^\\fonttbl/.test(ahead) ||
        /^\\colortbl/.test(ahead) ||
        /^\\stylesheet/.test(ahead) ||
        /^\\\*\\listtable/.test(ahead) ||
        /^\\\*\\listoverride/.test(ahead) ||
        /^\\info/.test(ahead) ||
        /^\\header/.test(ahead) ||
        /^\\footer/.test(ahead) ||
        /^\\\*\\/.test(ahead) ||
        /^\\pict/.test(ahead)
      ) {
        skipDepth = depth;
      }
      i++;
      continue;
    }

    if (ch === "}") {
      if (depth === skipDepth) skipDepth = -1;
      depth--;
      i++;
      continue;
    }

    if (skipDepth > 0 && depth >= skipDepth) {
      i++;
      continue;
    }

    if (ch === "\\") {
      const match = text.substring(i).match(/^\\([a-z]+)(-?\d+)? ?/);
      if (match) {
        const word = match[1];
        if (word === "par" || word === "line") result += "\n";
        else if (word === "tab") result += "\t";
        else if (word === "cell") result += "|";
        else if (word === "row") result += "\n";
        i += match[0].length;
        continue;
      }
      if (i + 1 < text.length) {
        const next = text[i + 1];
        if (next === "\\" || next === "{" || next === "}") {
          result += next;
          i += 2;
          continue;
        }
      }
      i++;
      continue;
    }

    result += ch;
    i++;
  }

  result = result.replace(/\r/g, "");
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trim();
}

function parseAmount(str: string): number {
  // Parse "€ 707,63" or "5 661,04" or "€ 6 764,98"
  const cleaned = str
    .replace(/[€\u20AC]/g, "")
    .replace(/\u00A0/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

export function parseSialRtf(rtfContent: string): SialPosition[] {
  const text = stripRtf(rtfContent);
  const positions: SialPosition[] = [];

  // Split the text into sections by "Position N|"
  const posRegex = /Position\s+(\d+)\|([^|\n]*)\|/g;
  const matches: { index: number; position: number; type: string }[] = [];
  let m;
  while ((m = posRegex.exec(text)) !== null) {
    matches.push({
      index: m.index,
      position: parseInt(m[1]),
      type: m[2].trim(),
    });
  }

  for (let mi = 0; mi < matches.length; mi++) {
    const start = matches[mi].index;
    const end = mi + 1 < matches.length ? matches[mi + 1].index : text.indexOf("Total ht|", start);
    const block = text.substring(start, end > start ? end : undefined);

    // Extract key-value pairs from pipe-separated lines
    // Format: |Key|Value|Key|Value|...
    const details: Record<string, string> = {};
    const detailRegex = /\|([^|]+)\|([^|]+)/g;
    let dm;
    const blockForDetails = block.replace(/Position\s+\d+\|[^|]*\|[^|]*\|/, "");

    while ((dm = detailRegex.exec(blockForDetails)) !== null) {
      const key = dm[1].trim();
      const val = dm[2].trim();
      // Skip numeric/price-looking entries and meta entries
      if (
        key &&
        val &&
        !key.match(/^(Total|Qté|x\s|\d|€)/) &&
        !val.match(/^(Total|Qté)/) &&
        key !== "||" &&
        val !== "||"
      ) {
        details[key] = val;
      }
    }

    // Extract price info
    let prixUnitaire = 0;
    let quantite = 0;
    let totalHT = 0;

    // "Total unitaire ht\n€ 707,63" or "Total unitaire ht €707,63"
    const prixMatch = block.match(
      /Total unitaire ht[\s\n]*[€\u20AC]?\s*([\d\s,.]+)/i
    );
    if (prixMatch) prixUnitaire = parseAmount(prixMatch[1]);

    const qtyMatch = block.match(/x\s*(\d+)/);
    if (qtyMatch) quantite = parseInt(qtyMatch[1]);

    const totalMatch = block.match(
      /Total ht[\s\n]*[€\u20AC]?\s*([\d\s,.]+)/i
    );
    if (totalMatch) totalHT = parseAmount(totalMatch[1]);

    positions.push({
      position: matches[mi].position,
      type: matches[mi].type,
      gamme: details["Gamme"] || "",
      dimensions: details["Dimensions (LxH)"] || "",
      coloris: details["Coloris"] || "",
      teinteAccessoires: details["Teinte Accessoires"] || "",
      ouverture: details["Ouverture"] || "",
      hauteurPoignee: details["Hauteur poignée"] || details["Hauteur poignee"] || "",
      vitrage: details["Vitrage"] || "",
      poids: details["Poids"] || "",
      surface: details["Surface"] || "",
      prixUnitaireHT: prixUnitaire,
      quantite: quantite,
      totalHT: totalHT,
      options: [],
    });
  }

  return positions;
}
