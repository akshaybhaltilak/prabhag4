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
import {
  FiLoader,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiArrowLeft,
} from "react-icons/fi";
import { useCandidate } from "../Context/CandidateContext";
import { Link } from "react-router-dom";
import TranslatedText from "./TranslatedText";

const VoterList = lazy(() => import("./VoterList"));
const SearchBar = lazy(() => import("./SearchBar"));

/* ---------------- NORMALIZE ---------------- */
const normalize = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0900-\u097F\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/* ---------------- LANGUAGE DETECTION ---------------- */
const isMarathi = (text = "") => /[\u0900-\u097F]/.test(text);

/* ---------------- BUILD SEARCH INDEX ---------------- */
const buildSearchIndex = (v) => {
  const mrName = v.name || "";
  const engName = v.voterNameEng || "";

  let mrToEng = "";
  let engToMr = "";

  try {
    if (mrName) {
      mrToEng = Sanscript.t(mrName, "devanagari", "itrans");
    }
    if (engName) {
      engToMr = Sanscript.t(engName, "itrans", "devanagari");
    }
  } catch { }

  return normalize(`
    ${mrName}
    ${engName}
    ${mrToEng}
    ${engToMr}
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

  const [page, setPage] = useState(1);
  const pageSize = 50;

  /* ---------------- EXPORT MODAL ---------------- */
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const cached = await localforage.getItem("voters_indexed_v2");
      if (cached?.length) {
        setAllVoters(cached);
        setLoading(false);
        return;
      }

      const res = await fetch("/voter.json");
      const raw = await res.json();

      // ✅ SAFARI SAFE + ANDROID FAST
      const runIndexing = async () => {
        const indexed = raw.map((v) => ({
          ...v,
          _search: buildSearchIndex(v),
        }));

        await localforage.setItem("voters_indexed_v2", indexed);
        setAllVoters(indexed);
        setLoading(false);
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(runIndexing);
      } else {
        setTimeout(runIndexing, 0); // iOS fallback
      }
    };

    load();
  }, []);

  /* ---------------- SEARCH ---------------- */
  const filteredAll = useMemo(() => {
    if (!search) return allVoters;

    const normalizedSearch = normalize(search);
    const terms = normalizedSearch.split(" ").filter(Boolean);

    return allVoters.filter((v) =>
      terms.every((t) => v._search?.includes(t))
    );
  }, [search, allVoters]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalFiltered = filteredAll.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAll.slice(start, start + pageSize);
  }, [filteredAll, page]);

  /* ---------------- EXPORT ---------------- */
  const exportToExcel = (rows) => {
    if (!rows.length) return;

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Voters");
    XLSX.writeFile(wb, `voters_${Date.now()}.xlsx`);
  };

  const confirmExport = () => {
    const requiredPassword = 'Jannetaa9881'; // Export password set as requested
    if (exportPassword !== requiredPassword) {
      setPasswordError("Incorrect password");
      return;
    }
    exportToExcel(filteredAll);
    setShowExportModal(false);
    setExportPassword("");
  };



  /* ---------------- LOADER ---------------- */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <FiLoader className="animate-spin text-orange-500 text-2xl mr-3" />
        Loading voter database…
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex mb-3 justify-between gap-3">
        <div className="flex">
          <Link to="/">
            <button className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-all">
              <FiArrowLeft className="text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              <TranslatedText>Search Voters</TranslatedText>
            </h1>
            <p className="text-gray-500 text-sm">
              <TranslatedText>Search all voters</TranslatedText>
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 bg-gray-300 text-black px-4 py-1 rounded-md shadow-lg hover:shadow-xl"
        >
          <FiDownload />
          <span className="hidden md:inline">Export</span>
        </button>
      </div>

      <SearchBar
        placeholder="Search Marathi किंवा English नाव"
        onSearch={setSearch}
        className="w-full mb-2"
      />

      <p className="text-xs text-gray-500 mb-3">
        Showing {paginated.length} of {totalFiltered} voters
      </p>

      <Suspense fallback={<div className="py-6 text-center">Loading list…</div>}>
        <VoterList voters={paginated} />
      </Suspense>

      {/* Pagination unchanged */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 bg-white p-3 rounded-lg border">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <FiChevronLeft />
          </button>
          <span className="px-3">
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <FiChevronRight />
          </button>
        </div>
      )}

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
            {passwordError && (
              <p className="text-red-500 text-sm">{passwordError}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
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
