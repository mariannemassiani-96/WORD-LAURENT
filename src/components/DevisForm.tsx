"use client";

import { DevisConfig, DevisLine, ExtraLine } from "@/lib/types";

interface DevisFormProps {
  config: DevisConfig;
  onChange: (config: DevisConfig) => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function DevisForm({ config, onChange }: DevisFormProps) {
  function updateClient(field: string, value: string) {
    onChange({
      ...config,
      client: { ...config.client, [field]: value },
    });
  }

  function updateLine(index: number, updates: Partial<DevisLine>) {
    const newLines = [...config.lines];
    const line = { ...newLines[index], ...updates };

    // Recalculate prices when margin changes
    if ("margePercent" in updates || "prixUnitaireHT" in updates || "quantite" in updates) {
      line.prixVenteUnitaireHT =
        line.prixUnitaireHT * (1 + line.margePercent / 100);
      line.totalVenteHT = line.prixVenteUnitaireHT * line.quantite;
    }

    newLines[index] = line;
    onChange({ ...config, lines: newLines });
  }

  function updateExtraLine(index: number, updates: Partial<ExtraLine>) {
    const newLines = [...config.extraLines];
    const line = { ...newLines[index], ...updates };
    // Recalculate: prix vente = cout achat * (1 + marge%)
    line.prixUnitaireHT = line.coutAchatHT * (1 + line.margePercent / 100);
    line.totalHT = line.prixUnitaireHT * line.quantite;
    newLines[index] = line;
    onChange({ ...config, extraLines: newLines });
  }

  function addExtraLine() {
    onChange({
      ...config,
      extraLines: [
        ...config.extraLines,
        {
          id: generateId(),
          designation: "",
          coutAchatHT: 0,
          margePercent: 30,
          prixUnitaireHT: 0,
          quantite: 1,
          totalHT: 0,
        },
      ],
    });
  }

  function removeExtraLine(index: number) {
    const newLines = config.extraLines.filter((_, i) => i !== index);
    onChange({ ...config, extraLines: newLines });
  }

  function removeSialLine(index: number) {
    const newLines = config.lines.filter((_, i) => i !== index);
    onChange({ ...config, lines: newLines });
  }

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-6">
      {/* Devis Info */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-bold text-lg text-gray-800 mb-3">
          Informations du devis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Référence
            </label>
            <input
              type="text"
              value={config.reference}
              onChange={(e) =>
                onChange({ ...config, reference: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Date
            </label>
            <input
              type="date"
              value={config.date}
              onChange={(e) => onChange({ ...config, date: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Concepteur
            </label>
            <input
              type="text"
              value={config.concepteur}
              onChange={(e) =>
                onChange({ ...config, concepteur: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-bold text-lg text-gray-800 mb-3">
          Informations client
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600">
              Nom
            </label>
            <input
              type="text"
              value={config.client.nom}
              onChange={(e) => updateClient("nom", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800"
              placeholder="Nom du client"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600">
              Adresse
            </label>
            <input
              type="text"
              value={config.client.adresse}
              onChange={(e) => updateClient("adresse", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800"
              placeholder="Adresse"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Code postal
            </label>
            <input
              type="text"
              value={config.client.codePostal}
              onChange={(e) => updateClient("codePostal", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800"
              placeholder="20000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Ville
            </label>
            <input
              type="text"
              value={config.client.ville}
              onChange={(e) => updateClient("ville", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800"
              placeholder="Ville"
            />
          </div>
        </div>
      </div>

      {/* SIAL Lines with Margin */}
      {config.lines.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-bold text-lg text-gray-800 mb-3">
            Lignes SIAL (avec marge)
          </h3>
          <div className="space-y-4">
            {config.lines.map((line, i) => (
              <div
                key={line.id}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="inline-block bg-blue-800 text-white text-xs font-bold px-2 py-1 rounded mr-2">
                      Ligne {i + 1}
                    </span>
                    <span className="font-semibold text-gray-700">
                      {line.designation}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSialLine(i)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Supprimer
                  </button>
                </div>

                {/* Editable designation and description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Désignation
                    </label>
                    <input
                      type="text"
                      value={line.designation}
                      onChange={(e) =>
                        updateLine(i, { designation: e.target.value })
                      }
                      className="w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Description (optionnelle)
                    </label>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) =>
                        updateLine(i, { description: e.target.value })
                      }
                      className="w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                      placeholder="Description supplémentaire..."
                    />
                  </div>
                </div>

                {/* Details */}
                {Object.keys(line.details).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mb-2 text-xs">
                    {Object.entries(line.details).map(([k, v]) =>
                      v ? (
                        <div key={k}>
                          <span className="font-medium text-gray-500">
                            {k}:
                          </span>{" "}
                          <span className="text-gray-700">{v}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {/* Options - editable */}
                <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-blue-700">Options :</p>
                    <button
                      onClick={() => {
                        const opts = [...(line.options || []), ""];
                        updateLine(i, { options: opts });
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      + Ajouter
                    </button>
                  </div>
                  {(line.options || []).length === 0 && (
                    <p className="text-xs text-blue-400 italic">Aucune option</p>
                  )}
                  <div className="space-y-1">
                    {(line.options || []).map((opt, oi) => (
                      <div key={oi} className="flex gap-1">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const opts = [...(line.options || [])];
                            opts[oi] = e.target.value;
                            updateLine(i, { options: opts });
                          }}
                          className="flex-1 border border-blue-200 rounded px-2 py-1 text-xs text-blue-800 bg-white"
                        />
                        <button
                          onClick={() => {
                            const opts = (line.options || []).filter(
                              (_, idx) => idx !== oi
                            );
                            updateLine(i, { options: opts });
                          }}
                          className="text-red-400 hover:text-red-600 text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Prix achat HT
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.prixUnitaireHT}
                      onChange={(e) =>
                        updateLine(i, {
                          prixUnitaireHT: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Quantité
                    </label>
                    <input
                      type="number"
                      value={line.quantite}
                      onChange={(e) =>
                        updateLine(i, {
                          quantite: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-orange-600 font-bold">
                      Marge %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={line.margePercent}
                      onChange={(e) =>
                        updateLine(i, {
                          margePercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full border-2 border-orange-300 rounded px-2 py-1.5 text-sm font-bold text-orange-700 bg-orange-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Prix vente unitaire
                    </label>
                    <div className="px-2 py-1.5 text-sm font-semibold text-green-700 bg-green-50 rounded border border-green-200">
                      {fmt(line.prixVenteUnitaireHT)} &euro;
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Total vente HT
                    </label>
                    <div className="px-2 py-1.5 text-sm font-bold text-green-800 bg-green-100 rounded border border-green-300">
                      {fmt(line.totalVenteHT)} &euro;
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extra lines */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg text-gray-800">
            Lignes supplémentaires (pose, dépose, etc.)
          </h3>
          <button
            onClick={addExtraLine}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition"
          >
            + Ajouter une ligne
          </button>
        </div>
        {config.extraLines.length === 0 && (
          <p className="text-gray-400 text-sm">Aucune ligne supplémentaire</p>
        )}
        <div className="space-y-3">
          {config.extraLines.map((line, i) => (
            <div
              key={line.id}
              className="border rounded-lg p-3 bg-gray-50 space-y-2"
            >
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={line.designation}
                  onChange={(e) =>
                    updateExtraLine(i, { designation: e.target.value })
                  }
                  className="flex-1 border rounded px-2 py-1.5 text-sm text-gray-800 font-semibold"
                  placeholder="Ex: Pose de la menuiserie"
                />
                <button
                  onClick={() => removeExtraLine(i)}
                  className="text-red-500 hover:text-red-700 ml-2 text-sm"
                >
                  Supprimer
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Coût achat HT
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.coutAchatHT}
                    onChange={(e) =>
                      updateExtraLine(i, {
                        coutAchatHT: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-orange-600 font-bold">
                    Marge %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={line.margePercent}
                    onChange={(e) =>
                      updateExtraLine(i, {
                        margePercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border-2 border-orange-300 rounded px-2 py-1.5 text-sm font-bold text-orange-700 bg-orange-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Prix vente HT
                  </label>
                  <div className="px-2 py-1.5 text-sm font-semibold text-green-700 bg-green-50 rounded border border-green-200">
                    {fmt(line.prixUnitaireHT)} &euro;
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Quantité
                  </label>
                  <input
                    type="number"
                    value={line.quantite}
                    onChange={(e) =>
                      updateExtraLine(i, {
                        quantite: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Total vente HT
                  </label>
                  <div className="px-2 py-1.5 text-sm font-bold text-green-800 bg-green-100 rounded border border-green-300">
                    {fmt(line.totalHT)} &euro;
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TVA & Eco */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-bold text-lg text-gray-800 mb-3">TVA & Eco-participation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Taux TVA (%)
            </label>
            <select
              value={config.tvaRate}
              onChange={(e) =>
                onChange({ ...config, tvaRate: parseFloat(e.target.value) })
              }
              className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800"
            >
              <option value={20}>20%</option>
              <option value={10}>10%</option>
              <option value={5.5}>5.5%</option>
              <option value={0}>0%</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Eco-participation (&euro;)
            </label>
            <input
              type="number"
              step="0.01"
              value={config.ecoParticipation}
              onChange={(e) =>
                onChange({
                  ...config,
                  ecoParticipation: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full border rounded-lg px-3 py-2 mt-1 text-gray-800"
            />
          </div>
        </div>
      </div>
      {/* Résumé coûts / marges */}
      {(config.lines.length > 0 || config.extraLines.length > 0) && (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-bold text-lg text-gray-800 mb-3">
            Récapitulatif coûts / marges
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-3 py-2 text-xs font-semibold text-gray-600">Ligne</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">Coût achat HT</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">Marge %</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">Prix vente HT</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">Marge &euro;</th>
              </tr>
            </thead>
            <tbody>
              {config.lines.map((line, i) => {
                const coutTotal = line.prixUnitaireHT * line.quantite;
                const venteTotal = line.totalVenteHT;
                const margeEuros = venteTotal - coutTotal;
                return (
                  <tr key={line.id} className="border-b">
                    <td className="px-3 py-1.5 text-xs">Pos. {i + 1} - {line.designation}</td>
                    <td className="px-3 py-1.5 text-xs text-right">{fmt(coutTotal)} &euro;</td>
                    <td className="px-3 py-1.5 text-xs text-right text-orange-600 font-semibold">{line.margePercent}%</td>
                    <td className="px-3 py-1.5 text-xs text-right">{fmt(venteTotal)} &euro;</td>
                    <td className="px-3 py-1.5 text-xs text-right font-semibold text-green-700">{fmt(margeEuros)} &euro;</td>
                  </tr>
                );
              })}
              {config.extraLines.map((line, i) => {
                const coutTotal = line.coutAchatHT * line.quantite;
                const margeEuros = line.totalHT - coutTotal;
                return (
                  <tr key={line.id} className="border-b">
                    <td className="px-3 py-1.5 text-xs">{line.designation || `Ligne sup. ${i + 1}`}</td>
                    <td className="px-3 py-1.5 text-xs text-right">{fmt(coutTotal)} &euro;</td>
                    <td className="px-3 py-1.5 text-xs text-right text-orange-600 font-semibold">{line.margePercent}%</td>
                    <td className="px-3 py-1.5 text-xs text-right">{fmt(line.totalHT)} &euro;</td>
                    <td className="px-3 py-1.5 text-xs text-right font-semibold text-green-700">{fmt(margeEuros)} &euro;</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="px-3 py-2 text-xs">TOTAL</td>
                <td className="px-3 py-2 text-xs text-right">
                  {fmt(
                    config.lines.reduce((s, l) => s + l.prixUnitaireHT * l.quantite, 0) +
                    config.extraLines.reduce((s, l) => s + l.coutAchatHT * l.quantite, 0)
                  )} &euro;
                </td>
                <td className="px-3 py-2 text-xs text-right text-orange-600">
                  {(() => {
                    const totalAchat = config.lines.reduce((s, l) => s + l.prixUnitaireHT * l.quantite, 0) +
                      config.extraLines.reduce((s, l) => s + l.coutAchatHT * l.quantite, 0);
                    const totalVente = config.lines.reduce((s, l) => s + l.totalVenteHT, 0) +
                      config.extraLines.reduce((s, l) => s + l.totalHT, 0);
                    return totalAchat > 0 ? fmt(((totalVente - totalAchat) / totalAchat) * 100) + "%" : "—";
                  })()}
                </td>
                <td className="px-3 py-2 text-xs text-right">
                  {fmt(
                    config.lines.reduce((s, l) => s + l.totalVenteHT, 0) +
                    config.extraLines.reduce((s, l) => s + l.totalHT, 0)
                  )} &euro;
                </td>
                <td className="px-3 py-2 text-xs text-right text-green-700">
                  {fmt(
                    config.lines.reduce((s, l) => s + l.totalVenteHT - l.prixUnitaireHT * l.quantite, 0) +
                    config.extraLines.reduce((s, l) => s + l.totalHT - l.coutAchatHT * l.quantite, 0)
                  )} &euro;
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
