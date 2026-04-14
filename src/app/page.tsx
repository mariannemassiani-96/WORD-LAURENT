"use client";

import { useState, useCallback, useEffect } from "react";
import FileUpload from "@/components/FileUpload";
import DevisForm from "@/components/DevisForm";
import DevisPreview from "@/components/DevisPreview";
import { parseSialRtf } from "@/lib/parseSial";
import { generateWord } from "@/lib/exportWord";
import { DevisConfig, DevisLine } from "@/lib/types";
import {
  getSavedDevisList,
  saveDevis,
  loadDevis,
  deleteDevis,
  exportDevisToJson,
  importDevisFromJson,
  SavedDevis,
} from "@/lib/storage";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const defaultConfig: DevisConfig = {
  reference: "",
  date: new Date().toISOString().slice(0, 10),
  concepteur: "Laurent",
  client: { nom: "", adresse: "", codePostal: "", ville: "" },
  lines: [],
  extraLines: [],
  tvaRate: 10,
  ecoParticipation: 0,
};

export default function Home() {
  const [config, setConfig] = useState<DevisConfig>(defaultConfig);
  const [imported, setImported] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [savedList, setSavedList] = useState<SavedDevis[]>([]);
  const [saveMsg, setSaveMsg] = useState("");

  // Load saved devis list on mount
  useEffect(() => {
    setSavedList(getSavedDevisList());
  }, []);

  const handleFileLoaded = useCallback((content: string) => {
    const positions = parseSialRtf(content);

    const lines: DevisLine[] = positions.map((pos) => {
      let designation = pos.type || pos.gamme || "Menuiserie";
      if (pos.gamme && pos.type) {
        designation = `${pos.gamme} - ${pos.type}`;
      }
      return {
        id: generateId(),
        position: pos.position,
        designation,
        description: "",
        details: {
          Gamme: pos.gamme,
          "Dimensions (LxH)": pos.dimensions,
          Coloris: pos.coloris,
          "Teinte Accessoires": pos.teinteAccessoires,
          Ouverture: pos.ouverture,
          "Hauteur poignée": pos.hauteurPoignee,
          Vitrage: pos.vitrage,
          Poids: pos.poids,
          Surface: pos.surface,
        },
        prixUnitaireHT: pos.prixUnitaireHT,
        quantite: pos.quantite,
        totalHT: pos.totalHT,
        margePercent: 30,
        prixVenteUnitaireHT: pos.prixUnitaireHT * 1.3,
        totalVenteHT: pos.prixUnitaireHT * 1.3 * pos.quantite,
        isSialImport: true,
        imageDataUrl: pos.imageDataUrl,
        options: pos.options,
      };
    });

    const ecoTotal = positions.length > 0 ? 3.56 : 0;

    setConfig((prev) => ({
      ...prev,
      lines,
      ecoParticipation: ecoTotal,
    }));
    setImported(true);
    setActiveTab("form");
  }, []);

  const handleSave = () => {
    saveDevis(config);
    setSavedList(getSavedDevisList());
    setSaveMsg("Sauvegardé !");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const handleLoad = (id: string) => {
    const loaded = loadDevis(id);
    if (loaded) {
      setConfig(loaded);
      setImported(true);
      setActiveTab("form");
    }
  };

  const handleDelete = (id: string) => {
    deleteDevis(id);
    setSavedList(getSavedDevisList());
  };

  const handleExportJson = () => exportDevisToJson(config);

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await importDevisFromJson(file);
      setConfig(loaded);
      setImported(true);
      setActiveTab("form");
    } catch {
      alert("Erreur lors de l'import du fichier JSON");
    }
  };

  const handleExportWord = async () => {
    const blob = await generateWord(config);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Devis_CASAPERTURA_${config.reference || "export"}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    setActiveTab("preview");
    setTimeout(() => window.print(), 300);
  };

  const handleNewDevis = () => {
    setConfig(defaultConfig);
    setImported(false);
    setActiveTab("form");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#2B4C7E] text-white shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1
                className="text-2xl font-bold cursor-pointer"
                onClick={handleNewDevis}
              >
                CASAPERTURA
              </h1>
              <p className="text-blue-200 text-xs">
                Convertisseur de devis SIAL
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {imported && (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-500 text-white px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-green-600 transition"
                >
                  {saveMsg || "Sauvegarder"}
                </button>
                <button
                  onClick={handleExportJson}
                  className="bg-gray-500 text-white px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-gray-600 transition"
                >
                  Export JSON
                </button>
                <button
                  onClick={handleExportWord}
                  className="bg-white text-[#2B4C7E] px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-blue-50 transition"
                >
                  Export Word
                </button>
                <button
                  onClick={handleExportPDF}
                  className="bg-orange-500 text-white px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-orange-600 transition"
                >
                  Export PDF
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 print:p-0 print:max-w-none">
        {!imported ? (
          <div className="max-w-2xl mx-auto mt-8 space-y-6">
            {/* Import section */}
            <FileUpload onFileLoaded={handleFileLoaded} />
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">
                ou importer un devis sauvegardé (.json)
              </p>
              <label className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-gray-300 transition">
                Importer JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>

            {/* Saved devis list */}
            {savedList.length > 0 && (
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-lg text-gray-800 mb-3">
                  Devis sauvegardés
                </h3>
                <div className="space-y-2">
                  {savedList.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleLoad(d.id)}
                      >
                        <p className="font-semibold text-gray-700 text-sm">
                          {d.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(d.savedAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoad(d.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Ouvrir
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="text-red-400 hover:text-red-600 text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="flex gap-2 mb-4 print:hidden">
              <button
                onClick={handleNewDevis}
                className="px-4 py-2 rounded-lg font-semibold text-sm bg-gray-200 text-gray-600 hover:bg-gray-300 transition"
              >
                Nouveau
              </button>
              <button
                onClick={() => setActiveTab("form")}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition ${
                  activeTab === "form"
                    ? "bg-[#2B4C7E] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Formulaire
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition ${
                  activeTab === "preview"
                    ? "bg-[#2B4C7E] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Aperçu CASAPERTURA
              </button>
            </div>

            {/* Content */}
            <div className={activeTab === "form" ? "print:hidden" : ""}>
              {activeTab === "form" ? (
                <DevisForm config={config} onChange={setConfig} />
              ) : (
                <DevisPreview config={config} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
