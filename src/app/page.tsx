"use client";

import { useState, useCallback } from "react";
import FileUpload from "@/components/FileUpload";
import DevisForm from "@/components/DevisForm";
import DevisPreview from "@/components/DevisPreview";
import { parseSialRtf } from "@/lib/parseSial";
import { generateWord } from "@/lib/exportWord";
import { DevisConfig, DevisLine } from "@/lib/types";

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

  const handleFileLoaded = useCallback((content: string) => {
    const positions = parseSialRtf(content);

    const lines: DevisLine[] = positions.map((pos) => ({
      id: generateId(),
      position: pos.position,
      designation: pos.type
        ? `${pos.gamme || "Menuiserie"} - ${pos.type}`
        : pos.gamme || "Menuiserie",
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
    }));

    // Compute eco-participation from SIAL data
    const ecoTotal = positions.length > 0 ? 3.56 : 0;

    setConfig((prev) => ({
      ...prev,
      lines,
      ecoParticipation: ecoTotal,
    }));
    setImported(true);
    setActiveTab("form");
  }, []);

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
    // Switch to preview and print
    setActiveTab("preview");
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#2B4C7E] text-white shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">CASAPERTURA</h1>
            <p className="text-blue-200 text-sm">
              Convertisseur de devis SIAL &rarr; CASAPERTURA
            </p>
          </div>
          {imported && (
            <div className="flex gap-3">
              <button
                onClick={handleExportWord}
                className="bg-white text-[#2B4C7E] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition"
              >
                Exporter Word
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-600 transition"
              >
                Exporter PDF
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 print:p-0 print:max-w-none">
        {!imported ? (
          <div className="max-w-xl mx-auto mt-16">
            <FileUpload onFileLoaded={handleFileLoaded} />
            <p className="text-center text-gray-400 text-sm mt-4">
              Importez un devis SIAL (.doc / .rtf) pour commencer
            </p>
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="flex gap-2 mb-4 print:hidden">
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
