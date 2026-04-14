"use client";

import { useCallback } from "react";

interface FileUploadProps {
  onFileLoaded: (content: string) => void;
}

export default function FileUpload({ onFileLoaded }: FileUploadProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    },
    [onFileLoaded]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) readFile(file);
    },
    [onFileLoaded]
  );

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      onFileLoaded(text);
    };
    // RTF files are text-based with cp1252 encoding
    reader.readAsText(file, "windows-1252");
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
    >
      <label className="cursor-pointer block">
        <div className="text-4xl mb-3">📄</div>
        <p className="text-lg font-semibold text-blue-800">
          Importer le devis SIAL
        </p>
        <p className="text-sm text-blue-600 mt-1">
          Glissez-déposez le fichier .doc (RTF) ou cliquez pour sélectionner
        </p>
        <input
          type="file"
          accept=".doc,.rtf"
          onChange={handleChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
