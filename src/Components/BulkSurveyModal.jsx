import React, { useState, useMemo } from 'react';
import { FiX, FiSearch, FiSave, FiCheck } from 'react-icons/fi';
import { db } from '../Firebase/config';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import TranslatedText from './TranslatedText';
import { dbLocal } from '../libs/localdb';

const allCastes = [
  // General
  'Brahmin', 'Maratha', 'Rajput', 'Patil', 'Deshmukh', 'Chavan', 'Jadhav', 
  'Shinde', 'Pawar', 'More', 'Mohite', 'Vaishya', 'Kayastha', 'Bhandari',
  
  // OBC
  'Kunbi', 'Yadav', 'Kurmi', 'Teli', 'Lohar', 'Sutar', 'Kumbhar', 'Nai',
  'Dhangar', 'Gavli', 'Gurav', 'Koli', 'Bhoi', 'Vanjari', 'Mali', 'Sonar',
  
  // SC
  'Mahar', 'Chambhar', 'Mang', 'Dhor', 'Khatik', 'Madiga', 'Chamar', 'Mala',
  'Valmiki', 'Dhobi', 'Balmiki', 'Mehtar',
  
  // ST
  'Bhils', 'Gonds', 'Warli', 'Kokna', 'Thakar', 'Katkari', 'Madia', 'Pardhan',
  'Kolam', 'Korku', 'Baiga', 'Rathwa',
  
  // Muslim
  'Sunni', 'Shia', 'Syed', 'Pathan', 'Mughal', 'Ansari', 'Qureshi', 'Sheikh',
  'Bohra', 'Memon', 'Mallah', 'Raeen',
  
  // Christian
  'Roman Catholic', 'Protestant', 'Orthodox', 'Syrian Christian', 'Latin Catholic',
  'SC Converted Christian', 'Dalit Christian',
  
  // Buddhist
  'Navayana Buddhist', 'Neo-Buddhist', 'Ambedkarite Buddhist',
  
  // Jain & Sikh
  'Digambar', 'Shwetambar', 'Oswal', 'Jat Sikh', 'Khatri Sikh', 'Ramgarhia',
  
  // Others
  'Parsi', 'Jewish', 'Other'
];

const BulkSurveyModal = ({ open, onClose, surname, voters = [], onSaved }) => {
  const [casteSearch, setCasteSearch] = useState('');
  const [selectedCaste, setSelectedCaste] = useState('');
  const [supportStatus, setSupportStatus] = useState('medium');
  const [hasVoted, setHasVoted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Filter castes based on search
  const filteredCastes = useMemo(() => {
    if (!casteSearch.trim()) return allCastes.slice(0, 20); // Show first 20 initially
    return allCastes.filter(caste =>
      caste.toLowerCase().includes(casteSearch.toLowerCase())
    );
  }, [casteSearch]);

  // Save to Firestore
  const handleSave = async () => {
    if (!selectedCaste) {
      alert('Please select a caste');
      return;
    }

    setBusy(true);
    
    try {
      const batch = writeBatch(db);
      const surveyDocs = [];
      const dynamicDocs = [];

      // Process voters
      for (let i = 0; i < voters.length; i++) {
        const voter = voters[i];
        const voterId = String(voter.voterId || voter.id || '').trim().toUpperCase();
        
        if (!voterId) continue;

        // Prepare survey data
        const surveyData = {
          voterId,
          name: voter.name || '',
          voterNameEng: voter.voterNameEng || '',
          surname: surname,
          caste: selectedCaste,
          supportStatus,
          hasVoted,
          phone: voter.phone || '',
          whatsapp: voter.whatsapp || '',
          issues: '',
          remarks: '',
          updatedAt: serverTimestamp(),
          batchUpdated: true,
          batchTimestamp: Date.now()
        };

        // Add to survey batch
        const surveyRef = doc(db, 'voter_surveys', voterId);
        batch.set(surveyRef, surveyData, { merge: true });
        surveyDocs.push({ ...surveyData, id: voterId });

        // Add to dynamic data if voted
        if (hasVoted) {
          const dynamicRef = doc(db, 'voters_dynamic', voterId);
          const dynamicData = {
            voterId,
            hasVoted: true,
            supportStatus,
            updatedAt: serverTimestamp()
          };
          batch.set(dynamicRef, dynamicData, { merge: true });
          dynamicDocs.push(dynamicData);
        }
      }

      await batch.commit();

      // Update local IndexedDB
      try {
        if (surveyDocs.length > 0) {
          await dbLocal.voter_surveys.bulkPut(surveyDocs);
        }
        if (dynamicDocs.length > 0) {
          await dbLocal.voters_dynamic.bulkPut(dynamicDocs);
        }
      } catch (e) {
        console.log('Local DB update skipped:', e);
      }

      // Show success message
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSaved) onSaved();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Bulk survey save failed:', err);
      alert('Failed to save bulk survey. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                <TranslatedText>Bulk Update</TranslatedText>
              </h2>
              <p className="text-white/90 text-xs mt-1">
                <TranslatedText>Total: {voters.length} | {surname}</TranslatedText>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <FiX className="text-white text-lg" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="px-4 py-2 bg-green-100 border-b border-green-200">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <FiCheck className="text-green-600" />
              <TranslatedText>Saved successfully!</TranslatedText>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-4">
          
          {/* 1. Caste Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <TranslatedText>1. Select Caste</TranslatedText>
            </label>
            
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={casteSearch}
                onChange={(e) => setCasteSearch(e.target.value)}
                placeholder="Search caste..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none"
              />
            </div>

            {/* Caste List */}
            <div className="border border-gray-200 rounded-lg p-2 max-h-40 overflow-y-auto">
              {filteredCastes.length === 0 ? (
                <div className="text-center py-3 text-gray-500 text-sm">
                  <TranslatedText>No caste found</TranslatedText>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCastes.map((caste) => (
                    <button
                      key={caste}
                      onClick={() => setSelectedCaste(caste)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${selectedCaste === caste 
                        ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                        : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {caste}
                      {selectedCaste === caste && (
                        <FiCheck className="float-right text-orange-500 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCaste && (
              <div className="text-xs text-gray-600">
                <TranslatedText>Selected:</TranslatedText>{' '}
                <span className="font-medium text-orange-600">{selectedCaste}</span>
              </div>
            )}
          </div>

          {/* 2. Support Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <TranslatedText>2. Support Level</TranslatedText>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'low', label: 'Low', color: 'bg-red-100 text-red-700 border-red-300' },
                { id: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
                { id: 'high', label: 'High', color: 'bg-green-100 text-green-700 border-green-300' }
              ].map((status) => (
                <button
                  key={status.id}
                  onClick={() => setSupportStatus(status.id)}
                  className={`py-2 rounded-lg border text-sm font-medium transition-all ${supportStatus === status.id ? `${status.color} border-2` : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                >
                  <TranslatedText>{status.label}</TranslatedText>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Voting Status */}
          {/* <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <TranslatedText>3. Voting Status</TranslatedText>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setHasVoted(true)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${hasVoted ? 'bg-green-100 text-green-700 border-green-500 border-2' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
              >
                <TranslatedText>Voted ✓</TranslatedText>
              </button>
              <button
                onClick={() => setHasVoted(false)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${!hasVoted ? 'bg-red-100 text-red-700 border-red-500 border-2' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
              >
                <TranslatedText>Not Voted</TranslatedText>
              </button>
            </div>
          </div> */}

        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <TranslatedText>Cancel</TranslatedText>
            </button>
            <button
              onClick={handleSave}
              disabled={busy || !selectedCaste}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-medium hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <TranslatedText>Saving...</TranslatedText>
                </>
              ) : (
                <>
                  <FiSave className="text-sm" />
                  <TranslatedText>Save</TranslatedText>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BulkSurveyModal;