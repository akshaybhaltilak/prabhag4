import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../Firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import VoterSurvey from './VoterSurvey';
import FamilyManagement from './FamilyManagement';
import BluetoothPrinter from './BluetoothPrinter';

import {
  FiArrowLeft,
  FiUser,
  FiUsers,
  FiClipboard,
} from 'react-icons/fi';

import TranslatedText from './TranslatedText';
import { VoterContext } from '../Context/VoterContext';
import { useCandidate } from '../Context/CandidateContext';

import { dbLocal } from '../libs/localdb';

const FullVoterDetails = () => {
  const { voterId } = useParams();
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);

  const { voters, initialized, loading: contextLoading } =
    useContext(VoterContext);
  const { candidateInfo } = useCandidate();

  const [voter, setVoter] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔵 voter_surveys dynamic state
  const [surveyDynamic, setSurveyDynamic] = useState({
    whatsapp: '',
    caste: '',
    supportStatus: 'unknown',
    hasVoted: false,
  });

  /* --------------------------------------------------
     LOAD STATIC DATA (ONLY voter.json via context)
  -------------------------------------------------- */
  const loadStaticVoter = useCallback(() => {
    if (!initialized || !voters?.length) return null;
    const found = voters.find(v => v.id === voterId);
    if (!found) return null;
    const staticVoter = { id: voterId, ...found };
    setVoter(staticVoter);
    return staticVoter;
  }, [initialized, voters, voterId]);

  /* --------------------------------------------------
     LOAD voter_surveys (IndexedDB → Firestore)
  -------------------------------------------------- */
  const loadSurveyDynamic = useCallback(async () => {
    try {
      // IndexedDB first
      const local = await dbLocal.voter_surveys.get(voterId);
      if (local) {
        setSurveyDynamic(prev => ({ ...prev, ...local }));
      }

      // Firestore
      const ref = doc(db, 'voter_surveys', voterId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setSurveyDynamic(prev => ({ ...prev, ...data }));
        await dbLocal.voter_surveys.put({ voterId, ...data });
      }
    } catch (err) {
      console.warn('Failed to load voter_surveys', err);
    }
  }, [voterId]);

  /* --------------------------------------------------
     SAVE voter_surveys (checkbox + dropdown)
  -------------------------------------------------- */
  const saveSurveyDynamic = useCallback(
    async (field, value) => {
      const payload = {
        ...surveyDynamic,
        [field]: value,
        updatedAt: Date.now(),
      };

      setSurveyDynamic(payload);

      try {
        const ref = doc(db, 'voter_surveys', voterId);
        await setDoc(ref, payload, { merge: true });
        await dbLocal.voter_surveys.put({ voterId, ...payload });
      } catch {
        await dbLocal.voter_surveys.put({ voterId, ...payload });
        alert('Saved offline — will sync automatically');
      }
    },
    [surveyDynamic, voterId]
  );

  /* --------------------------------------------------
     INITIAL LOAD
  -------------------------------------------------- */
  useEffect(() => {
    if (!initialized) return;
    const staticVoter = loadStaticVoter();
    if (staticVoter) {
      loadSurveyDynamic();
    }
  }, [initialized, loadStaticVoter, loadSurveyDynamic]);

  /* --------------------------------------------------
     LOADERS
  -------------------------------------------------- */
  if (contextLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!voter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <button
          onClick={() => navigate('/')}
          className="bg-orange-500 text-white px-5 py-2 rounded-lg"
        >
          Back
        </button>
      </div>
    );
  }

  // 📌 WhatsApp resolution logic
  const whatsappNumber =
    voter.whatsapp || surveyDynamic.whatsapp || voter.phone || 'Not available';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            >
              <FiArrowLeft className="text-lg" />
            </button>

            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'details', icon: FiUser, label: 'Details' },
                { id: 'family', icon: FiUsers, label: 'Family' },
                { id: 'survey', icon: FiClipboard, label: 'Survey' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <tab.icon className="text-sm" />
                  <span>
                    <TranslatedText>{tab.label}</TranslatedText>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Candidate Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5 text-center">
            <div className="text-sm font-semibold opacity-90 mb-1">
              <TranslatedText>{candidateInfo.party}</TranslatedText>
            </div>
            <div className="text-xl font-bold mb-1">
              <TranslatedText>{candidateInfo.name}</TranslatedText>
            </div>
            <div className="text-xs opacity-80">
              <TranslatedText>{candidateInfo.area}</TranslatedText>
            </div>
          </div>

          <div className="p-5">
            {/* DETAILS TAB */}
            {activeTab === 'details' && (
              <>
                <div className='text-center mb-4'>
                  <h3 className='text-xl font-semibold text-gray-700'>{voter.name}</h3>
                  <h3 className='text-md font-semibold text-gray-700'>{voter.voterNameEng}</h3>
                </div>
                <DetailRow label="Voter ID" value={voter.voterId} />
                <DetailRow label="Serial Number" value={voter.serialNumber} />
                <DetailRow label="Booth Number" value={voter.boothNumber} />
                <DetailRow
                  label="Age & Gender"
                  value={`${voter.age} | ${voter.gender}`}
                />
                <DetailRow label="WhatsApp Number" value={whatsappNumber} />
                <DetailRow
                  label="Caste"
                  value={<TranslatedText>{surveyDynamic.caste || 'Not attatched'}</TranslatedText>}
                />
                <DetailRow
                  label="Support Status"
                  value={<TranslatedText>{surveyDynamic.supportStatus || 'Not attatched'}</TranslatedText>}
                />
                <DetailRow
                  label="Voted"
                  value={<TranslatedText>{surveyDynamic.hasVoted ? 'Yes' : 'No'}</TranslatedText>}
                />
                <DetailRow
                  label="Polling Station Address"
                  value={voter.pollingStationAddress}
                  isFullWidth
                />
                <DetailRow
                  label="Yaadi Bhag / Address"
                  value={voter.yadiBhagAddress}
                  isFullWidth
                />

                {/* CONTROLS */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200 mt-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!surveyDynamic.hasVoted}
                      onChange={e =>
                        saveSurveyDynamic('hasVoted', e.target.checked)
                      }
                    />
                    <span className="text-sm font-medium text-gray-700">
                      <TranslatedText>{surveyDynamic.hasVoted ? 'Voted ✓' : 'Mark as Voted'}</TranslatedText>
                    </span>
                  </label>

                  <select
                    value={surveyDynamic.supportStatus}
                    onChange={e =>
                      saveSurveyDynamic('supportStatus', e.target.value)
                    }
                    className="text-sm font-medium rounded-full px-4 py-2 border shadow-sm"
                  >
                    <option value="unknown"><TranslatedText>Support Level</TranslatedText></option>
                    <option value="supporter"><TranslatedText>Strong</TranslatedText></option>
                    <option value="medium"><TranslatedText>Medium</TranslatedText></option>
                    <option value="not-supporter"><TranslatedText>Not</TranslatedText></option>
                  </select>
                </div>

                <BluetoothPrinter
                  voter={voter}
                  familyMembers={familyMembers}
                  candidateInfo={candidateInfo}
                />
              </>
            )}

            {activeTab === 'family' && (
              <FamilyManagement
                voter={voter}
                familyMembers={familyMembers}
                candidateInfo={candidateInfo}
              />
            )}

            {activeTab === 'survey' && (
              <VoterSurvey voter={voter} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, isFullWidth = false }) => (
  <div
    className={`flex ${isFullWidth ? 'flex-col' : 'justify-between items-center'
      } border-b border-gray-200 pb-3 pt-3`}
  >
    <span className="font-medium text-gray-700 text-sm">
      <TranslatedText>{label}</TranslatedText>
    </span>
    <span
      className={`text-gray-900 text-sm ${isFullWidth ? 'mt-2 leading-relaxed' : ''
        }`}
    >
      {value || <TranslatedText>N/A</TranslatedText>}
    </span>
  </div>
);

export default FullVoterDetails;
