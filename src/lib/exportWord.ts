import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageBreak,
  TableLayoutType,
  PageNumber,
  Footer,
} from "docx";
import { DevisConfig, DevisLine, ExtraLine } from "./types";
import { CGV_CASAPERTURA } from "./cgv";

function fmt(n: number): string {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0 };
  return { top: none, bottom: none, left: none, right: none };
}

function thinBorders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
  return { top: b, bottom: b, left: b, right: b };
}

function headerCell(text: string, width?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18, font: "Calibri" })],
        alignment: AlignmentType.LEFT,
      }),
    ],
    borders: thinBorders(),
    shading: { fill: "2B4C7E", color: "FFFFFF" },
    width: width ? { size: width, type: WidthType.DXA } : undefined,
  });
}

function textCell(text: string, width?: number, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18, font: "Calibri", bold })],
      }),
    ],
    borders: thinBorders(),
    width: width ? { size: width, type: WidthType.DXA } : undefined,
  });
}

function rightCell(text: string, width?: number, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18, font: "Calibri", bold })],
        alignment: AlignmentType.RIGHT,
      }),
    ],
    borders: thinBorders(),
    width: width ? { size: width, type: WidthType.DXA } : undefined,
  });
}

function buildPositionRows(line: DevisLine, index: number): TableRow[] {
  const rows: TableRow[] = [];

  // Position header row
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Position ${index + 1}`,
                  bold: true,
                  size: 20,
                  font: "Calibri",
                  color: "FFFFFF",
                }),
              ],
            }),
          ],
          borders: thinBorders(),
          shading: { fill: "2B4C7E" },
          columnSpan: 2,
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: line.designation,
                  bold: true,
                  size: 20,
                  font: "Calibri",
                  color: "FFFFFF",
                }),
              ],
            }),
          ],
          borders: thinBorders(),
          shading: { fill: "2B4C7E" },
          columnSpan: 4,
        }),
      ],
    })
  );

  // Detail rows
  const details = line.details;
  const detailKeys = Object.keys(details);
  for (const key of detailKeys) {
    if (details[key]) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [] })],
              borders: thinBorders(),
              columnSpan: 2,
            }),
            textCell(key, undefined, true),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: details[key], size: 18, font: "Calibri" }),
                  ],
                }),
              ],
              borders: thinBorders(),
              columnSpan: 3,
            }),
          ],
        })
      );
    }
  }

  // Total row
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [] })],
          borders: thinBorders(),
          columnSpan: 2,
        }),
        rightCell(`Total unitaire ht`),
        rightCell(`\u20AC ${fmt(line.prixVenteUnitaireHT)}`),
        textCell(`x ${line.quantite}`),
        rightCell(`\u20AC ${fmt(line.totalVenteHT)}`, undefined, true),
      ],
    })
  );

  return rows;
}

function buildExtraLineRow(line: ExtraLine, startIndex: number, i: number): TableRow[] {
  return [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Position ${startIndex + i + 1}`,
                  bold: true,
                  size: 20,
                  font: "Calibri",
                  color: "FFFFFF",
                }),
              ],
            }),
          ],
          borders: thinBorders(),
          shading: { fill: "2B4C7E" },
          columnSpan: 2,
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: line.designation,
                  bold: true,
                  size: 20,
                  font: "Calibri",
                  color: "FFFFFF",
                }),
              ],
            }),
          ],
          borders: thinBorders(),
          shading: { fill: "2B4C7E" },
          columnSpan: 4,
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [] })],
          borders: thinBorders(),
          columnSpan: 2,
        }),
        rightCell("Total unitaire ht"),
        rightCell(`\u20AC ${fmt(line.prixUnitaireHT)}`),
        textCell(`x ${line.quantite}`),
        rightCell(`\u20AC ${fmt(line.totalHT)}`, undefined, true),
      ],
    }),
  ];
}

export async function generateWord(config: DevisConfig): Promise<Blob> {
  const totalHT =
    config.lines.reduce((s, l) => s + l.totalVenteHT, 0) +
    config.extraLines.reduce((s, l) => s + l.totalHT, 0);
  const totalAvecEco = totalHT + config.ecoParticipation;
  const tva = totalAvecEco * (config.tvaRate / 100);
  const totalTTC = totalAvecEco + tva;

  // Build position rows
  const positionRows: TableRow[] = [];
  config.lines.forEach((line, i) => {
    positionRows.push(...buildPositionRows(line, i));
  });
  const startExtra = config.lines.length;
  config.extraLines.forEach((line, i) => {
    positionRows.push(...buildExtraLineRow(line, startExtra, i));
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", size: 16, font: "Calibri", color: "666666" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Calibri", color: "666666" }),
                  new TextRun({ text: " / ", size: 16, font: "Calibri", color: "666666" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: "Calibri", color: "666666" }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Header
          new Table({
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "CASAPERTURA", bold: true, size: 28, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "SAS au capital de 5000\u20AC", size: 16, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "RCS BASTIA", size: 16, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "102 929 759 R.C.S. Bastia", size: 16, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "20218 LAMA", size: 16, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "06.22.58.52.60", size: 16, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "laurent@casapertura.fr", size: 16, font: "Calibri" }),
                        ],
                      }),
                    ],
                    borders: noBorders(),
                    width: { size: 5000, type: WidthType.DXA },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Membre du groupe SIAL", size: 16, font: "Calibri", italics: true }),
                        ],
                        alignment: AlignmentType.RIGHT,
                      }),
                    ],
                    borders: noBorders(),
                    width: { size: 5000, type: WidthType.DXA },
                  }),
                ],
              }),
            ],
            width: { size: 10000, type: WidthType.DXA },
          }),

          new Paragraph({ children: [] }),

          // Client info
          new Table({
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  headerCell("A", 1000),
                  textCell(`${config.client.nom}`, 9000),
                ],
              }),
              new TableRow({
                children: [
                  textCell(""),
                  textCell(
                    `${config.client.adresse ? config.client.adresse + " " : ""}${config.client.codePostal} ${config.client.ville}`
                  ),
                ],
              }),
            ],
            width: { size: 10000, type: WidthType.DXA },
          }),

          new Paragraph({ children: [] }),

          // Devis info
          new Table({
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  headerCell("Devis", 1500),
                  textCell(config.reference, 8500),
                ],
              }),
              new TableRow({
                children: [
                  headerCell("Date"),
                  textCell(config.date),
                ],
              }),
              new TableRow({
                children: [
                  headerCell("Concepteur"),
                  textCell(config.concepteur),
                ],
              }),
            ],
            width: { size: 10000, type: WidthType.DXA },
          }),

          new Paragraph({ children: [] }),
          new Paragraph({
            children: [
              new TextRun({ text: "Madame, Monsieur,", size: 20, font: "Calibri" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Suite à votre demande, nous avons le plaisir de vous communiquer notre meilleure offre de prix pour la fourniture et pose de châssis Aluminium.",
                size: 20,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({ children: [] }),

          // Positions table
          new Table({
            layout: TableLayoutType.FIXED,
            rows: positionRows,
            width: { size: 10000, type: WidthType.DXA },
          }),

          new Paragraph({ children: [] }),

          // Totals table
          new Table({
            layout: TableLayoutType.FIXED,
            rows: [
              new TableRow({
                children: [
                  headerCell("Total ht"),
                  rightCell(fmt(totalHT), undefined, true),
                ],
              }),
              new TableRow({
                children: [
                  textCell("Eco-participation"),
                  rightCell(fmt(config.ecoParticipation)),
                ],
              }),
              new TableRow({
                children: [new Paragraph({ children: [] }), new Paragraph({ children: [] })].map(
                  (p) => new TableCell({ children: [p], borders: thinBorders() })
                ),
              }),
              new TableRow({
                children: [
                  headerCell("Montant HT"),
                  rightCell(`\u20AC ${fmt(totalAvecEco)}`, undefined, true),
                ],
              }),
              new TableRow({
                children: [
                  textCell(`TVA ${config.tvaRate} %`),
                  rightCell(`\u20AC ${fmt(tva)}`),
                ],
              }),
              new TableRow({
                children: [
                  headerCell("TOTAL"),
                  rightCell(`\u20AC ${fmt(totalTTC)}`, undefined, true),
                ],
              }),
            ],
            width: { size: 5000, type: WidthType.DXA },
          }),

          new Paragraph({ children: [] }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Conditions de règlement :",
                bold: true,
                size: 18,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Virement 40 % à la commande",
                size: 18,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Solde quand matériel prêt à livrer",
                size: 18,
                font: "Calibri",
              }),
            ],
          }),

          new Paragraph({ children: [] }),
          new Paragraph({
            children: [
              new TextRun({ text: "Crédit Agricole", size: 18, font: "Calibri" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "RIB 12006 00081 82110574530 59",
                size: 18,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "IBAN FR76 1200 6000 8182 1105 7453 059",
                size: 18,
                font: "Calibri",
              }),
            ],
          }),

          // CGV on new page
          new Paragraph({
            children: [new PageBreak()],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Conditions Générales de Vente",
                bold: true,
                size: 24,
                font: "Calibri",
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [] }),
          ...CGV_CASAPERTURA.split("\n")
            .filter((l) => l.trim())
            .slice(1) // Skip the title line
            .map((line) => {
              const isHeader = /^\d+\./.test(line.trim());
              return new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 14,
                    font: "Calibri",
                    bold: isHeader,
                  }),
                ],
                spacing: { after: isHeader ? 60 : 40, before: isHeader ? 120 : 0 },
              });
            }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
