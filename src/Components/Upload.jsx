// src/pages/Upload.jsx
import React, { useState, useRef } from "react";
import { parseExcelFile } from "../utils/excelParser";
import { UploadIcon } from "lucide-react";
import TranslatedText from "./TranslatedText";
import useAutoTranslate from "../hooks/useAutoTranslate.jsx";

const Upload = ({ onUploadComplete = () => {} }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileNames, setFileNames] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // MAIN FUNCTION
  const handleFilesUpload = async (filesList) => {
    const files = Array.from(filesList);
    if (!files.length) return;

    setUploading(true);
    setProgress(0);
    setFileNames(files.map((f) => f.name));

    try {
      let allVoters = [];
      const totalFiles = files.length;

      // Process each Excel file
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];

        const parsedData = await parseExcelFile(file);
        allVoters = [...allVoters, ...parsedData];

        // Update progress (file processing = 80%)
        setProgress(Math.round(((i + 1) / totalFiles) * 80));
      }

      // Final JSON creation step
      setProgress(90);

      // *** FIX: Download JSON ONLY ONCE ***
      const blob = new Blob([JSON.stringify(allVoters, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      // Use timeout to ensure React does NOT re-trigger download
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = url;
        a.download = "voters.json"; // Always 1 file
        a.click();
        URL.revokeObjectURL(url);
      }, 300);

      // Complete progress
      setProgress(100);

      onUploadComplete(allVoters.length);
      alert(
        `✅ Successfully processed ${totalFiles} files and saved ${allVoters.length} voters to ONE voters.json file!`
      );
    } catch (err) {
      console.error("Error:", err);
      alert("❌ Error processing Excel files.");
    } finally {
      setUploading(false);
      setProgress(0);
      setFileNames([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e) => {
    handleFilesUpload(e.target.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!uploading && fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="backdrop-blur-lg bg-white/70 rounded-2xl shadow-xl p-6 sm:p-8 border border-white/50">
          
          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UploadIcon className="text-orange-500 font-bold" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              <TranslatedText>Upload Voter Data</TranslatedText>
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              <TranslatedText>Upload multiple Excel files to generate one merged voters.json</TranslatedText>
            </p>
          </div>

          {/* DRAG & DROP */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-300 cursor-pointer ${
              dragActive
                ? "border-orange-500 bg-orange-50/50 scale-[1.02]"
                : uploading
                ? "border-gray-300 bg-gray-50/50 cursor-not-allowed"
                : "border-orange-300 bg-white/50 hover:border-orange-400 hover:bg-orange-50/30 hover:scale-[1.01]"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={uploading}
              multiple
              className="hidden"
            />

            <div className="space-y-4">
              <div
                className={`w-12 h-12 mx-auto transition-colors ${
                  uploading ? "text-gray-400" : "text-orange-500"
                }`}
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                ) : (
                  <UploadIcon />
                )}
              </div>

              <div className="space-y-2">
                <p className={`font-medium ${uploading ? "text-gray-600" : "text-gray-800"}`}>
                  {uploading ? (
                    <TranslatedText>Processing files...</TranslatedText>
                  ) : (
                    <>
                      <span className="text-orange-600 hover:text-orange-700 underline">
                        <TranslatedText>Click to upload</TranslatedText>
                      </span>{" "}
                      <TranslatedText>or drag & drop multiple files</TranslatedText>
                    </>
                  )}
                </p>

                <p className="text-xs sm:text-sm text-gray-500">
                  {uploading ? fileNames.join(", ") : "Upload multiple Excel files (.xlsx, .xls, .csv)"}
                </p>
              </div>
            </div>
          </div>

          {/* PROGRESS */}
          {uploading && (
            <div className="mt-6 space-y-3 animate-fade-in">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="truncate flex-1 mr-2">
                  {fileNames.slice(0, 3).join(", ")}
                  {fileNames.length > 3 && ` +${fileNames.length - 3} more`}
                </span>
                <span className="font-medium text-orange-600 whitespace-nowrap">
                  {Math.round(progress)}%
                </span>
              </div>

              <div className="w-full bg-gray-200/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Merging all files into one voters.json...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
