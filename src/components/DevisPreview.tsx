"use client";

import { DevisConfig } from "@/lib/types";
import { CGV_CASAPERTURA } from "@/lib/cgv";

interface DevisPreviewProps {
  config: DevisConfig;
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DevisPreview({ config }: DevisPreviewProps) {
  const totalLinesHT = config.lines.reduce((s, l) => s + l.totalVenteHT, 0);
  const totalExtraHT = config.extraLines.reduce((s, l) => s + l.totalHT, 0);
  const totalHT = totalLinesHT + totalExtraHT;
  const totalAvecEco = totalHT + config.ecoParticipation;
  const tva = totalAvecEco * (config.tvaRate / 100);
  const totalTTC = totalAvecEco + tva;

  let posCounter = 0;

  // Parse CGV into paragraphs
  const cgvParagraphs = CGV_CASAPERTURA.split("\n").filter((l) => l.trim());

  return (
    <div
      id="devis-preview"
      className="bg-white shadow-lg p-8 text-sm"
      style={{
        fontFamily: "Calibri, Arial, sans-serif",
        maxWidth: "210mm",
        margin: "0 auto",
        color: "#222",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B4C7E]">CASAPERTURA</h1>
          <p className="text-xs text-gray-600">SAS au capital de 5000&euro;</p>
          <p className="text-xs text-gray-600">RCS BASTIA</p>
          <p className="text-xs text-gray-600">
            102 929 759 R.C.S. Bastia
          </p>
          <p className="text-xs text-gray-600">20218 LAMA</p>
          <p className="text-xs text-gray-600">06.22.58.52.60</p>
          <p className="text-xs text-gray-600">laurent@casapertura.fr</p>
        </div>
        <div className="text-right text-xs text-gray-500 italic">
          Membre du groupe SIAL
        </div>
      </div>

      {/* Client */}
      <table className="w-full mb-4 border-collapse">
        <tbody>
          <tr>
            <td className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 w-12 border border-gray-300 text-xs">
              A
            </td>
            <td className="px-3 py-1.5 border border-gray-300 font-semibold text-xs">
              {config.client.nom || "\u2014"}
            </td>
          </tr>
          <tr>
            <td className="px-3 py-1 border border-gray-300"></td>
            <td className="px-3 py-1 border border-gray-300 text-xs">
              {config.client.adresse && `${config.client.adresse}, `}
              {config.client.codePostal} {config.client.ville}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Devis info */}
      <table className="w-full mb-4 border-collapse max-w-lg">
        <tbody>
          <tr>
            <td className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs w-28">
              Devis
            </td>
            <td className="px-3 py-1.5 border border-gray-300 text-xs">
              {config.reference}
            </td>
          </tr>
          <tr>
            <td className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs">
              Date
            </td>
            <td className="px-3 py-1.5 border border-gray-300 text-xs">
              {config.date
                ? new Date(config.date).toLocaleDateString("fr-FR")
                : ""}
            </td>
          </tr>
          <tr>
            <td className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs">
              Concepteur
            </td>
            <td className="px-3 py-1.5 border border-gray-300 text-xs">
              {config.concepteur}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Intro */}
      <p className="mb-4 text-xs">
        Madame, Monsieur,
        <br />
        Suite à votre demande, nous avons le plaisir de vous communiquer notre
        meilleure offre de prix pour la fourniture et pose de châssis
        Aluminium.
      </p>

      {/* Positions */}
      <table className="w-full border-collapse mb-4">
        <tbody>
          {config.lines.map((line) => {
            posCounter++;
            const details = Object.entries(line.details).filter(
              ([, v]) => v
            );
            return (
              <tbody key={line.id}>
                {/* Position header */}
                <tr>
                  <td
                    colSpan={2}
                    className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs"
                  >
                    Position {posCounter}
                  </td>
                  <td
                    colSpan={4}
                    className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs"
                  >
                    {line.designation}
                  </td>
                </tr>
                {/* Image + Details row */}
                <tr>
                  {/* Product image - only if available */}
                  {line.imageDataUrl && (
                    <td
                      className="border border-gray-200 px-2 py-2 align-top"
                      style={{ width: "130px" }}
                      rowSpan={1}
                    >
                      <img
                        src={line.imageDataUrl}
                        alt={`Position ${posCounter}`}
                        style={{
                          maxWidth: "120px",
                          maxHeight: "150px",
                          objectFit: "contain",
                        }}
                      />
                    </td>
                  )}
                  {/* Details */}
                  <td
                    colSpan={line.imageDataUrl ? 5 : 6}
                    className="border border-gray-200 px-3 py-1 align-top"
                  >
                    <table className="w-full">
                      <tbody>
                        {details.map(([key, val]) => (
                          <tr key={key}>
                            <td className="py-0.5 text-xs font-semibold text-gray-600 w-40">
                              {key}
                            </td>
                            <td className="py-0.5 text-xs">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Options */}
                    {line.options && line.options.length > 0 && (
                      <div className="mt-2 border-t border-gray-200 pt-1">
                        <p className="text-xs font-semibold text-gray-600 italic">Options</p>
                        {line.options.map((opt, oi) => (
                          <p key={oi} className="text-xs text-gray-600 italic">{opt}</p>
                        ))}
                      </div>
                    )}
                    {/* Description */}
                    {line.description && (
                      <p className="text-xs text-gray-500 mt-1 italic">{line.description}</p>
                    )}
                  </td>
                </tr>
                {/* Total row */}
                <tr className="bg-gray-50">
                  <td
                    colSpan={2}
                    className="border border-gray-200 px-3 py-1"
                  ></td>
                  <td className="border border-gray-200 px-3 py-1 text-xs text-right">
                    Total unitaire ht
                  </td>
                  <td className="border border-gray-200 px-3 py-1 text-xs text-right font-semibold">
                    &euro; {fmt(line.prixVenteUnitaireHT)}
                  </td>
                  <td className="border border-gray-200 px-3 py-1 text-xs text-center">
                    x {line.quantite}
                  </td>
                  <td className="border border-gray-200 px-3 py-1 text-xs text-right font-bold">
                    &euro; {fmt(line.totalVenteHT)}
                  </td>
                </tr>
              </tbody>
            );
          })}

          {/* Extra lines */}
          {config.extraLines.map((line) => {
            posCounter++;
            return (
              <tbody key={line.id}>
                <tr>
                  <td
                    colSpan={2}
                    className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs"
                  >
                    Position {posCounter}
                  </td>
                  <td
                    colSpan={4}
                    className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs"
                  >
                    {line.designation}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td
                    colSpan={2}
                    className="border border-gray-200 px-3 py-1"
                  ></td>
                  <td className="border border-gray-200 px-3 py-1 text-xs text-right">
                    Total unitaire ht
                  </td>
                  <td className="border border-gray-200 px-3 py-1 text-xs text-right font-semibold">
                    &euro; {fmt(line.prixUnitaireHT)}
                  </td>
                  <td className="border border-gray-200 px-3 py-1 text-xs text-center">
                    x {line.quantite}
                  </td>
                  <td className="border border-gray-200 px-3 py-1 text-xs text-right font-bold">
                    &euro; {fmt(line.totalHT)}
                  </td>
                </tr>
              </tbody>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <table
        className="border-collapse mb-4 ml-auto"
        style={{ width: "280px" }}
      >
        <tbody>
          <tr>
            <td className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs">
              Total HT
            </td>
            <td className="px-3 py-1.5 border border-gray-300 text-xs text-right font-bold">
              {fmt(totalHT)}
            </td>
          </tr>
          <tr>
            <td className="px-3 py-1 border border-gray-300 text-xs">
              Eco-participation
            </td>
            <td className="px-3 py-1 border border-gray-300 text-xs text-right">
              {fmt(config.ecoParticipation)}
            </td>
          </tr>
          <tr>
            <td
              className="px-3 py-0.5 border border-gray-200"
              colSpan={2}
            ></td>
          </tr>
          <tr>
            <td className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs">
              Montant HT
            </td>
            <td className="px-3 py-1.5 border border-gray-300 text-xs text-right font-bold">
              &euro; {fmt(totalAvecEco)}
            </td>
          </tr>
          <tr>
            <td className="px-3 py-1 border border-gray-300 text-xs">
              TVA {config.tvaRate} %
            </td>
            <td className="px-3 py-1 border border-gray-300 text-xs text-right">
              &euro; {fmt(tva)}
            </td>
          </tr>
          <tr>
            <td className="bg-[#2B4C7E] text-white font-bold px-3 py-1.5 border border-gray-300 text-xs">
              TOTAL
            </td>
            <td className="px-3 py-1.5 border border-gray-300 text-xs text-right font-bold text-lg">
              &euro; {fmt(totalTTC)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="text-xs text-gray-600 mt-6">
        <p className="font-semibold mb-1">Conditions de règlement :</p>
        <p>Virement 40 % à la commande</p>
        <p>Solde quand matériel prêt à livrer</p>
        <div className="mt-3">
          <p>Crédit Agricole</p>
          <p>RIB 12006 00081 82110574530 59</p>
          <p>IBAN FR76 1200 6000 8182 1105 7453 059</p>
        </div>
      </div>

      {/* CGV */}
      <div
        className="mt-8 pt-6 border-t-2 border-gray-300"
        style={{ pageBreakBefore: "always" }}
      >
        <h2 className="text-center font-bold text-base mb-4 text-[#2B4C7E]">
          Conditions Générales de Vente
        </h2>
        <div className="text-xs text-gray-700 leading-relaxed space-y-1">
          {cgvParagraphs.slice(1).map((p, i) => {
            // Detect section headers (start with number)
            const isHeader = /^\d+\./.test(p.trim());
            return (
              <p
                key={i}
                className={isHeader ? "font-bold mt-3" : ""}
              >
                {p}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
