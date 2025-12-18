import React, { useEffect, useState, lazy, Suspense, useMemo } from "react";
import Sanscript from "sanscript";
import localforage from "localforage";
import * as XLSX from "xlsx";
import { FiLoader, FiDownload } from "react-icons/fi";
import { useCandidate } from "../Context/CandidateContext";

const VoterList = lazy(() => import("./VoterList"));
const SearchBar = lazy(() => import("./SearchBar"));

/* ---------------- FAST NORMALIZE ---------------- */
const normalize = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0900-\u097F\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/* ---------------- BUILD SEARCH INDEX (ONCE) ---------------- */
const buildSearchIndex = (v) => {
  let latin = "";
  try {
    latin = Sanscript.t(v.name || "", "devanagari", "itrans");
  } catch {}

  return normalize(`
    ${v.name}
    ${latin}
    ${v.voterId}
    ${v.boothNumber}
    ${v.address}
    ${v.pollingStationAddress}
    ${v.village}
    ${v.fatherName}
    ${v.surname}
  `);
};

export default function Dashboard() {
  const { candidateInfo } = useCandidate();

  const [allVoters, setAllVoters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /* ---------------- EXPORT MODAL ---------------- */
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [exporting, setExporting] = useState(false);

  /* ---------------- LOAD DATA (ULTRA FAST) ---------------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1️⃣ Try IndexedDB first
      const cached = await localforage.getItem("voters_indexed");
      if (cached?.length) {
        setAllVoters(cached);
        setLoading(false);
        return;
      }

      // 2️⃣ Load from public JSON (once)
      const res = await fetch("/voter.json");
      const raw = await res.json();

      // 3️⃣ Build index in background
      requestIdleCallback(async () => {
        const indexed = raw.map(v => ({
          ...v,
          _search: buildSearchIndex(v),
        }));
        await localforage.setItem("voters_indexed", indexed);
        setAllVoters(indexed);
        setLoading(false);
      });
    };

    load();
  }, []);

  /* ---------------- SEARCH (INSTANT) ---------------- */
  const filtered = useMemo(() => {
    if (!search) return allVoters.slice(0, 50);

    const terms = normalize(search).split(" ");
    return allVoters
      .filter(v => terms.every(t => v._search?.includes(t)))
      .slice(0, 50);
  }, [search, allVoters]);

  /* ---------------- EXCEL EXPORT (UNCHANGED) ---------------- */
  const exportToExcel = (rows) => {
    if (!rows.length) return;

    const exportData = rows.map((voter, i) => {
      const survey = voter.survey || {};
      const familyMembers = voter.familyMembers || {};

      return {
        "Serial Number": voter.serialNumber || i + 1,
        "Voter ID": voter.voterId || "",
        "Name": voter.name || "",
        "Age": voter.age || "",
        "Gender": voter.gender || "",
        "Booth Number": voter.boothNumber || "",
        "Polling Station": voter.pollingStationAddress || "",
        "Address": survey.address || voter.address || "",
        "House Number": voter.houseNumber || "",
        "Phone": survey.mobile || voter.phone || "",
        "Has Voted": voter.hasVoted || voter.voted ? "Yes" : "No",
        "Family Members Count": Object.keys(familyMembers).length,
        "Family Members Details": Object.values(familyMembers).join("; "),
        "Family Income": survey.familyIncome || "",
        "Education": survey.education || "",
        "Occupation": survey.occupation || "",
        "Caste": survey.caste || "",
        "Political Affiliation": survey.politicalAffiliation || "",
        "Issues": survey.issues || "",
        "Support Status": voter.supportStatus || "",
        "Assigned Karyakarta": voter.assignedKaryakarta || "",
        "Village": voter.village || "",
        "Prabhag": voter.prabhag || "",
        "Surname": voter.surname || "",
        "Father Name": voter.fatherName || "",
        "Yadi Bhag Address": voter.yadiBhagAddress || "",
        "Created At": voter.createdAt || "",
        "Updated At": voter.updatedAt || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Voters");
    XLSX.writeFile(wb, `voters_${Date.now()}.xlsx`);
  };

  const confirmExport = () => {
    if (exportPassword !== candidateInfo.password) {
      setPasswordError("Incorrect password");
      return;
    }
    setExporting(true);
    exportToExcel(filtered);
    setExporting(false);
    setShowExportModal(false);
  };

  /* ---------------- SINGLE CLEAN LOADER ---------------- */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <FiLoader className="animate-spin text-orange-500 text-2xl mr-3" />
        <span className="text-gray-600">Loading voter database…</span>
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex gap-3 items-center mb-2  ">
        <SearchBar
          placeholder="Search name / voter id / booth (English or Marathi)"
          onSearch={setSearch}
          className="w-full"
        />

        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          <FiDownload /> Export
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Showing {filtered.length} of {allVoters.length} voters
      </p>

      <Suspense fallback={<div className="text-center py-6">Loading list…</div>}>
        <VoterList voters={filtered} />
      </Suspense>

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="font-semibold mb-3">Confirm Export</h3>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 mb-2"
              placeholder="Enter password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
            />
            {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowExportModal(false)}>Cancel</button>
              <button
                onClick={confirmExport}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
