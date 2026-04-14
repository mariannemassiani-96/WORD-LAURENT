import { SialPosition } from "./types";

/**
 * Strip RTF control codes and extract plain text with pipe separators.
 */
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
    "b2": "\u00B2", "a7": "\u00A7", "b7": "\u00B7",
  };

  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
    const lower = hex.toLowerCase();
    if (cp1252Map[lower]) return cp1252Map[lower];
    const code = parseInt(hex, 16);
    return String.fromCharCode(code);
  });

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

/**
 * Extract readable text from binary .doc (OLE2) files.
 * Finds ASCII/Latin text runs embedded in the binary stream.
 */
function extractTextFromBinaryDoc(data: string): string {
  // Look for runs of printable characters (at least 4 chars long)
  const runs: string[] = [];
  let current = "";

  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    // Printable ASCII + extended Latin
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255) || code === 10 || code === 13 || code === 9) {
      current += data[i];
    } else {
      if (current.length >= 3) {
        runs.push(current);
      }
      current = "";
    }
  }
  if (current.length >= 3) runs.push(current);

  return runs.join("\n");
}

/**
 * Extract images from RTF \pict groups as base64 data URLs.
 * Returns array of data URLs in order of appearance.
 */
function extractImagesFromRtf(rtf: string): string[] {
  const images: string[] = [];
  let i = 0;

  while (i < rtf.length) {
    const pictIdx = rtf.indexOf("\\pict", i);
    if (pictIdx === -1) break;

    // Find the opening brace before \pict
    let braceStart = pictIdx;
    for (let j = pictIdx - 1; j >= Math.max(0, pictIdx - 10); j--) {
      if (rtf[j] === "{") {
        braceStart = j;
        break;
      }
    }

    // Match braces to find the end of the \pict group
    let depth = 0;
    let end = braceStart;
    for (let j = braceStart; j < rtf.length; j++) {
      if (rtf[j] === "{") depth++;
      else if (rtf[j] === "}") depth--;
      if (depth === 0) {
        end = j + 1;
        break;
      }
    }

    const group = rtf.substring(braceStart, end);

    // Determine image type
    let mimeType = "image/png";
    if (group.includes("jpegblip")) mimeType = "image/jpeg";
    else if (group.includes("pngblip")) mimeType = "image/png";

    // Extract hex data after the blip marker
    const blipMatch = group.match(/(?:pngblip|jpegblip)\s*/);
    if (blipMatch) {
      const hexStart = group.indexOf(blipMatch[0]) + blipMatch[0].length;
      let hexPart = group.substring(hexStart);
      // Remove control words, braces, whitespace - keep only hex chars
      hexPart = hexPart.replace(/\\[a-z]+\d*\s*/g, "");
      hexPart = hexPart.replace(/[{}\s\r\n]/g, "");

      if (hexPart.length > 20) {
        // Convert hex to base64
        try {
          const bytes = new Uint8Array(hexPart.length / 2);
          for (let b = 0; b < hexPart.length; b += 2) {
            bytes[b / 2] = parseInt(hexPart.substring(b, b + 2), 16);
          }
          // Convert to base64
          let binary = "";
          for (let b = 0; b < bytes.length; b++) {
            binary += String.fromCharCode(bytes[b]);
          }
          const base64 = btoa(binary);
          images.push(`data:${mimeType};base64,${base64}`);
        } catch {
          // Skip invalid images
        }
      }
    }

    i = end;
  }

  return images;
}

function parseAmount(str: string): number {
  // Parse "€ 707,63" or "5 661,04" or "€ 6 764,98" or "E 5 542,15"
  let cleaned = str
    .replace(/[€\u20AC]/g, "")
    .replace(/\u00A0/g, "")
    .trim();

  // Handle "E 5 542,15" format (E = euro symbol in some docs)
  cleaned = cleaned.replace(/^E\s+/, "");

  // Remove spaces used as thousands separators (keep decimal comma)
  // "5 542,15" -> "5542,15"
  cleaned = cleaned.replace(/(\d)\s+(\d)/g, "$1$2");

  // Replace comma with dot for decimal
  cleaned = cleaned.replace(",", ".");

  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Parse content from a SIAL or CASAPERTURA document.
 * Handles both RTF and binary .doc formats.
 */
export function parseSialRtf(fileContent: string): SialPosition[] {
  // Detect if RTF or binary .doc
  const isRtf = fileContent.trimStart().startsWith("{\\rtf");
  const text = isRtf ? stripRtf(fileContent) : extractTextFromBinaryDoc(fileContent);

  // Extract images from RTF
  const images = isRtf ? extractImagesFromRtf(fileContent) : [];
  // In SIAL RTF: image[0] = header logo, image[1..N] = position images
  // Filter out small images (logos) - keep only product drawings (>10KB base64)
  const productImages = images.filter((img) => img.length > 15000);
  const headerLogo = images.find((img) => img.length > 1000 && img.length <= 15000);

  let positions: SialPosition[] = [];

  // Strategy 1: pipe-separated format (RTF output)
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

  if (matches.length > 0) {
    positions = parsePipeSeparated(text, matches);
  } else {
    // Strategy 2: plain text format (from binary .doc extraction)
    const plainPosRegex = /Position\s+(\d+)\s{2,}(.+)/g;
    const plainMatches: { index: number; position: number; title: string }[] = [];
    while ((m = plainPosRegex.exec(text)) !== null) {
      plainMatches.push({
        index: m.index,
        position: parseInt(m[1]),
        title: m[2].trim(),
      });
    }

    if (plainMatches.length > 0) {
      positions = parsePlainText(text, plainMatches);
    }
  }

  // Assign product images to positions
  for (let i = 0; i < positions.length && i < productImages.length; i++) {
    positions[i].imageDataUrl = productImages[i];
  }

  // Store header logo on first position as a marker (we'll use it in the UI)
  if (headerLogo && positions.length > 0) {
    // Header logo is stored separately - we pass it via a special convention
    // First position gets a _headerLogo property
    (positions as unknown as Record<string, unknown>)._headerLogo = headerLogo;
  }

  return positions;
}

/** Extract header logo from parsed positions (if available) */
export function getHeaderLogo(positions: SialPosition[]): string | undefined {
  return (positions as unknown as Record<string, unknown>)._headerLogo as string | undefined;
}

function parsePipeSeparated(
  text: string,
  matches: { index: number; position: number; type: string }[]
): SialPosition[] {
  const positions: SialPosition[] = [];

  for (let mi = 0; mi < matches.length; mi++) {
    const start = matches[mi].index;
    const end =
      mi + 1 < matches.length
        ? matches[mi + 1].index
        : text.indexOf("Total ht|", start + 50);
    const block = text.substring(start, end > start ? end : start + 2000);

    // Extract key-value pairs from pipe-separated data
    const details: Record<string, string> = {};
    const detailRegex = /\|([^|]+)\|([^|]+)/g;
    let dm;
    const blockForDetails = block.replace(
      /Position\s+\d+\|[^|]*\|[^|]*\|/,
      ""
    );

    while ((dm = detailRegex.exec(blockForDetails)) !== null) {
      const key = dm[1].trim();
      const val = dm[2].trim();
      if (
        key &&
        val &&
        !key.match(/^(Total|Qté|x\s|\d|€|E\s)/) &&
        !val.match(/^(Total|Qté)/) &&
        key !== "||" &&
        val !== "||"
      ) {
        details[key] = val;
      }
    }

    // Extract price: look specifically for "Total unitaire ht" followed by a price
    let prixUnitaire = 0;
    let quantite = 1;
    let totalHT = 0;

    // Match price after "Total unitaire ht" - handle multiline and "€" or "E" prefix
    const prixMatch = block.match(
      /Total unitaire ht[\s\n|]*[€\u20ACE]?\s*([\d][\d\s]*[,.][\d]+)/i
    );
    if (prixMatch) prixUnitaire = parseAmount(prixMatch[1]);

    // Match quantity: "x N" but only near the price section (after "Total unitaire")
    const priceSection = block.substring(
      block.search(/Total unitaire/i) || 0
    );
    const qtyMatch = priceSection.match(/[x×]\s*(\d+)/);
    if (qtyMatch) quantite = parseInt(qtyMatch[1]);

    // Match total HT
    const totalMatch = block.match(
      /Total ht[\s\n|]*[€\u20ACE]?\s*([\d][\d\s]*[,.][\d]+)/i
    );
    if (totalMatch) totalHT = parseAmount(totalMatch[1]);

    // If no total found, calculate from unit price * qty
    if (!totalHT && prixUnitaire) totalHT = prixUnitaire * quantite;

    positions.push({
      position: matches[mi].position,
      type: matches[mi].type,
      gamme: details["Gamme"] || "",
      dimensions:
        details["Dimensions (LxH)"] || details["Dimensions"] || "",
      coloris: details["Coloris"] || "",
      teinteAccessoires:
        details["Teinte Accessoires"] || details["Coloris acc"] || "",
      ouverture: details["Ouverture"] || "",
      hauteurPoignee:
        details["Hauteur poignée"] ||
        details["Hauteur poignee"] ||
        details["Hauteur poign\u00E9e"] ||
        "",
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

function parsePlainText(
  text: string,
  matches: { index: number; position: number; title: string }[]
): SialPosition[] {
  const positions: SialPosition[] = [];

  for (let mi = 0; mi < matches.length; mi++) {
    const start = matches[mi].index;
    const end =
      mi + 1 < matches.length ? matches[mi + 1].index : start + 3000;
    const block = text.substring(start, end);

    // Extract details from "Key    Value" format
    const details: Record<string, string> = {};
    const detailPatterns = [
      "Gamme",
      "Dimensions \\(LxH\\)",
      "Coloris acc",
      "Coloris",
      "Hauteur poign[ée]e",
      "Vitrage",
      "Poids",
      "Surface",
      "Ouverture",
      "Teinte Accessoires",
    ];

    for (const pattern of detailPatterns) {
      const re = new RegExp(pattern + "\\s{2,}(.+)", "i");
      const match = block.match(re);
      if (match) {
        const cleanKey = pattern
          .replace("\\(", "(")
          .replace("\\)", ")")
          .replace("[ée]", "é");
        details[cleanKey] = match[1].trim();
      }
    }

    // Extract prices - "E 5 542,15" or "€ 5 542,15"
    let prixUnitaire = 0;
    let quantite = 1;
    let totalHT = 0;

    const prixMatch = block.match(
      /Total unitaire ht[\s\S]*?[€E]\s*([\d][\d\s]*[,.][\d]+)/i
    );
    if (prixMatch) prixUnitaire = parseAmount(prixMatch[1]);

    const qtyMatch = block.match(
      /Total unitaire[\s\S]*?[x×]\s*(\d+)/i
    );
    if (qtyMatch) quantite = parseInt(qtyMatch[1]);

    const totalMatch = block.match(
      /Total ht[\s\S]*?[€E]\s*([\d][\d\s]*[,.][\d]+)/i
    );
    if (totalMatch) totalHT = parseAmount(totalMatch[1]);

    if (!totalHT && prixUnitaire) totalHT = prixUnitaire * quantite;

    positions.push({
      position: matches[mi].position,
      type: "",
      gamme: details["Gamme"] || "",
      dimensions: details["Dimensions (LxH)"] || "",
      coloris: details["Coloris"] || "",
      teinteAccessoires:
        details["Teinte Accessoires"] || details["Coloris acc"] || "",
      ouverture: details["Ouverture"] || "",
      hauteurPoignee: details["Hauteur poignée"] || "",
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
