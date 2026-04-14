import { SialPosition } from "./types";

/**
 * Strip RTF control codes and extract plain text with pipe separators.
 */
function stripRtf(rtf: string): string {
  let text = rtf;

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
        if (next === "~") {
          result += " ";
          i += 2;
          continue;
        }
        if (next === "-" || next === "_") {
          result += next === "_" ? "-" : "";
          i += 2;
          continue;
        }
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
 */
function extractTextFromBinaryDoc(data: string): string {
  const runs: string[] = [];
  let current = "";

  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
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
 * Extract images from RTF \\pict groups as base64 data URLs.
 */
function extractImagesFromRtf(rtf: string): string[] {
  const images: string[] = [];
  let i = 0;

  while (i < rtf.length) {
    const pictIdx = rtf.indexOf("\\pict", i);
    if (pictIdx === -1) break;

    let braceStart = pictIdx;
    for (let j = pictIdx - 1; j >= Math.max(0, pictIdx - 10); j--) {
      if (rtf[j] === "{") { braceStart = j; break; }
    }

    let depth = 0;
    let end = braceStart;
    for (let j = braceStart; j < rtf.length; j++) {
      if (rtf[j] === "{") depth++;
      else if (rtf[j] === "}") depth--;
      if (depth === 0) { end = j + 1; break; }
    }

    const group = rtf.substring(braceStart, end);
    let mimeType = "image/png";
    if (group.includes("jpegblip")) mimeType = "image/jpeg";

    const blipMatch = group.match(/(?:pngblip|jpegblip)\s*/);
    if (blipMatch) {
      const hexStart = group.indexOf(blipMatch[0]) + blipMatch[0].length;
      let hexPart = group.substring(hexStart);
      hexPart = hexPart.replace(/\\[a-z]+\d*\s*/g, "");
      hexPart = hexPart.replace(/[{}\s\r\n]/g, "");

      if (hexPart.length > 20) {
        try {
          const bytes = new Uint8Array(hexPart.length / 2);
          for (let b = 0; b < hexPart.length; b += 2) {
            bytes[b / 2] = parseInt(hexPart.substring(b, b + 2), 16);
          }
          let binary = "";
          for (let b = 0; b < bytes.length; b++) {
            binary += String.fromCharCode(bytes[b]);
          }
          images.push(`data:${mimeType};base64,${btoa(binary)}`);
        } catch { /* skip invalid */ }
      }
    }
    i = end;
  }
  return images;
}

function parseAmount(str: string): number {
  let cleaned = str
    .replace(/[€\u20AC]/g, "")
    .replace(/\u00A0/g, "")
    .trim();
  cleaned = cleaned.replace(/^E\s+/, "");
  cleaned = cleaned.replace(/(\d)\s+(\d)/g, "$1$2");
  cleaned = cleaned.replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// Known detail keys used in devis documents
const KNOWN_KEYS = [
  "Gamme",
  "Dimensions (LxH)",
  "Coloris acc",
  "Coloris",
  "Teinte Accessoires",
  "Hauteur poignée",
  "Ouverture",
  "Vitrage",
  "Poids",
  "Surface",
];

/**
 * Parse content from a SIAL or CASAPERTURA document.
 */
export function parseSialRtf(fileContent: string): SialPosition[] {
  const isRtf = fileContent.trimStart().startsWith("{\\rtf");
  const text = isRtf ? stripRtf(fileContent) : extractTextFromBinaryDoc(fileContent);

  const images = isRtf ? extractImagesFromRtf(fileContent) : [];
  const productImages = images.filter((img) => img.length > 15000);

  let positions: SialPosition[] = [];

  // Strategy 1: pipe-separated format (RTF output)
  const posRegex = /Position\s+(\d+)\|([^|\n]*)\|/g;
  const pipeMatches: { index: number; position: number; type: string }[] = [];
  let m;
  while ((m = posRegex.exec(text)) !== null) {
    pipeMatches.push({ index: m.index, position: parseInt(m[1]), type: m[2].trim() });
  }

  if (pipeMatches.length > 0) {
    positions = parsePipeSeparated(text, pipeMatches);
  } else {
    // Strategy 2: plain text (binary .doc extraction)
    // Position can be on its own line followed by the title on the next line
    // or "Position N    Title" on the same line
    positions = parseBinaryDocText(text);
  }

  // Assign product images to positions
  for (let i = 0; i < positions.length && i < productImages.length; i++) {
    positions[i].imageDataUrl = productImages[i];
  }

  return positions;
}

/**
 * Parse binary .doc extracted text where everything may be concatenated.
 */
function parseBinaryDocText(text: string): SialPosition[] {
  const positions: SialPosition[] = [];

  // Find all "Position N" occurrences
  const positionStarts: { index: number; position: number }[] = [];
  const posRegex = /Position\s+(\d+)/g;
  let m;
  while ((m = posRegex.exec(text)) !== null) {
    positionStarts.push({ index: m.index, position: parseInt(m[1]) });
  }

  if (positionStarts.length === 0) return positions;

  // Find "Total ht" after all positions to delimit the last block
  const lastPos = positionStarts[positionStarts.length - 1];
  const totalHtIdx = text.indexOf("Total ht", lastPos.index + 100);

  for (let pi = 0; pi < positionStarts.length; pi++) {
    const start = positionStarts[pi].index;
    const end = pi + 1 < positionStarts.length
      ? positionStarts[pi + 1].index
      : (totalHtIdx > start ? totalHtIdx + 200 : start + 5000);
    const block = text.substring(start, end);

    // Extract title: text after "Position N" on same or next line
    let title = "";
    const titleMatch = block.match(/Position\s+\d+\s*\n?([^\n]+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
      // Remove pipe characters and clean up
      title = title.replace(/\|/g, "").trim();
    }

    // Extract key-value details using known keys
    const details: Record<string, string> = {};

    // Build a regex that matches known keys and captures everything up to the next key or "Options" or "Total"
    const keysPattern = KNOWN_KEYS.map(k =>
      k.replace(/[()]/g, "\\$&").replace(/é/g, "[ée]")
    ).join("|");
    const kvRegex = new RegExp(
      `(${keysPattern})\\s*(?:\\||\\n)?\\s*([^|]*?)\\s*(?=${keysPattern}|Options|Total|$)`,
      "gi"
    );

    let km;
    while ((km = kvRegex.exec(block)) !== null) {
      const key = km[1].trim();
      let val = km[2].trim();
      // Clean up value - remove trailing pipes and empty lines
      val = val.replace(/\|/g, "").replace(/\n/g, " ").trim();
      if (val && val.length > 0 && val.length < 200) {
        // Normalize key name
        let normalizedKey = key;
        if (/hauteur poign/i.test(key)) normalizedKey = "Hauteur poignée";
        if (/coloris acc/i.test(key)) normalizedKey = "Coloris acc";
        details[normalizedKey] = val;
      }
    }

    // Extract options: everything between "Options" and "Total unitaire"
    const options: string[] = [];
    const optionsMatch = block.match(/Options\s*([\s\S]*?)(?=Total unitaire|Total ht|$)/i);
    if (optionsMatch) {
      let optText = optionsMatch[1].trim();
      // Clean up and split into individual option lines
      optText = optText.replace(/\|/g, "").trim();
      // Split by known option patterns (lines starting with a capital letter or containing " - ")
      const optLines = optText.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);
      if (optLines.length > 0) {
        // If all on one line (concatenated), try to split by known patterns
        if (optLines.length === 1 && optLines[0].length > 50) {
          // Split concatenated options: look for known option prefixes
          const optionPrefixes = [
            "Etanchéité", "Étanchéité", "Gamme ", "Grille VMC",
            "Habillage Ext", "Habillage Int", "Isolation",
            "Passage Volet", "Plus Value", "Poignée", "Point De",
            "Type de pose", "Type de traverse", "Typologie",
            "Vantail", "Dormant", "Ouvrant",
          ];
          const prefixRegex = new RegExp(
            `(${optionPrefixes.map(p => p.replace(/[éÉ]/g, "[éeÉE]")).join("|")})`,
            "g"
          );
          const parts: string[] = [];
          let lastIdx = 0;
          let om;
          while ((om = prefixRegex.exec(optLines[0])) !== null) {
            if (om.index > lastIdx) {
              const prev = optLines[0].substring(lastIdx, om.index).trim();
              if (prev) parts.push(prev);
            }
            lastIdx = om.index;
          }
          if (lastIdx < optLines[0].length) {
            parts.push(optLines[0].substring(lastIdx).trim());
          }
          options.push(...parts.filter(p => p.length > 3));
        } else {
          options.push(...optLines);
        }
      }
    }

    // Extract prices
    let prixUnitaire = 0;
    let quantite = 1;
    let totalHT = 0;

    const prixMatch = block.match(
      /Total unitaire[\s\S]*?[€\u20ACE¬]\s*([\d][\d\s ]*[,.][\d]+)/i
    );
    if (prixMatch) prixUnitaire = parseAmount(prixMatch[1]);

    const qtyMatch = block.match(/[x×]\s*(\d+)/);
    if (qtyMatch) quantite = parseInt(qtyMatch[1]);

    const totalMatch = block.match(
      /Total ht[\s\S]*?[€\u20ACE¬]\s*([\d][\d\s ]*[,.][\d]+)/i
    );
    if (totalMatch) totalHT = parseAmount(totalMatch[1]);

    if (!totalHT && prixUnitaire) totalHT = prixUnitaire * quantite;

    positions.push({
      position: positionStarts[pi].position,
      type: "",
      gamme: details["Gamme"] || "",
      dimensions: details["Dimensions (LxH)"] || "",
      coloris: details["Coloris"] || "",
      teinteAccessoires: details["Teinte Accessoires"] || details["Coloris acc"] || "",
      ouverture: details["Ouverture"] || "",
      hauteurPoignee: details["Hauteur poignée"] || "",
      vitrage: details["Vitrage"] || "",
      poids: details["Poids"] || "",
      surface: details["Surface"] || "",
      prixUnitaireHT: prixUnitaire,
      quantite: quantite,
      totalHT: totalHT,
      options: options,
    });
  }

  return positions;
}

function parsePipeSeparated(
  text: string,
  matches: { index: number; position: number; type: string }[]
): SialPosition[] {
  const positions: SialPosition[] = [];

  for (let mi = 0; mi < matches.length; mi++) {
    const start = matches[mi].index;
    const end = mi + 1 < matches.length
      ? matches[mi + 1].index
      : text.indexOf("Total ht|", start + 50);
    const block = text.substring(start, end > start ? end : start + 2000);

    // Extract key-value pairs from pipe-separated data
    const details: Record<string, string> = {};
    const detailRegex = /\|([^|]+)\|([^|]+)/g;
    let dm;
    const blockForDetails = block.replace(/Position\s+\d+\|[^|]*\|[^|]*\|/, "");

    while ((dm = detailRegex.exec(blockForDetails)) !== null) {
      const key = dm[1].trim();
      const val = dm[2].trim();
      if (
        key && val &&
        !key.match(/^(Total|Qté|x\s|\d|€|E\s)/) &&
        !val.match(/^(Total|Qté)/) &&
        key !== "||" && val !== "||"
      ) {
        details[key] = val;
      }
    }

    // Extract options from pipe-separated format
    const options: string[] = [];
    const optIdx = block.indexOf("Options");
    if (optIdx >= 0) {
      const optBlock = block.substring(optIdx + 7);
      const optEnd = optBlock.search(/Total unitaire/i);
      const optText = optEnd > 0 ? optBlock.substring(0, optEnd) : optBlock;
      const optLines = optText.split(/[|\n]/).map(l => l.trim()).filter(l => l.length > 3);
      options.push(...optLines);
    }

    // Extract prices
    let prixUnitaire = 0;
    let quantite = 1;
    let totalHT = 0;

    const prixMatch = block.match(
      /Total unitaire ht[\s\n|]*[€\u20ACE]?\s*([\d][\d\s]*[,.][\d]+)/i
    );
    if (prixMatch) prixUnitaire = parseAmount(prixMatch[1]);

    const priceSection = block.substring(block.search(/Total unitaire/i) || 0);
    const qtyMatch = priceSection.match(/[x×]\s*(\d+)/);
    if (qtyMatch) quantite = parseInt(qtyMatch[1]);

    const totalMatch = block.match(
      /Total ht[\s\n|]*[€\u20ACE]?\s*([\d][\d\s]*[,.][\d]+)/i
    );
    if (totalMatch) totalHT = parseAmount(totalMatch[1]);

    if (!totalHT && prixUnitaire) totalHT = prixUnitaire * quantite;

    positions.push({
      position: matches[mi].position,
      type: matches[mi].type,
      gamme: details["Gamme"] || "",
      dimensions: details["Dimensions (LxH)"] || details["Dimensions"] || "",
      coloris: details["Coloris"] || "",
      teinteAccessoires: details["Teinte Accessoires"] || details["Coloris acc"] || "",
      ouverture: details["Ouverture"] || "",
      hauteurPoignee:
        details["Hauteur poignée"] || details["Hauteur poignee"] || "",
      vitrage: details["Vitrage"] || "",
      poids: details["Poids"] || "",
      surface: details["Surface"] || "",
      prixUnitaireHT: prixUnitaire,
      quantite: quantite,
      totalHT: totalHT,
      options: options,
    });
  }

  return positions;
}
