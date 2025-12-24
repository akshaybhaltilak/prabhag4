// FilterPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../Firebase/config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  FiHome, FiCheckCircle, FiPhone, FiUser, FiList,
  FiChevronRight, FiUsers, FiBarChart2, FiDownload,
  FiMap, FiMapPin, FiSearch, FiMoreVertical, FiX,
  FiArrowLeft, FiThumbsUp, FiThumbsDown
} from 'react-icons/fi';
import TranslatedText from './TranslatedText';
import VoterList from './VoterList';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Dexie from 'dexie';
import Sanscript from 'sanscript';
import SearchBar from './SearchBar';
import BulkSurveyModal from './BulkSurveyModal';
import { Link, useNavigate } from 'react-router-dom';

// ---------- Dexie setup ----------
const dbLocal = new Dexie('JanNetaaDB_v2'); // Incremented version
dbLocal.version(2).stores({
  voters: 'voterId, name, age, gender, boothNumber, prabhag, lastUpdated',
  voter_surveys: 'voterId, phone, whatsapp, city, education, occupation, category, issues, remarks, supportStatus, caste, updatedAt',
  voters_dynamic: 'voterId, updatedAt, hasVoted, supportStatus, id',
  app_cache: 'key, value, timestamp' // Added for better cache management
});

// ---------- Helpers ----------
const marathiToEnglishDigits = (s = '') => {
  if (!s) return '';
  const map = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' };
  return s.toString().split('').map(ch => map[ch] ?? ch).join('');
};

const cleanPhone = (raw = '') => raw ? raw.toString().replace(/[^\d]/g, '') : '';

const normalizeGender = (g = '') => {
  if (!g) return '';
  const gg = g.toString().toLowerCase().trim();
  // Common single letter markers
  if (gg === 'm' || gg === 'male' || gg.startsWith('m') || gg === 'पुरुष' || gg === 'पुरू') return 'male';
  if (gg === 'f' || gg === 'female' || gg.startsWith('f') || gg === 'स्त्री' || gg === 'महिला') return 'female';
  return gg;
};

function normalizeRecord(data = {}) {
  const voterIdRaw = (data.voterId || data.VoterId || data.id || '').toString().trim();
  const voterId = voterIdRaw ? voterIdRaw.toUpperCase() : '';

  const rawName = (data.name || data.Name || '').toString().trim();
  const parts = rawName.split(' ').map(p => p.trim()).filter(Boolean);
  const firstToken = parts[0] || '';
  const lastToken = parts.length > 0 ? parts[parts.length - 1] : '';

  // Prefer explicit surname fields if available
  const marathi_surname = (data.marathi_surname || data.marathiSurname || '').toString().trim();
  const english_surname = (data.english_surname || data.englishSurname || '').toString().trim();

  // English name field if provided by source JSON
  const voterNameEng = (data.voterNameEng || data.VoterNameEng || data.name_en || data.nameEng || '').toString().trim();

  const surname = marathi_surname || english_surname || firstToken || lastToken || '';
  const name = rawName || voterNameEng || '';

  const rawAge = data.age || data.Age || '';
  let age = 0;
  try {
    const conv = marathiToEnglishDigits(String(rawAge));
    age = parseInt(conv.replace(/[^\d]/g, ''), 10) || 0;
  } catch (e) {
    age = 0;
  }

  const phone = cleanPhone(data.phone || data.whatsapp || data.mobile || '');
  const boothNumber = (data.boothNumber || data.booth || data.Booth || '').toString().trim();
  const prabhag = (data.prabhag || data.Prabhag || data.ward || data.wardNo || '').toString().trim();
  const yadiBhagAddress = (data.yadiBhagAddress || data.yadiAddress || data.address || '').toString().trim();

  const hv = data.hasVoted ?? data.voted ?? data.votedStatus ?? false;
  const hasVoted = (hv === true) || (hv === 'true') || (hv === 'yes') || (hv === 1) || (hv === '1');

  // Get caste from data (from voter_surveys)
  const caste = data.caste || data.category || '';

  // Get support status
  const supportStatus = data.supportStatus || data.support || 'unknown';

  // Precompute transliteration and lowercase searchable fields for performance
  let nameLatin = '';
  try {
    if (rawName) nameLatin = Sanscript.t(rawName, 'devanagari', 'itrans') || '';
  } catch (e) {
    nameLatin = '';
  }

  const nameLower = (rawName || '').toString().toLowerCase();
  const nameLatinLower = (nameLatin || '').toLowerCase();
  const engNameLower = (voterNameEng || '').toString().toLowerCase();
  const marSurnameLower = (marathi_surname || '').toLowerCase();
  const engSurnameLower = (english_surname || '').toLowerCase();

  const combinedSearch = [nameLower, nameLatinLower, engNameLower, marSurnameLower, engSurnameLower, (data.voterId || '').toString().toLowerCase(), (boothNumber || '').toLowerCase(), (prabhag || '').toLowerCase()].join(' ');

  return {
    id: voterId || `tmp_${Math.random().toString(36).slice(2, 9)}`,
    voterId,
    name: rawName,
    voterNameEng: voterNameEng,
    marathi_surname,
    english_surname,
    surname,
    serialNumber: data.serialNumber || data.serial || '',
    age,
    gender: normalizeGender(data.gender || data.Gender || ''),
    boothNumber,
    prabhag,
    yadiBhagAddress,
    pollingStationAddress: (data.pollingStationAddress || data.pollingStation || data.pollingStationName || '').toString().trim(),
    village: (data.village || data.area || '').toString().trim(),
    fatherName: (data.fatherName || data.father || '').toString().trim(),
    phone,
    hasVoted,
    caste,
    supportStatus,
    lastUpdated: data.lastUpdated || data.updatedAt || Date.now(),
    // Precomputed fields to speed up search
    nameLower,
    nameLatinLower,
    engNameLower,
    marSurnameLower,
    engSurnameLower,
    _combinedSearch: combinedSearch
  };
}

// Merge static + survey + dynamic (dynamic overrides)
const mergeStaticWithDynamic = (staticArr = [], surveys = [], dynamics = []) => {
  const surveyMap = new Map(surveys.map(s => [String((s.voterId || '')).trim().toUpperCase(), s]));
  const dynamicMap = new Map(dynamics.map(d => [String((d.voterId || '')).trim().toUpperCase(), d]));
  return staticArr.map(s => {
    const id = String((s.voterId || s.id || s.VoterId || '')).trim().toUpperCase();
    const survey = surveyMap.get(id) || {};
    const dyn = dynamicMap.get(id) || {};
    const merged = { ...s, ...survey, ...dyn };
    return normalizeRecord(merged);
  });
};

// Search helper function for English to Marathi search
const searchVoters = (voters, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return voters;
  const termRaw = searchTerm.trim();
  const term = termRaw.toLowerCase();
  const isDevanagari = /[\u0900-\u097F]/.test(termRaw);
  const digitsOnly = term.replace(/[^\d]/g, '');

  return voters.filter(voter => {
    // Phone quick match
    if (digitsOnly && voter.phone && voter.phone.includes(digitsOnly)) return true;

    if (isDevanagari) {
      // Marathi search: check stored marathi fields directly
      if (voter.name && voter.name.toLowerCase().includes(term)) return true;
      if (voter.marathi_surname && voter.marathi_surname.toLowerCase().includes(term)) return true;
      // Also check transliteration index if available
      if (voter.nameLatinLower && voter.nameLatinLower.includes(Sanscript.t ? Sanscript.t(termRaw, 'devanagari', 'itrans').toLowerCase() : '')) return true;
      return false;
    }

    // Latin search: prefer explicit English fields
    if (voter.voterNameEng && voter.voterNameEng.toLowerCase().includes(term)) return true;
    if (voter.engSurnameLower && voter.engSurnameLower.includes(term)) return true;
    if (voter.nameLatinLower && voter.nameLatinLower.includes(term)) return true;
    if (voter._combinedSearch && voter._combinedSearch.includes(term)) return true;

    return false;
  });
};

// ---------- Component ----------
const FilterPage = () => {
  const [voters, setVoters] = useState([]);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [searchFilteredVoters, setSearchFilteredVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedBooth, setSelectedBooth] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');
  const [selectedSurname, setSelectedSurname] = useState('');
  const [surnameSearch, setSurnameSearch] = useState('');
  const [surnameSearchDebounced, setSurnameSearchDebounced] = useState('');
  const [surnamePage, setSurnamePage] = useState(1);
  const surnamesPerPage = 100;
  const [surnameIndex, setSurnameIndex] = useState([]);
  const [surnameIndexLoading, setSurnameIndexLoading] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalSurname, setBulkModalSurname] = useState(null);
  const [bulkModalVoters, setBulkModalVoters] = useState([]);
  const navigate = useNavigate();
  const [selectedPrabhag, setSelectedPrabhag] = useState('');
  const [selectedYadiBhag, setSelectedYadiBhag] = useState('');
  const [selectedCaste, setSelectedCaste] = useState('');
  const [selectedSupport, setSelectedSupport] = useState('');
  const [page, setPage] = useState(1);
  const [alphabetLetters, setAlphabetLetters] = useState(Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')));
  const votersPerPage = 50;

  // Enhanced categories with new filters
  const categories = [
    { id: 'booth', title: 'Booth Wise Voting List', icon: FiHome, color: 'bg-orange-500', description: 'View voters by polling booth' },
    { id: 'prabhag', title: 'Ward Wise List', icon: FiMap, color: 'bg-orange-500', description: 'View voters by Prabhag' },
    { id: 'yadibhag', title: 'Yadi Bhag Address', icon: FiMapPin, color: 'bg-orange-500', description: 'View voters by Yadi Bhag Address' },
    { id: 'surname', title: 'According to Surname', icon: FiUsers, color: 'bg-orange-500', description: 'Voters grouped by surname' },
    { id: 'alphabet', title: 'Alphabet-wise', icon: FiUsers, color: 'bg-orange-500', description: 'A → Z grouping (transliteration)' },

    { id: 'voted', title: 'View Voted Voters', icon: FiCheckCircle, color: 'bg-orange-500', description: 'Voted Voters' },
    { id: 'withPhone', title: 'According to phone number', icon: FiPhone, color: 'bg-orange-500', description: 'Voters with phone numbers' },
    { id: 'male', title: 'Male Voters', icon: FiUser, color: 'bg-orange-500', description: 'All male voters' },
    { id: 'female', title: 'Female Voters', icon: FiUser, color: 'bg-orange-500', description: 'All female voters' },
    { id: 'caste', title: 'According to Caste', icon: FiUsers, color: 'bg-orange-500', description: 'Voters grouped by caste' },
    { id: 'support', title: 'Supporters', icon: FiThumbsUp, color: 'bg-orange-500', description: 'Voters grouped by support status' },

    { id: 'duplicates', title: 'Duplicates', icon: FiList, color: 'bg-orange-500', description: 'Potential duplicate records' },
    { id: 'age', title: 'Age Wise', icon: FiBarChart2, color: 'bg-orange-500', description: 'Voters grouped by age ranges' },
  ];

  const ageGroups = [
    { id: '18-29', label: '18-29', min: 18, max: 29 },
    { id: '30-49', label: '30-49', min: 30, max: 49 },
    { id: '50-59', label: '50-59', min: 50, max: 59 },
    { id: '60+', label: '60+', min: 60, max: 150 }
  ];

  // Support status options
  const supportOptions = [
    { id: 'supporter', label: 'Strong Supporter', icon: FiThumbsUp, color: 'bg-green-500' },
    { id: 'medium', label: 'Medium Support', icon: FiUser, color: 'bg-yellow-500' },
    { id: 'not-supporter', label: 'Not Supporter', icon: FiThumbsDown, color: 'bg-red-500' },
    { id: 'unknown', label: 'Unknown', icon: FiUser, color: 'bg-gray-500' }
  ];

  // Handle search
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setSearchFilteredVoters(filteredVoters);
    } else {
      const results = searchVoters(filteredVoters, term);
      setSearchFilteredVoters(results);
    }
    setPage(1);
  }, [filteredVoters]);

  // Update searchFilteredVoters when filteredVoters changes
  useEffect(() => {
    setSearchFilteredVoters(filteredVoters);
  }, [filteredVoters]);

  // Optimized data loading with IndexedDB caching only (no localStorage)
  const ensureStaticLoaded = useCallback(async () => {
    try {
      const cnt = await dbLocal.voters.count();

      // If we already have data, use it
      if (cnt > 0) {
        console.log('📦 Using existing IndexedDB data');
        return;
      }

      console.log('🔄 Fetching fresh voter data...');
      const resp = await fetch('/voter.json');
      if (!resp.ok) throw new Error('Failed to fetch /voter.json');
      const json = await resp.json();
      const arr = Array.isArray(json) ? json : (json.voters || []);

      if (arr.length === 0) {
        console.warn('No voter data found in voter.json');
        return;
      }

      // Process data in chunks to avoid memory issues
      const chunkSize = 1000;
      const chunks = [];
      for (let i = 0; i < arr.length; i += chunkSize) {
        chunks.push(arr.slice(i, i + chunkSize));
      }

      console.log(`📊 Processing ${arr.length} voters in ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const putArr = chunk.map(item => ({
          ...item,
          voterId: String(item.voterId || item.id || item.VoterId || '').trim().toUpperCase(),
          name: item.name || item.Name || '',
          voterNameEng: item.voterNameEng || item.VoterNameEng || item.name_en || item.nameEng || '',
          marathi_surname: item.marathi_surname || item.marathiSurname || '',
          english_surname: item.english_surname || item.englishSurname || '',
          age: item.age || item.Age || '',
          gender: item.gender || item.Gender || '',
          boothNumber: item.boothNumber || item.booth || '',
          prabhag: item.prabhag || item.Prabhag || item.ward || item.wardNo || '',
          yadiBhagAddress: item.yadiBhagAddress || item.yadiAddress || item.address || '',
          lastUpdated: Date.now()
        }));

        await dbLocal.voters.bulkPut(putArr);
        console.log(`✅ Processed chunk ${i + 1}/${chunks.length}`);
      }

      console.log('🎉 Successfully loaded all voter data into IndexedDB');

    } catch (err) {
      console.error('ensureStaticLoaded error:', err);
      throw err;
    }
  }, []);

  // Optimized dynamic data fetching with error handling
  const fetchAndStoreDynamic = useCallback(async () => {
    try {
      console.log('🔄 Fetching dynamic data...');
      const [surveysSnap, dynSnap] = await Promise.all([
        getDocs(collection(db, 'voter_surveys')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'voters_dynamic')).catch(() => ({ docs: [] }))
      ]);

      const surveys = surveysSnap.docs.map(d => {
        const doc = d.data() || {};
        return { 
          ...doc, 
          voterId: String(doc.voterId || doc.VoterId || d.id || '').trim().toUpperCase(),
          caste: doc.caste || doc.category || '',
          supportStatus: doc.supportStatus || 'unknown'
        };
      });

      const dynamics = dynSnap.docs.map(d => {
        const doc = d.data() || {};
        const rawHv = doc.hasVoted ?? doc.voted ?? false;
        const hasVotedBool = (rawHv === true) || (rawHv === 'true') || (rawHv === 'yes') || (rawHv === 1) || (rawHv === '1');
        return { 
          ...doc, 
          voterId: String(doc.voterId || doc.VoterId || d.id || '').trim().toUpperCase(), 
          hasVoted: hasVotedBool,
          supportStatus: doc.supportStatus || 'unknown'
        };
      });

      await dbLocal.transaction('rw', dbLocal.voter_surveys, dbLocal.voters_dynamic, async () => {
        if (surveys.length) {
          await dbLocal.voter_surveys.bulkPut(surveys);
          console.log(`✅ Stored ${surveys.length} survey records`);
        }
        if (dynamics.length) {
          await dbLocal.voters_dynamic.bulkPut(dynamics);
          console.log(`✅ Stored ${dynamics.length} dynamic records`);
        }
      });

    } catch (err) {
      console.warn('fetchAndStoreDynamic (offline mode):', err);
    }
  }, []);

  const refreshMerged = useCallback(async () => {
    if (initialLoad) setLoading(true);

    try {
      console.log('🔄 Refreshing merged data...');
      const [staticArr, surveysArr, dynArr] = await Promise.all([
        dbLocal.voters.toArray(),
        dbLocal.voter_surveys.toArray(),
        dbLocal.voters_dynamic.toArray()
      ]);

      console.log(`📊 Data counts - Static: ${staticArr.length}, Surveys: ${surveysArr.length}, Dynamic: ${dynArr.length}`);

      const merged = mergeStaticWithDynamic(staticArr, surveysArr, dynArr);
      console.log(`🎉 Merged ${merged.length} total voters`);

      setVoters(merged);
      setFilteredVoters(merged);
      setSearchFilteredVoters(merged);
    } catch (err) {
      console.error('refreshMerged error:', err);
      // Try to load at least static data
      try {
        const staticArr = await dbLocal.voters.toArray();
        const basicMerged = staticArr.map(normalizeRecord);
        setVoters(basicMerged);
        setFilteredVoters(basicMerged);
        setSearchFilteredVoters(basicMerged);
      } catch (fallbackErr) {
        console.error('Fallback loading failed:', fallbackErr);
        setVoters([]);
        setFilteredVoters([]);
        setSearchFilteredVoters([]);
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [initialLoad]);

  // Optimized useEffect for initial load
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (initialLoad) {
        setLoading(true);
        console.log('🚀 Starting initial data load...');
      }

      try {
        // Load static data first
        await ensureStaticLoaded();

        // Try to fetch dynamic data but don't block UI
        fetchAndStoreDynamic().catch(err => {
          console.warn('Dynamic data fetch failed, continuing with cached data:', err);
        });

        // Refresh merged data
        if (mounted) await refreshMerged();
      } catch (err) {
        console.error('Initial load error:', err);
        if (mounted) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    };

    loadData();

    // Set up refresh interval only after initial load
    const id = setInterval(async () => {
      if (!initialLoad && mounted) {
        try {
          await fetchAndStoreDynamic();
          await refreshMerged();
        } catch (e) {
          console.warn('Background refresh failed:', e);
        }
      }
    }, 120000); // Reduced to 2 minutes

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [ensureStaticLoaded, fetchAndStoreDynamic, refreshMerged, initialLoad]);

  // ---------- Derived data (optimized) ----------
  const uniqueBooths = useMemo(() => {
    const s = new Set();
    voters.forEach(v => {
      if (v.boothNumber && String(v.boothNumber).trim() !== '') s.add(String(v.boothNumber));
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [voters]);

  const uniquePrabhags = useMemo(() => {
    const s = new Set();
    voters.forEach(v => {
      if (v.prabhag && String(v.prabhag).trim() !== '') s.add(String(v.prabhag));
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [voters]);

  const uniqueYadiBhags = useMemo(() => {
    const s = new Set();
    voters.forEach(v => {
      if (v.yadiBhagAddress && String(v.yadiBhagAddress).trim() !== '') s.add(String(v.yadiBhagAddress));
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [voters]);

  // Castes (gathered from voter_surveys + local voter.caste if present)
  const [uniqueCastes, setUniqueCastes] = useState([]);
  const [casteCounts, setCasteCounts] = useState({});
  const [supportCounts, setSupportCounts] = useState({ 
    supporter: 0, 
    medium: 0, 
    'not-supporter': 0, 
    unknown: 0 
  });

  useEffect(() => {
    (async () => {
      try {
        // Get all voters with caste information
        const allVotersWithCaste = voters.filter(v => v.caste && v.caste.trim() !== '');
        
        // Count castes
        const casteMap = {};
        allVotersWithCaste.forEach(v => {
          const caste = v.caste.trim();
          casteMap[caste] = (casteMap[caste] || 0) + 1;
        });
        
        setCasteCounts(casteMap);
        
        // Get unique castes sorted
        const casteSet = new Set(Object.keys(casteMap));
        const uniqueCasteArray = Array.from(casteSet).sort((a, b) => a.localeCompare(b));
        setUniqueCastes(uniqueCasteArray);

        // Count support statuses
        const supportMap = { supporter: 0, medium: 0, 'not-supporter': 0, unknown: 0 };
        voters.forEach(v => {
          const status = v.supportStatus || 'unknown';
          if (supportMap[status] !== undefined) {
            supportMap[status]++;
          } else {
            supportMap['unknown']++;
          }
        });
        setSupportCounts(supportMap);
      } catch (e) {
        console.warn('Failed to calculate castes/support counts', e);
      }
    })();
  }, [voters]);

  // Listener to update counts when surveys change elsewhere in the app
  useEffect(() => {
    const onSurveyUpdated = async () => {
      try {
        await fetchAndStoreDynamic();
        await refreshMerged();
      } catch (err) {
        console.warn('survey update handler failed', err);
      }
    };

    window.addEventListener('voter_survey_updated', onSurveyUpdated);
    return () => window.removeEventListener('voter_survey_updated', onSurveyUpdated);
  }, [fetchAndStoreDynamic, refreshMerged]);

  const surnameGroups = useMemo(() => {
    const map = {};
    voters.forEach(v => {
      const key = (v.marathi_surname || v.english_surname || (v.surname && String(v.surname).trim()) || 'Unknown');
      if (!map[key]) map[key] = [];
      map[key].push(v);
    });
    const sortedKeys = Object.keys(map).sort((a, b) => a.localeCompare(b));
    const obj = {};
    sortedKeys.forEach(k => obj[k] = map[k]);
    return obj;
  }, [voters]);

  // Surname keys list (memoized) and searchable in Marathi/English
  const surnameKeys = useMemo(() => Object.keys(surnameGroups), [surnameGroups]);

  // Debounce surname search input for performance
  useEffect(() => {
    const t = setTimeout(() => setSurnameSearchDebounced(surnameSearch), 250);
    return () => clearTimeout(t);
  }, [surnameSearch]);

  // Build a lightweight surname index from local voters (fast, runs from IndexedDB)
  const computeSurnameIndex = useCallback(async () => {
    setSurnameIndexLoading(true);
    try {
      const arr = await dbLocal.voters.toArray();
      const set = new Set();
      arr.forEach(v => {
        const key = (v.marathi_surname || v.english_surname || v.surname) || '';
        if (key && key.toString().trim() !== '') set.add(String(key).trim());
        else {
          const name = (v.name || '').toString().trim();
          if (name) {
            const tokens = name.split(' ').map(t => t.trim()).filter(Boolean);
            const candidate = tokens.length ? tokens[tokens.length - 1] : '';
            if (candidate) set.add(candidate);
          }
        }
      });

      const idx = Array.from(set).map(k => {
        let translit = '';
        try { translit = Sanscript.t(k, 'devanagari', 'itrans').toLowerCase(); } catch (e) { translit = ''; }
        return { key: k, low: k.toLowerCase(), translit };
      }).sort((a, b) => a.key.localeCompare(b.key));

      setSurnameIndex(idx);
    } catch (err) {
      console.warn('computeSurnameIndex failed', err);
      setSurnameIndex([]);
    } finally {
      setSurnameIndexLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeCategory?.id === 'surname') {
      computeSurnameIndex().catch(() => { });
    }
  }, [activeCategory, computeSurnameIndex, voters.length]);

  const filteredSurnameKeys = useMemo(() => {
    if (!surnameSearch || surnameSearch.trim() === '') return surnameKeys;
    const q = surnameSearch.trim().toLowerCase();
    return surnameKeys.filter(k => {
      if (!k) return false;
      const low = k.toLowerCase();
      if (low.includes(q)) return true;
      try {
        // transliterate Marathi to Latin and compare
        const translit = Sanscript.t(k, 'devanagari', 'itrans').toLowerCase();
        if (translit.includes(q)) return true;
        // transliterate query to devanagari
        const qToDeva = Sanscript.t(q, 'itrans', 'devanagari');
        if (k.includes(qToDeva)) return true;
      } catch (e) {
        // ignore transliteration errors
      }
      return false;
    });
  }, [surnameKeys, surnameSearch]);

  const surnameTotalPages = Math.max(1, Math.ceil(filteredSurnameKeys.length / surnamesPerPage));
  const currentSurnameKeys = useMemo(() => {
    const start = (surnamePage - 1) * surnamesPerPage;
    return filteredSurnameKeys.slice(start, start + surnamesPerPage);
  }, [filteredSurnameKeys, surnamePage]);

  const categoryCounts = useMemo(() => {
    return {
      booth: uniqueBooths.length,
      voted: voters.filter(v => v.hasVoted).length,
      notVoted: voters.filter(v => !v.hasVoted).length,
      withPhone: voters.filter(v => v.phone && v.phone.trim() !== '').length,
      withoutPhone: voters.filter(v => !v.phone || v.phone.trim() === '').length,
      male: voters.filter(v => v.gender === 'male').length,
      female: voters.filter(v => v.gender === 'female').length,
      surname: Object.keys(surnameGroups).filter(k => surnameGroups[k].length > 1).length,
      duplicates: 0,
      prabhag: uniquePrabhags.length,
      yadibhag: uniqueYadiBhags.length,
      caste: uniqueCastes.length,
      supporter: supportCounts.supporter,
      medium: supportCounts.medium,
      'not-supporter': supportCounts['not-supporter']
    };
  }, [voters, uniqueBooths, surnameGroups, uniquePrabhags, uniqueYadiBhags, uniqueCastes, supportCounts]);

  // Pagination - use searchFilteredVoters for display
  const totalPages = Math.max(1, Math.ceil(searchFilteredVoters.length / votersPerPage));
  const canGoNext = page < totalPages;
  const canGoPrev = page > 1;
  const pagedVoters = useMemo(() => {
    const start = (page - 1) * votersPerPage;
    return searchFilteredVoters.slice(start, start + votersPerPage);
  }, [searchFilteredVoters, page]);

  // Alphabet letters setup
  useEffect(() => {
    (async () => {
      try {
        const arr = await dbLocal.voters.toArray();
        const set = new Set();
        arr.forEach(v => {
          const devName = v.name || '';
          let latin = '';
          try {
            latin = Sanscript.t(devName, 'devanagari', 'itrans') || '';
          } catch (e) {
            latin = devName;
          }
          const first = (latin || '').replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || '#';
          set.add(first);
        });
        const letters = Array.from(set).sort();
        setAlphabetLetters(letters);
      } catch (err) {
        console.warn('alphabetLetters load failed:', err);
      }
    })();
  }, []);

  // ---------- Filter Functions ----------
  const getStaticByIds = useCallback(async (ids = []) => {
    if (!ids || ids.length === 0) return [];
    const upIds = ids.map(i => String(i).trim().toUpperCase());
    try {
      const res = await dbLocal.voters.where('voterId').anyOf(upIds).toArray();
      return res.map(normalizeRecord);
    } catch (err) {
      const all = await dbLocal.voters.toArray();
      return all.filter(a => upIds.includes(String(a.voterId).trim().toUpperCase())).map(normalizeRecord);
    }
  }, []);

  // Fixed Booth filter - properly merge all data sources
  const applyBoothFilter = useCallback(async (booth) => {
    setLoading(true);
    try {
      if (!booth) {
        setFilteredVoters(voters);
      } else {
        // Get static voters for this booth
        const matchedRaw = await dbLocal.voters.where('boothNumber').equals(String(booth)).toArray();

        // Get all surveys and dynamics for proper merging
        const surveys = await dbLocal.voter_surveys.toArray();
        const dynamics = await dbLocal.voters_dynamic.toArray();

        // Merge all data sources
        const merged = mergeStaticWithDynamic(matchedRaw, surveys, dynamics);
        setFilteredVoters(merged);
      }
      setSelectedBooth(booth || '');
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error('applyBoothFilter error:', err);
      // Fallback to client-side filtering
      const matched = voters.filter(v => v.boothNumber === booth);
      setFilteredVoters(matched);
    } finally {
      setLoading(false);
    }
  }, [voters]);

  // Fixed Prabhag filter - properly merge all data sources
  const applyPrabhagFilter = useCallback(async (prabhag) => {
    setLoading(true);
    try {
      if (!prabhag) {
        setFilteredVoters(voters);
      } else {
        // Get static voters for this prabhag
        const matchedRaw = await dbLocal.voters.where('prabhag').equals(String(prabhag)).toArray();

        // Get all surveys and dynamics for proper merging
        const surveys = await dbLocal.voter_surveys.toArray();
        const dynamics = await dbLocal.voters_dynamic.toArray();

        // Merge all data sources
        const merged = mergeStaticWithDynamic(matchedRaw, surveys, dynamics);
        setFilteredVoters(merged);
      }
      setSelectedPrabhag(prabhag || '');
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error('applyPrabhagFilter error:', err);
      // Fallback to client-side filtering
      const matched = voters.filter(v => v.prabhag === prabhag);
      setFilteredVoters(matched);
    } finally {
      setLoading(false);
    }
  }, [voters]);

  // Fixed Yadi Bhag Address filter
  const applyYadiBhagFilter = useCallback(async (yadiBhag) => {
    setLoading(true);
    try {
      if (!yadiBhag) {
        setFilteredVoters(voters);
      } else {
        const allVoters = await dbLocal.voters.toArray();
        const matched = allVoters.filter(v =>
          v.yadiBhagAddress && v.yadiBhagAddress.includes(yadiBhag)
        );
        const surveys = await dbLocal.voter_surveys.toArray();
        const dynamics = await dbLocal.voters_dynamic.toArray();
        const merged = mergeStaticWithDynamic(matched, surveys, dynamics);
        setFilteredVoters(merged);
      }
      setSelectedYadiBhag(yadiBhag || '');
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error('applyYadiBhagFilter error:', err);
      const matched = voters.filter(v => v.yadiBhagAddress && v.yadiBhagAddress.includes(yadiBhag));
      setFilteredVoters(matched);
    } finally {
      setLoading(false);
    }
  }, [voters]);

  // Fixed Phone filter - include both static and dynamic phone numbers
  const applyPhoneFilter = useCallback(async () => {
    setLoading(true);
    try {
      // Get all static voters with phone numbers
      const staticWithPhone = await dbLocal.voters.filter(v =>
        v.phone || v.whatsapp && String(v.phone).trim() !== ''
      ).toArray();

      // Get all survey records with phone numbers
      const surveysWithPhone = await dbLocal.voter_surveys.filter(s =>
        (s.phone && String(s.phone).trim() !== '') ||
        (s.whatsapp && String(s.whatsapp).trim() !== '')
      ).toArray();

      // Get all dynamic data
      const dynamics = await dbLocal.voters_dynamic.toArray();

      // Combine static voters with phone and survey records
      const allVoterIds = new Set();

      // Add static voters with phones
      staticWithPhone.forEach(v => allVoterIds.add(String(v.voterId).trim().toUpperCase()));

      // Add survey voters with phones
      surveysWithPhone.forEach(s => allVoterIds.add(String(s.voterId).trim().toUpperCase()));

      // Get complete records for all voters with phones
      const voterIdsArray = Array.from(allVoterIds);
      const completeRecords = await getStaticByIds(voterIdsArray);

      // Merge with surveys and dynamics
      const merged = mergeStaticWithDynamic(completeRecords, surveysWithPhone, dynamics);

      setFilteredVoters(merged);
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error('applyPhoneFilter error:', err);
      // Fallback to client-side filtering - include both static and dynamic phones
      const withPhone = voters.filter(v => v.phone && v.phone.trim() !== '');
      setFilteredVoters(withPhone);
    } finally {
      setLoading(false);
    }
  }, [getStaticByIds, voters]);

  // Voted filter (optimized)
  const applyVotedFilter = useCallback(async () => {
    console.log("🚀 Running View Voted Voters Filter...");
    setLoading(true);
    try {
      let dynamicRecords = [];

      try {
        const snap = await getDocs(collection(db, "voters_dynamic"));
        dynamicRecords = snap.docs.map((doc) => {
          const d = doc.data() || {};
          return {
            voterId: String(d.voterId || d.VoterId || doc.id || "").trim().toUpperCase(),
            hasVoted: !!d.hasVoted,
            updatedAt: d.updatedAt || Date.now(),
          };
        });

        console.log("📥 Firestore fetched:", dynamicRecords.length);
        await dbLocal.voters_dynamic.bulkPut(dynamicRecords);
      } catch (fireErr) {
        console.warn("⚠️ Firestore unreachable, using local cache:", fireErr);
        dynamicRecords = await dbLocal.voters_dynamic.toArray();
      }

      const votedDynamics = dynamicRecords.filter((d) => d.hasVoted === true);
      console.log("✅ Found votedDynamics:", votedDynamics.length);

      if (votedDynamics.length === 0) {
        setFilteredVoters([]);
        setPage(1);
        return;
      }

      const votedIds = votedDynamics.map((v) => v.voterId).filter(Boolean);
      const staticRecords = await dbLocal.voters
        .where("voterId")
        .anyOf(votedIds)
        .toArray();

      const dynamicMap = new Map(votedDynamics.map((d) => [d.voterId, d]));
      const merged = staticRecords.map((v) => {
        const dyn = dynamicMap.get(String(v.voterId).toUpperCase()) || {};
        return normalizeRecord({ ...v, ...dyn });
      });

      setFilteredVoters(merged);
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error("❌ applyVotedFilter failed:", err);
      // Fallback to client-side filtering
      const voted = voters.filter(v => v.hasVoted);
      setFilteredVoters(voted);
    } finally {
      setLoading(false);
    }
  }, [voters]);

  // Other filter functions
  const applyGenderFilter = useCallback(async (gender) => {
    setLoading(true);
    try {
      const matchedRaw = await dbLocal.voters.filter(v => {
        const gg = normalizeGender(v.gender || v.Gender || '');
        return gg === gender;
      }).toArray();
      const surveys = await dbLocal.voter_surveys.toArray();
      const dynamics = await dbLocal.voters_dynamic.toArray();
      const merged = mergeStaticWithDynamic(matchedRaw, surveys, dynamics);
      setFilteredVoters(merged);
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error('applyGenderFilter error:', err);
      const matched = voters.filter(v => normalizeGender(v.gender) === gender);
      setFilteredVoters(matched);
    } finally {
      setLoading(false);
    }
  }, [voters]);

  const applySurnameList = useCallback(async (surname) => {
    setLoading(true);
    try {
      if (!surname) {
        setFilteredVoters([]);
      } else {
        const all = await dbLocal.voters.toArray();
        // Match by explicit surname field, first token, last token, or transliteration
        const matched = all.filter(v => {
          const name = (v.name || '').toString().trim();
          const tokens = name.split(' ').filter(Boolean);
          const firstToken = tokens[0] || '';
          const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : '';
          const explicit = (v.surname || '').toString().trim();
          if (!surname) return false;
          const sLow = surname.toString().trim().toLowerCase();
          if (explicit && explicit.toLowerCase() === sLow) return true;
          if (firstToken && firstToken.toLowerCase() === sLow) return true;
          if (lastToken && lastToken.toLowerCase() === sLow) return true;
          // Try transliteration comparisons (Marathi <> Latin)
          try {
            const latin = Sanscript.t(name || '', 'devanagari', 'itrans').toLowerCase();
            if (latin.includes(sLow)) return true;
            const sToDeva = Sanscript.t(sLow, 'itrans', 'devanagari');
            if (name.includes(sToDeva)) return true;
          } catch (e) {
            // ignore transliteration errors
          }
          return false;
        });
        const surveys = await dbLocal.voter_surveys.toArray();
        const dynamics = await dbLocal.voters_dynamic.toArray();
        const merged = mergeStaticWithDynamic(matched, surveys, dynamics);
        setFilteredVoters(merged);
      }
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error('applySurnameList error:', err);
      const matched = voters.filter(v => v.surname === surname);
      setFilteredVoters(matched);
    } finally {
      setLoading(false);
    }
  }, [voters]);

  const applyDuplicatesFilter = useCallback(async (mode = 'name') => {
    setLoading(true);
    try {
      const all = await dbLocal.voters.toArray();
      const map = new Map();
      const dupes = [];
      all.forEach(v => {
        const key = (mode === 'voterId') ? String(v.voterId).trim().toUpperCase() : String(v.name || '').toLowerCase().trim();
        if (!key) return;
        if (map.has(key)) {
          const prev = map.get(key);
          if (Array.isArray(prev)) prev.push(v);
          else map.set(key, [prev, v]);
        } else map.set(key, v);
      });
      for (const val of map.values()) {
        if (Array.isArray(val) && val.length > 1) val.forEach(item => dupes.push(item));
      }
      const surveys = await dbLocal.voter_surveys.toArray();
      const dynamics = await dbLocal.voters_dynamic.toArray();
      const merged = mergeStaticWithDynamic(dupes, surveys, dynamics);
      setFilteredVoters(merged);
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error('applyDuplicatesFilter error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyAgeFilter = useCallback(async (groupId = '') => {
    setLoading(true);
    try {
      const dyn = await dbLocal.voters_dynamic.toArray();
      const dynMap = new Map(dyn.map(d => [String(d.voterId).trim().toUpperCase(), d]));
      const staticArr = await dbLocal.voters.toArray();
      const surveys = await dbLocal.voter_surveys.toArray();
      const merged = staticArr.map(s => normalizeRecord({ ...s, ...(dynMap.get(String(s.voterId).trim().toUpperCase()) || {}) }));

      if (!groupId) setFilteredVoters(merged);
      else {
        const g = ageGroups.find(x => x.id === groupId);
        if (g) setFilteredVoters(merged.filter(m => m.age >= g.min && m.age <= g.max));
        else if (groupId.endsWith('+')) {
          const min = parseInt(groupId.replace('+', ''), 10) || 60;
          setFilteredVoters(merged.filter(m => m.age >= min));
        } else setFilteredVoters(merged);
      }
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error('applyAgeFilter error:', err);
      // Fallback to client-side filtering
      if (groupId) {
        const g = ageGroups.find(x => x.id === groupId);
        if (g) {
          const matched = voters.filter(v => v.age >= g.min && v.age <= g.max);
          setFilteredVoters(matched);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [voters]);

  const applyAlphabetFilter = useCallback(async (letter = '') => {
    setLoading(true);
    try {
      const all = await dbLocal.voters.toArray();
      const mapped = all.map(v => {
        const devName = v.name || '';
        let latin = '';
        try {
          latin = Sanscript.t(devName, 'devanagari', 'itrans') || '';
        } catch (e) {
          latin = devName;
        }
        const first = (latin || '').replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase() || '#';
        return { ...v, __latinFirst: first || '#' };
      });

      const groups = {};
      mapped.forEach(v => {
        const key = v.__latinFirst || '#';
        if (!groups[key]) groups[key] = [];
        groups[key].push(v);
      });

      const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));

      if (!letter) {
        const groupedList = sortedKeys.flatMap(key => {
          return [
            { __isHeader: true, header: key },
            ...groups[key].map(normalizeRecord)
          ];
        });
        setFilteredVoters(groupedList);
      } else {
        const matched = (groups[letter] || []).map(normalizeRecord);
        setFilteredVoters(matched);
      }
      setPage(1);
      setSearchTerm(''); // Clear search when changing filter
    } catch (err) {
      console.error('applyAlphabetFilter error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // New filter handlers
  const applyCasteFilter = useCallback(async (caste) => {
    setLoading(true);
    try {
      if (!caste) {
        setFilteredVoters(voters);
      } else {
        // Query surveys by caste and then fetch static voters
        let surveys = [];
        try {
          surveys = await dbLocal.voter_surveys.where('caste').equals(String(caste)).toArray();
        } catch (e) {
          // fallback scan
          const all = await dbLocal.voter_surveys.toArray();
          surveys = all.filter(s => (s.caste || '').toString().toLowerCase() === String(caste).toLowerCase());
        }

        const ids = surveys.map(s => String(s.voterId || s.id || '').trim().toUpperCase()).filter(Boolean);
        const staticRecords = await getStaticByIds(ids);
        const dynamics = await dbLocal.voters_dynamic.toArray();
        const merged = mergeStaticWithDynamic(staticRecords, surveys, dynamics);
        setFilteredVoters(merged);
      }
      setSelectedCaste(caste || '');
      setPage(1);
      setSearchTerm('');
    } catch (err) {
      console.error('applyCasteFilter error:', err);
      const matched = voters.filter(v => (v.caste || '').toLowerCase() === (caste || '').toLowerCase());
      setFilteredVoters(matched);
    } finally {
      setLoading(false);
    }
  }, [voters, getStaticByIds]);

  const applySupportFilter = useCallback(async (supportKey) => {
    setLoading(true);
    try {
      if (!supportKey) {
        setFilteredVoters(voters);
      } else {
        // Look in voter_surveys + voters_dynamic
        const surveys = await dbLocal.voter_surveys.where('supportStatus').equals(String(supportKey)).toArray().catch(() => []);
        const dynamics = await dbLocal.voters_dynamic.where('supportStatus').equals(String(supportKey)).toArray().catch(() => []);
        const allIds = new Set();
        surveys.forEach(s => allIds.add(String(s.voterId || s.id || '').trim().toUpperCase()));
        dynamics.forEach(d => allIds.add(String(d.voterId || d.id || '').trim().toUpperCase()));
        const ids = Array.from(allIds);
        if (ids.length === 0) {
          setFilteredVoters([]);
        } else {
          const staticRecords = await getStaticByIds(ids);
          const merged = mergeStaticWithDynamic(staticRecords, surveys, dynamics);
          setFilteredVoters(merged);
        }
      }
      setSelectedSupport(supportKey || '');
      setPage(1);
      setSearchTerm('');
    } catch (err) {
      console.error('applySupportFilter error:', err);
      const matched = voters.filter(v => (v.supportStatus || '').toLowerCase() === (supportKey || '').toLowerCase());
      setFilteredVoters(matched);
    } finally {
      setLoading(false);
    }
  }, [voters, getStaticByIds]);

  const handlePrabhagSelect = useCallback((prabhag) => {
    setSelectedPrabhag(prabhag);
    applyPrabhagFilter(prabhag);
  }, [applyPrabhagFilter]);

  const handleYadiBhagSelect = useCallback((yadiBhag) => {
    setSelectedYadiBhag(yadiBhag);
    applyYadiBhagFilter(yadiBhag);
  }, [applyYadiBhagFilter]);

  // Category handler with new filters
  const handleCategorySelect = useCallback((category) => {
    setActiveCategory(category);
    setSelectedBooth('');
    setSelectedAgeGroup('');
    setSelectedSurname('');
    setSelectedPrabhag('');
    setSelectedYadiBhag('');
    setSelectedCaste('');
    setSelectedSupport('');
    setPage(1);
    setSearchTerm(''); // Clear search when changing category

    if (['booth', 'age', 'surname', 'alphabet', 'prabhag', 'yadibhag', 'caste', 'support'].includes(category.id)) {
      setFilteredVoters([]);
    } else {
      switch (category.id) {
        case 'voted': applyVotedFilter(); break;
        case 'withPhone': applyPhoneFilter(); break;
        case 'male': applyGenderFilter('male'); break;
        case 'female': applyGenderFilter('female'); break;
        case 'duplicates': applyDuplicatesFilter('name'); break;
        default: setFilteredVoters(voters); break;
      }
    }
  }, [applyVotedFilter, applyPhoneFilter, applyGenderFilter, applyDuplicatesFilter, voters]);

  // Existing handlers
  const handleAgeGroupSelect = useCallback((gId) => { setSelectedAgeGroup(gId); applyAgeFilter(gId); }, [applyAgeFilter]);
  const handleBoothSelect = useCallback((b) => { setSelectedBooth(b); applyBoothFilter(b); }, [applyBoothFilter]);
  const handleSurnameSelect = useCallback((s) => { setSelectedSurname(s); applySurnameList(s); }, [applySurnameList]);
  const handleCasteSelect = useCallback((caste) => { setSelectedCaste(caste); applyCasteFilter(caste); }, [applyCasteFilter]);
  const handleSupportSelect = useCallback((support) => { setSelectedSupport(support); applySupportFilter(support); }, [applySupportFilter]);
  const handleAlphabetSelect = useCallback((letter) => { applyAlphabetFilter(letter); }, [applyAlphabetFilter]);

  // Bulk actions for a surname group (export, open bulk survey UI placeholder)
  const exportSurnameList = useCallback(async (surname) => {
    try {
      const group = surnameGroups[surname] || [];
      if (!group || group.length === 0) {
        alert('No records to export for ' + surname);
        return;
      }
      const surveys = await dbLocal.voter_surveys.toArray();
      const dynamics = await dbLocal.voters_dynamic.toArray();
      const surveyMap = new Map(surveys.map(s => [String((s.voterId || '')).trim().toUpperCase(), s]));
      const dynMap = new Map(dynamics.map(d => [String((d.voterId || '')).trim().toUpperCase(), d]));
      const exportData = group.map(v => {
        const vid = String(v.voterId || v.id || '').trim().toUpperCase();
        const s = surveyMap.get(vid) || {};
        const d = dynMap.get(vid) || {};
        return normalizeRecord({ ...v, ...s, ...d });
      }).map(v => ({
        'Voter ID': v.voterId,
        'Name': v.name,
        'Surname': v.surname,
        'Age': v.age,
        'Gender': v.gender,
        'Booth': v.boothNumber,
        'Phone': v.phone,
        'Voted': v.hasVoted ? 'Yes' : 'No',
        'Caste': v.caste || '',
        'Support Status': v.supportStatus || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Surname');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `Surname_${surname}_${Date.now()}.xlsx`);
    } catch (err) {
      console.error('exportSurnameList error:', err);
      alert('Export failed');
    }
  }, [surnameGroups]);

  // Fixed Export function with consistent format and new password
  const handleExportExcel = useCallback(async () => {
    const dataToExport = searchTerm ? searchFilteredVoters : filteredVoters;
    if (!dataToExport || dataToExport.length === 0) {
      alert('No data to export.');
      return;
    }

    // Use the new password
    const password = prompt('Enter password to export data:');
    if (password !== 'Jannetaa9881') {
      alert('Incorrect password!');
      return;
    }

    // Consistent export format with all available fields
    const exportData = dataToExport.map(v => ({
      'Voter ID': v.voterId || '',
      'Name': v.name || '',
      'Surname': v.surname || '',
      'Serial Number': v.serialNumber || '',
      'Age': v.age || '',
      'Gender': v.gender || '',
      'Booth Number': v.boothNumber || '',
      'Prabhag': v.prabhag || '',
      'Polling Station': v.pollingStationAddress || '',
      'Yadi Bhag Address': v.yadiBhagAddress || '',
      'Village': v.village || '',
      'Father Name': v.fatherName || '',
      'Phone': v.phone || '',
      'Caste': v.caste || '',
      'Support Status': v.supportStatus || '',
      'Voted': v.hasVoted ? 'Yes' : 'No',
      'Last Updated': v.lastUpdated ? new Date(v.lastUpdated).toLocaleDateString() : ''
    }));

    try {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Voters');

      // Auto-size columns for better readability
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, ...exportData.map(row => String(row[key] || '').length))
      }));
      ws['!cols'] = colWidths;

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const fileName = `VoterData_${activeCategory?.title || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);

      alert(`Successfully exported ${exportData.length} voters to ${fileName}`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    }
  }, [filteredVoters, searchFilteredVoters, searchTerm, activeCategory]);

  // Quick search suggestions
  const quickSearchSuggestions = useMemo(() => {
    const suggestions = new Set();

    // Add some common booth numbers
    uniqueBooths.slice(0, 5).forEach(booth => {
      suggestions.add(`Booth ${booth}`);
    });

    // Add some common prabhags
    uniquePrabhags.slice(0, 5).forEach(prabhag => {
      suggestions.add(`Ward ${prabhag}`);
    });

    // Add some common surnames from the data
    Object.keys(surnameGroups).slice(0, 5).forEach(surname => {
      if (surname !== 'Unknown') {
        suggestions.add(surname);
      }
    });

    // Add some common castes
    uniqueCastes.slice(0, 5).forEach(caste => {
      if (caste) suggestions.add(caste);
    });

    return Array.from(suggestions);
  }, [uniqueBooths, uniquePrabhags, surnameGroups, uniqueCastes]);

  // Data loading status
  const dataStatus = useMemo(() => {
    if (initialLoad) return 'Loading...';
    if (voters.length === 0) return 'No data loaded';
    return `${voters.length} voters loaded`;
  }, [voters.length, initialLoad]);

  // Render
  if (loading && initialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading voter data...</p>
          <p className="text-gray-500 text-xs mt-1">This may take a moment for first-time setup</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`${activeCategory?.id === 'surname' ? 'max-w-4xl' : 'max-w-md'} mx-auto p-3`}>
        {/* Data Status Indicator */}

        <div className="flex mb-3 items-center gap-3">
          <Link to="/">
            <button
              className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-all"
            >
              <FiArrowLeft className="text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              <TranslatedText>Filter Page</TranslatedText>
            </h1>
            <p className="text-gray-500 text-sm">
              <TranslatedText>Find All Filter Data</TranslatedText>
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Data Status:</span>
            <span className={`text-sm font-medium ${voters.length > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              {dataStatus}
            </span>
          </div>
        </div>

        {!activeCategory ? (
          <div className="space-y-2">
            {categories.map((category) => {
              const IconComponent = category.icon;
              const count = categoryCounts[category.id] || 0;
              return (
                <div
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="bg-white p-3 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`${category.color} w-8 h-8 rounded-lg flex items-center justify-center`}>
                      <IconComponent className="text-white text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm">
                        <TranslatedText>{category.title}</TranslatedText>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {category.description}
                      </div>
                    </div>
                  </div>
                  {count > 0 && (
                    <div className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      {count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => {
                      setActiveCategory(null);
                      setSelectedBooth('');
                      setSelectedSurname('');
                      setSelectedPrabhag('');
                      setSelectedYadiBhag('');
                      setSelectedCaste('');
                      setSelectedSupport('');
                      setFilteredVoters(voters);
                      setSearchTerm('');
                      setPage(1);
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <FiChevronRight className="text-gray-600 text-lg transform rotate-180" />
                  </button>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-sm">
                      <TranslatedText>{activeCategory.title}</TranslatedText>
                    </h3>
                    <p className="text-xs text-gray-500">
                      <TranslatedText>{activeCategory.description}</TranslatedText>
                      {searchFilteredVoters.length > 0 && (
                        <span> • {searchFilteredVoters.length} <TranslatedText>voters found</TranslatedText></span>
                      )}
                    </p>
                  </div>
                </div>
                {searchFilteredVoters.length > 0 && (
                  <button onClick={handleExportExcel} className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-1 ml-2">
                    <FiDownload className="text-xs" /><span>Export</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search Bar - Always show when in a category */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <SearchBar
                placeholder="Search by name, voter ID, booth, address... (English/Marathi)"
                onSearch={handleSearch}
                initialValue={searchTerm}
                quickFilters={quickSearchSuggestions}
                size="medium"
                showClearButton={true}
                showFiltersButton={false}
                className="w-full"
              />
              {searchTerm && (
                <div className="text-xs text-gray-500 mt-2 px-1">
                  Found {searchFilteredVoters.length} voters matching "{searchTerm}"
                </div>
              )}
            </div>

            {/* Selection screens for new filters */}
            {activeCategory.id === 'prabhag' && !selectedPrabhag && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 px-1">Select Ward:</h4>
                <div className="flex flex-col gap-2">
                  {uniquePrabhags.map((prabhag) => {
                    const prabhagVotersCount = voters.filter(v => v.prabhag === prabhag).length;
                    const votedCount = voters.filter(v => v.prabhag === prabhag && v.hasVoted).length;
                    return (
                      <button key={prabhag} onClick={() => handlePrabhagSelect(prabhag)}
                        className="bg-white p-3 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors text-left">
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm">Ward {prabhag}</div>
                            <div className="text-xs text-gray-500">{prabhagVotersCount} voters • {votedCount} voted</div>
                          </div>
                          <FiChevronRight className="text-gray-400 text-sm flex-shrink-0 ml-2" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeCategory.id === 'caste' && !selectedCaste && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 px-1">Select Caste</h4>
                <div className="space-y-2">
                  {uniqueCastes.map(caste => {
                    const count = casteCounts[caste] || 0;
                    const votedCount = voters.filter(v => v.caste === caste && v.hasVoted).length;
                    return (
                      <button key={caste} onClick={() => handleCasteSelect(caste)} 
                        className="w-full bg-white p-3 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors text-left">
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm"><TranslatedText>{caste}</TranslatedText></div>
                            <div className="text-xs text-gray-500"><TranslatedText>Total : {count}</TranslatedText></div>
                          </div>
                          <FiChevronRight className="text-gray-400 text-sm flex-shrink-0 ml-2" />
                        </div>
                      </button>
                    );
                  })}
                  {uniqueCastes.length === 0 && (
                    <div className="text-center py-4">
                      <div className="text-gray-300 text-3xl mb-2">📊</div>
                      <p className="text-gray-500 text-sm">No caste data available</p>
                      <p className="text-gray-400 text-xs mt-1">Add caste information in voter surveys</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeCategory.id === 'support' && !selectedSupport && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 px-1">Support Level</h4>
                <div className="grid grid-cols-2 gap-2">
                  {supportOptions.map(option => {
                    const IconComponent = option.icon;
                    const count = supportCounts[option.id] || 0;
                    const votedCount = voters.filter(v => v.supportStatus === option.id && v.hasVoted).length;
                    return (
                      <button key={option.id} onClick={() => handleSupportSelect(option.id)} 
                        className="w-full bg-white p-3 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors text-center">
                        <div className={`${option.color} w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                          <IconComponent className="text-white text-sm" />
                        </div>
                        <div className="font-medium text-gray-800 text-sm capitalize"><TranslatedText>{option.label}</TranslatedText></div>
                        <div className="text-xs text-gray-500"><TranslatedText>Total: {count}</TranslatedText></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeCategory.id === 'yadibhag' && !selectedYadiBhag && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 px-1">Select Yadi Bhag Address:</h4>
                <div className="space-y-2">
                  {uniqueYadiBhags.map((yadiBhag) => {
                    const yadiVotersCount = voters.filter(v => v.yadiBhagAddress === yadiBhag).length;
                    const votedCount = voters.filter(v => v.yadiBhagAddress === yadiBhag && v.hasVoted).length;
                    return (
                      <button key={yadiBhag} onClick={() => handleYadiBhagSelect(yadiBhag)}
                        className="w-full bg-white p-3 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors text-left">
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm truncate"><TranslatedText>{yadiBhag}</TranslatedText></div>
                            <div className="text-xs text-gray-500"><TranslatedText>Total: {yadiVotersCount}</TranslatedText></div>
                          </div>
                          <FiChevronRight className="text-gray-400 text-sm flex-shrink-0 ml-2" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing selection screens (booth, age, surname, alphabet) */}
            {activeCategory.id === 'booth' && !selectedBooth && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 px-1">Select Booth:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {uniqueBooths.map((booth) => {
                    const boothVotersCount = voters.filter(v => v.boothNumber === booth).length;
                    const votedCount = voters.filter(v => v.boothNumber === booth && v.hasVoted).length;
                    return (
                      <button key={booth} onClick={() => handleBoothSelect(booth)}
                        className="bg-white p-3 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors text-center">
                        <div className="font-medium text-gray-800 text-sm">Booth {booth}</div>
                        <div className="text-xs text-gray-500">{boothVotersCount} voters</div>
                        <div className="text-xs text-green-500">{votedCount} voted</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeCategory.id === 'age' && !selectedAgeGroup && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 px-1"><TranslatedText>Choose Age Group</TranslatedText></h4>
                <div className="grid grid-cols-2 gap-2">
                  {ageGroups.map(group => {
                    const groupVotersCount = voters.filter(v => v.age >= group.min && v.age <= group.max).length;
                    const votedCount = voters.filter(v => v.age >= group.min && v.age <= group.max && v.hasVoted).length;
                    return (
                      <button key={group.id} onClick={() => handleAgeGroupSelect(group.id)}
                        className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors text-center">
                        <div className="font-medium text-gray-800 text-sm"><TranslatedText>{group.label}</TranslatedText></div>
                        <div className="text-xs text-gray-500"><TranslatedText>Total: {groupVotersCount}</TranslatedText></div>
                        <div className="text-xs text-green-500"><TranslatedText>{votedCount} voted</TranslatedText></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeCategory.id === 'surname' && !selectedSurname && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 px-1"><TranslatedText>Choose Surname</TranslatedText></h4>
                <div className="space-y-2">
                  {/* Surname search input */}
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input type="text" value={surnameSearch} onChange={(e) => { setSurnameSearch(e.target.value); setSurnamePage(1); }}
                      placeholder="Search surname (English/Marathi)" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>

                  {/* Surname list (paginated) */}
                  <div className="space-y-2 h-auto overflow-y-auto">
                    {currentSurnameKeys.map((surname) => {
                      const surnameVoters = surnameGroups[surname] || [];
                      const votedCount = surnameVoters.filter(v => v.hasVoted).length;
                      return (
                        <div key={surname} className="w-full bg-white p-3 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors flex items-center justify-between">
                          <button onClick={() => handleSurnameSelect(surname)} className="text-left flex-1">
                            <div className="font-medium text-gray-800 text-sm">{surname === 'Unknown' ? 'Unknown Surname' : surname}</div>
                            <div className="text-xs text-gray-500"><TranslatedText>Total: {surnameVoters.length} | </TranslatedText> <TranslatedText>{votedCount} voted</TranslatedText></div>
                          </button>
                          <div className="flex items-center gap-2 ml-3">
                            <button onClick={() => { const group = surnameGroups[surname] || []; setBulkModalSurname(surname); setBulkModalVoters(group); setBulkModalOpen(true); }} className="p-2 text-gray-500 hover:text-gray-800">
                              <FiMoreVertical />
                            </button>
                            <FiChevronRight className="text-gray-400 text-sm" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Surname pagination controls */}
                  {surnameTotalPages > 1 && (
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 mt-2">
                      <button onClick={() => setSurnamePage(p => Math.max(1, p - 1))} disabled={surnamePage === 1}
                        className={`px-3 py-1 rounded text-sm ${surnamePage === 1 ? 'bg-gray-50 text-gray-400' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        ← Prev
                      </button>
                      <div className="text-sm text-gray-600">Page {surnamePage} of {surnameTotalPages}</div>
                      <button onClick={() => setSurnamePage(p => Math.min(surnameTotalPages, p + 1))} disabled={surnamePage === surnameTotalPages}
                        className={`px-3 py-1 rounded text-sm ${surnamePage === surnameTotalPages ? 'bg-gray-50 text-gray-400' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeCategory.id === 'alphabet' && !selectedSupport && !selectedCaste && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 px-1">Alphabet groups (A → Z)</h4>
                <div className="flex flex-wrap gap-2">
                  {alphabetLetters.map(letter => (
                    <button key={letter} onClick={() => handleAlphabetSelect(letter)}
                      className="text-sm bg-white p-3 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors text-center min-w-12">
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voter list - Show when we have selected filters or direct categories */}
            {(selectedBooth || selectedAgeGroup || selectedSurname || selectedPrabhag || selectedYadiBhag || selectedCaste || selectedSupport ||
              (activeCategory.id && !['booth', 'age', 'surname', 'alphabet', 'prabhag', 'yadibhag', 'caste', 'support'].includes(activeCategory.id)) ||
              (activeCategory.id === 'alphabet' && filteredVoters.length > 0)) && (
                <>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Loading voters...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-gray-800 text-sm">
                            Voters List {searchFilteredVoters.length > 0 && `(${searchFilteredVoters.length} found)`}
                          </h4>
                          {searchFilteredVoters.length > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              Page {page} of {totalPages}
                            </span>
                          )}
                        </div>
                        <VoterList voters={pagedVoters} loading={loading} />
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                          <button onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={!canGoPrev}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${canGoPrev ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                            Previous
                          </button>
                          <span className="text-sm text-gray-600 font-medium">Page {page} of {totalPages}</span>
                          <button onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} disabled={!canGoNext}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${canGoNext ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

            {searchFilteredVoters.length === 0 && !loading && !['surname', 'alphabet', 'prabhag', 'yadibhag', 'caste', 'support'].includes(activeCategory.id) && (
              <div className="text-center py-8">
                <div className="text-gray-300 text-4xl mb-2">📝</div>
                <p className="text-gray-500 text-sm">No voters found {searchTerm ? `matching "${searchTerm}"` : 'in this category'}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {searchTerm ? 'Try a different search term' : 'Try selecting a different category'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Bulk modal for surname actions (replaced by BulkSurveyModal) */}
      {bulkModalOpen && bulkModalSurname && (
        <BulkSurveyModal
          open={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          surname={bulkModalSurname}
          voters={bulkModalVoters}
          onSaved={async () => {
            setBulkModalOpen(false);
            // After saving, refresh merged data
            await fetchAndStoreDynamic();
            await refreshMerged();
          }}
        />
      )}
    </div>
  );
};

export default FilterPage;