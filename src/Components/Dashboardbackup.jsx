import React, {
  useEffect,
  useState,
  lazy,
  Suspense,
  useMemo,
} from "react";
import Sanscript from "sanscript";
import localforage from "localforage";
import * as XLSX from "xlsx";
import { FiLoader, FiDownload } from "react-icons/fi";
import { useCandidate } from "../Context/CandidateContext";

const VoterList = lazy(() => import("./VoterList"));
const SearchBar = lazy(() => import("./SearchBar"));

/* ================= UTILITIES ================= */
const normalize = (str = "") =>
  str
    .toString()
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/* Marathi + English index */
const buildSearchIndex = (voter) => {
  let latinName = "";
  try {
    latinName = Sanscript.t(voter.name || "", "devanagari", "itrans");
  } catch {}

  return normalize(`
    ${voter.name}
    ${latinName}
    ${voter.voterId}
    ${voter.boothNumber}
    ${voter.houseNumber}
    ${voter.address}
    ${voter.pollingStationAddress}
    ${voter.village}
    ${voter.prabhag}
  `);
};

/* ================= COMPONENT ================= */
export default function Dashboard() {
  const { candidateInfo } = useCandidate();

  const [allVoters, setAllVoters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /* Export modal */
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [exporting, setExporting] = useState(false);

  /* ================= LOAD DATA (FAST) ================= */
  useEffect(() => {
    const loadVoters = async () => {
      try {
        const cached = await localforage.getItem("voters_indexed_v1");
        if (cached?.length) {
          setAllVoters(cached);
          setLoading(false);
          return;
        }

        const res = await fetch("/voter.json");
        const rawData = await res.json();

        /* Build index ONCE */
        const indexedData = rawData.map(v => ({
          ...v,
          _s: buildSearchIndex(v),
        }));

        setAllVoters(indexedData);
        localforage.setItem("voters_indexed_v1", indexedData);
      } catch (err) {
        console.error("Failed to load voters:", err);
      } finally {
        setLoading(false);
      }
    };

    loadVoters();
  }, []);

  /* ================= SEARCH (VERY FAST) ================= */
  const filteredVoters = useMemo(() => {
    if (!search) return allVoters.slice(0, 50);

    const terms = normalize(search).split(" ");
    const results = allVoters.filter(v =>
      terms.every(t => v._s?.includes(t))
    );

    return results.slice(0, 50);
  }, [search, allVoters]);

  /* ================= EXCEL EXPORT ================= */
  const exportToExcel = (rows) => {
    if (!rows.length) return;

    const sheetData = rows.map((voter, index) => {
      const survey = voter.survey || {};
      const familyMembers = voter.familyMembers || {};

      return {
        "Serial Number": voter.serialNumber || index + 1,
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
        "Family Members Details":
          Object.values(familyMembers).join("; ") || "",
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

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Voters");

    XLSX.writeFile(
      workbook,
      `Voters_${candidateInfo?.name || "Export"}_${Date.now()}.xlsx`
    );
  };

  const confirmExport = () => {
    setPasswordError("");

    if (!candidateInfo?.password) {
      setPasswordError("Export password not configured");
      return;
    }

    if (exportPassword !== candidateInfo.password) {
      setPasswordError("Incorrect password");
      return;
    }

    setExporting(true);
    exportToExcel(filteredVoters);
    setExporting(false);
    setShowExportModal(false);
    setExportPassword("");
  };

  /* ================= LOADER ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <FiLoader className="animate-spin text-orange-500 text-2xl" />
        <span className="ml-3 text-gray-600">Loading voters…</span>
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex gap-3 items-center">
        <SearchBar
          placeholder="Search Marathi / English name, voter id, booth..."
          onSearch={setSearch}
        />

       
      </div>
 <button
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded shadow"
          onClick={() => {
            setShowExportModal(true);
            setExportPassword("");
            setPasswordError("");
          }}
        >
          <FiDownload /> Export Excel
        </button>
      <p className="text-xs text-gray-500 mt-2">
        Showing {filteredVoters.length} of {allVoters.length} voters
      </p>

      <Suspense fallback={<div className="py-6 text-center">Loading list…</div>}>
        <VoterList voters={filteredVoters} />
      </Suspense>

      {/* ================= EXPORT MODAL ================= */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-2">
              Confirm Excel Export
            </h3>

            <input
              type="password"
              className="w-full border rounded px-3 py-2 mt-3"
              placeholder="Enter export password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmExport()}
            />

            {passwordError && (
              <p className="text-red-600 text-sm mt-2">{passwordError}</p>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button
                className="px-4 py-2 border rounded"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
              <button
                onClick={confirmExport}
                disabled={exporting}
                className="px-4 py-2 bg-orange-500 text-white rounded"
              >
                {exporting ? "Exporting..." : "Confirm Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
