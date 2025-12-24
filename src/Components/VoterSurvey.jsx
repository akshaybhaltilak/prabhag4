import React, { useState, useEffect } from 'react';
import { db } from '../Firebase/config';
import { doc, setDoc, collection, getDoc } from 'firebase/firestore';
import { dbLocal } from '../libs/localdb';
import TranslatedText from './TranslatedText';

const VoterSurvey = ({ voter, onUpdate }) => {
  const [surveyData, setSurveyData] = useState({
    gender: '',
    dob: '',
    whatsapp: '',
    city: 'Akola',
    town: '',
    colony: '',
    address: '',
    category: '',
    education: '',
    occupation: '',
    issues: '',
    remarks: '',
    caste: '',
    supportStatus: 'medium',
    hasVoted: false
  });

  const [saving, setSaving] = useState(false);
  const [calculatedDOB, setCalculatedDOB] = useState('');
  const [voterStaticData, setVoterStaticData] = useState({});

  useEffect(() => {
    if (voter) {
      // Load static voter data from voter.json props
      const staticData = {
        name: voter.name || '',
        voterId: voter.voterId || '',
        age: voter.age || '',
        gender: voter.gender || '',
        boothNumber: voter.boothNumber || '',
        serialNumber: voter.serialNumber || '',
        pollingStationAddress: voter.pollingStationAddress || '',
        yadiBhagAddress: voter.yadiBhagAddress || '',
        whatsapp: voter.whatsapp || '' // whatsapp from voter.json
      };
      
      setVoterStaticData(staticData);
      
      // Set gender from voter.json if available
      const initialSurvey = {
        gender: voter.gender || '',
        whatsapp: voter.whatsapp || ''
      };
      
      // Calculate DOB from age if age is available
      if (voter.age) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - parseInt(voter.age);
        setCalculatedDOB(`${birthYear}-01-01`);
        initialSurvey.dob = `${birthYear}-01-01`;
      }

      // Load survey data from voter_surveys root
      const loadSurveyData = async () => {
        if (!voter?.voterId) return;
        try {
          // First try local IndexedDB
          const localSurvey = await dbLocal.voter_surveys.get(voter.voterId);
          if (localSurvey) {
            const mergedData = { ...initialSurvey, ...localSurvey };
            setSurveyData(mergedData);
            
            // If DOB not in survey but age is available, calculate it
            if (!mergedData.dob && voter.age) {
              const currentYear = new Date().getFullYear();
              const birthYear = currentYear - parseInt(voter.age);
              const calculatedDOB = `${birthYear}-01-01`;
              setCalculatedDOB(calculatedDOB);
              setSurveyData(prev => ({ ...prev, dob: calculatedDOB }));
            }
            return;
          }

          // Fallback to Firestore voter_surveys collection
          try {
            const surveyRef = doc(collection(db, 'voter_surveys'), voter.voterId);
            const surveyDoc = await getDoc(surveyRef);
            if (surveyDoc.exists()) {
              const firestoreData = surveyDoc.data();
              const mergedData = { ...initialSurvey, ...firestoreData };
              setSurveyData(mergedData);
              
              // Save to local IndexedDB for future use
              await dbLocal.voter_surveys.put({
                id: voter.voterId,
                ...mergedData
              });
              
              // If DOB not in survey but age is available, calculate it
              if (!mergedData.dob && voter.age) {
                const currentYear = new Date().getFullYear();
                const birthYear = currentYear - parseInt(voter.age);
                const calculatedDOB = `${birthYear}-01-01`;
                setCalculatedDOB(calculatedDOB);
                setSurveyData(prev => ({ ...prev, dob: calculatedDOB }));
              }
            } else {
              // No survey data exists, use initial data
              setSurveyData(initialSurvey);
            }
          } catch (firestoreError) {
            console.error('Error loading from Firestore:', firestoreError);
            setSurveyData(initialSurvey);
          }
        } catch (error) {
          console.error('Error loading survey data:', error);
          setSurveyData(initialSurvey);
        }
      };
      
      loadSurveyData();
    }
  }, [voter]);

  const handleInputChange = (field, value) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
    
    // If age changes, update calculated DOB
    if (field === 'age' && value) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - parseInt(value);
      const newDOB = `${birthYear}-01-01`;
      setCalculatedDOB(newDOB);
      setSurveyData(prev => ({ ...prev, dob: newDOB }));
    }
  };

  const handleWhatsAppChange = (value) => {
    // Allow only numbers and limit to 10 digits
    let formattedValue = value.replace(/\D/g, '');
    if (formattedValue.length > 10) {
      formattedValue = formattedValue.slice(0, 10);
    }
    setSurveyData(prev => ({ ...prev, whatsapp: formattedValue }));
  };

  const calculateAgeFromDOB = (dob) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const saveSurveyData = async () => {
    if (!voter?.voterId) {
      alert('Missing voterId — cannot save survey!');
      return;
    }

    setSaving(true);
    try {
      // Calculate age from DOB if provided, otherwise use static age
      let finalAge = voterStaticData.age || '';
      if (surveyData.dob) {
        finalAge = calculateAgeFromDOB(surveyData.dob);
      }

      const surveyDoc = {
        id: voter.voterId, // ✅ CRITICAL: This is the primary key for IndexedDB
        voterId: voter.voterId, // ✅ link to static voter
        name: voterStaticData.name || voter.name || '',
        age: finalAge,
        gender: surveyData.gender || voterStaticData.gender || '',
        dob: surveyData.dob || '',
        whatsapp: surveyData.whatsapp || '',
        city: surveyData.city || 'Akola',
        town: surveyData.town || '',
        colony: surveyData.colony || '',
        address: surveyData.address || '',
        category: surveyData.category || '',
        education: surveyData.education || '',
        occupation: surveyData.occupation || '',
        issues: surveyData.issues || '',
        remarks: surveyData.remarks || '',
        caste: surveyData.caste || '',
        supportStatus: surveyData.supportStatus || 'medium',
        hasVoted: !!surveyData.hasVoted,
        updatedAt: Date.now(),
      };

      // ✅ 1. Save to Firestore in "voter_surveys" collection
      const docRef = doc(collection(db, 'voter_surveys'), voter.voterId);
      await setDoc(docRef, surveyDoc, { merge: true });

      // ✅ 2. Save to IndexedDB (for offline) - FIXED: Now has proper id field
      await dbLocal.voter_surveys.put(surveyDoc);

      // Emit global update event so other components refresh
      try { 
        window.dispatchEvent(new CustomEvent('voter_survey_updated', { 
          detail: { ids: [voter.voterId] } 
        })); 
      } catch (e) {}

      alert('Survey data saved successfully to voter_surveys!');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving survey data:', error);
      alert('Failed to save survey data.');
    } finally {
      setSaving(false);
    }
  };

  const clearSurveyData = async () => {
    if (!voter?.voterId) return;

    const confirmDelete = window.confirm('Are you sure you want to clear this survey data?');
    if (!confirmDelete) return;

    setSaving(true);
    try {
      // Clear in Firestore voter_surveys
      const docRef = doc(collection(db, 'voter_surveys'), voter.voterId);
      await setDoc(docRef, {}, { merge: false }); // overwrite empty

      // Clear in IndexedDB
      await dbLocal.voter_surveys.delete(voter.voterId);

      // Reset local state (keep gender from voter.json and whatsapp if in voter.json)
      setSurveyData({
        gender: voterStaticData.gender || '',
        dob: '',
        whatsapp: voterStaticData.whatsapp || '',
        city: 'Akola',
        town: '',
        colony: '',
        address: '',
        category: '',
        education: '',
        occupation: '',
        issues: '',
        remarks: '',
        caste: '',
        supportStatus: 'medium',
        hasVoted: false
      });

      // Reset calculated DOB
      if (voterStaticData.age) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - parseInt(voterStaticData.age);
        setCalculatedDOB(`${birthYear}-01-01`);
        setSurveyData(prev => ({ ...prev, dob: `${birthYear}-01-01` }));
      } else {
        setCalculatedDOB('');
      }

      alert('Survey data cleared successfully from voter_surveys.');
      onUpdate?.();
    } catch (error) {
      console.error('Error clearing survey data:', error);
      alert('Failed to clear survey data.');
    } finally {
      setSaving(false);
    }
  };

  const cities = ['Akola', 'Amravati', 'Nagpur', 'Mumbai', 'Pune', 'Other'];
  const categories = ['', 'General', 'OBC', 'SC', 'ST', 'Other'];
  const educationLevels = ['', 'Nothing', '10th Pass', '12th Pass', 'Graduation', 'Upper Education'];
  const occupations = ['', 'Student', 'Farmer', 'Business', 'Service', 'Professional', 'Housewife', 'Retired', 'Unemployed', 'Other'];
  const casteOptions = ['Brahmin','Maratha','Kunbi','Teli','Lohar','Dhangar','Gond','Chamar','Sunni','Shia','RC','Protestant','Jat','Other'];
  const supportOptions = [
    { value: 'unknown', label: 'Unknown' },
    { value: 'supporter', label: 'Strong' },
    { value: 'medium', label: 'Medium' },
    { value: 'not-supporter', label: 'Not Supporter' }
  ];

  return (
    <div className="space-y-6 bg-white rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-orange-500"></span>
          <TranslatedText>Voter Survey</TranslatedText>
        </h3>
        <div className="text-xs bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-medium">
          <TranslatedText>Required fields marked with *</TranslatedText>
        </div>
      </div>

      {/* Static Voter Info Display */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">
          <TranslatedText>Voter Information (from voter.json)</TranslatedText>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-gray-600"><TranslatedText>Name:</TranslatedText></span>
            <span className="ml-2 font-medium">{voterStaticData.name || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-600"><TranslatedText>Voter ID:</TranslatedText></span>
            <span className="ml-2 font-medium">{voterStaticData.voterId || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-600"><TranslatedText>Age:</TranslatedText></span>
            <span className="ml-2 font-medium">{voterStaticData.age || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-600"><TranslatedText>Booth:</TranslatedText></span>
            <span className="ml-2 font-medium">{voterStaticData.boothNumber || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Personal Information Section */}
        <div className="rounded-lg">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-blue-500"></span>
            <TranslatedText>Personal Information</TranslatedText>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Gender</TranslatedText> *
              </label>
              <select
                value={surveyData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
              >
                <option value=""><TranslatedText>Select Gender</TranslatedText></option>
                <option value="Male"><TranslatedText>Male</TranslatedText></option>
                <option value="Female"><TranslatedText>Female</TranslatedText></option>
                <option value="Other"><TranslatedText>Other</TranslatedText></option>
              </select>
              {voterStaticData.gender && (
                <div className="text-xs text-gray-500 mt-1">
                  <TranslatedText>From voter.json:</TranslatedText> {voterStaticData.gender}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Age</TranslatedText>
              </label>
              <input
                type="number"
                value={voterStaticData.age || ''}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                placeholder="Auto from voter.json"
              />
              <div className="text-xs text-gray-500 mt-1">
                <TranslatedText>From voter.json (readonly)</TranslatedText>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Date of Birth (Calculated)</TranslatedText>
              </label>
              <input
                type="date"
                value={surveyData.dob || calculatedDOB}
                onChange={(e) => handleInputChange('dob', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
              />
              {calculatedDOB && !surveyData.dob && (
                <div className="text-xs text-gray-500 mt-1">
                  <TranslatedText>Calculated from age</TranslatedText>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="rounded-lg">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-green-500"></span>
            <TranslatedText>Contact Information</TranslatedText>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>WhatsApp Number</TranslatedText>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-sm font-medium">+91</span>
                <input
                  type="tel"
                  value={surveyData.whatsapp}
                  onChange={(e) => handleWhatsAppChange(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
                  placeholder="9876543210"
                  maxLength={10}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <TranslatedText>Saved to voter_surveys</TranslatedText>
                {voterStaticData.whatsapp && (
                  <span className="ml-2">
                    | <TranslatedText>From voter.json:</TranslatedText> {voterStaticData.whatsapp}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Caste</TranslatedText>
              </label>
              <select
                value={surveyData.caste}
                onChange={(e) => handleInputChange('caste', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
              >
                <option value=""><TranslatedText>Select Caste</TranslatedText></option>
                {casteOptions.map(caste => (
                  <option key={caste} value={caste}><TranslatedText>{caste}</TranslatedText></option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Address Information Section */}
        <div className=" rounded-lg ">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-purple-500"></span>
            <TranslatedText>Address Information</TranslatedText>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>City</TranslatedText> *
              </label>
              <select
                value={surveyData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
              >
                {cities.map(city => (
                  <option key={city} value={city}><TranslatedText>{city}</TranslatedText></option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Town/Village</TranslatedText>
              </label>
              <input
                type="text"
                value={surveyData.town}
                onChange={(e) => handleInputChange('town', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
                placeholder="Enter town/village"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Colony/Area</TranslatedText>
              </label>
              <input
                type="text"
                value={surveyData.colony}
                onChange={(e) => handleInputChange('colony', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
                placeholder="Enter colony/area"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2 font-medium">
              <TranslatedText>Detailed Address</TranslatedText>
            </label>
            <textarea
              value={surveyData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white resize-none"
              placeholder="Enter complete address with landmarks..."
            />
          </div>
        </div>

        {/* Socio-Economic Information Section */}
        <div className="">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-indigo-500"></span>
            <TranslatedText>Socio-Economic Information</TranslatedText>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Category</TranslatedText>
              </label>
              <select
                value={surveyData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}><TranslatedText>{cat || 'Select Category'}</TranslatedText></option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Education</TranslatedText>
              </label>
              <select
                value={surveyData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
              >
                {educationLevels.map(edu => (
                  <option key={edu} value={edu}><TranslatedText>{edu || 'Select Education'}</TranslatedText></option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Occupation</TranslatedText>
              </label>
              <select
                value={surveyData.occupation}
                onChange={(e) => handleInputChange('occupation', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white"
              >
                {occupations.map(occ => (
                  <option key={occ} value={occ}><TranslatedText>{occ || 'Select Occupation'}</TranslatedText></option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Support Status</TranslatedText>
              </label>
              <select
                value={surveyData.supportStatus}
                onChange={(e) => handleInputChange('supportStatus', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
              >
                {supportOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    <TranslatedText>{option.label}</TranslatedText>
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <input
                  id="sv_hasVoted"
                  type="checkbox"
                  checked={surveyData.hasVoted}
                  onChange={(e) => handleInputChange('hasVoted', e.target.checked)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="sv_hasVoted" className="ml-2 text-sm text-gray-700 font-medium">
                  <TranslatedText>Mark as Voted</TranslatedText>
                </label>
              </div>
              {surveyData.hasVoted && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  <TranslatedText>Voted ✓</TranslatedText>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="">
          <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-teal-500"></span>
            <TranslatedText>Additional Information</TranslatedText>
          </h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Key Issues / Concerns</TranslatedText>
              </label>
              <textarea
                value={surveyData.issues}
                onChange={(e) => handleInputChange('issues', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white resize-none"
                placeholder="What issues matter most to this voter?"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                <TranslatedText>Remarks / Notes</TranslatedText>
              </label>
              <textarea
                value={surveyData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 bg-white resize-none"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={saveSurveyData}
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <TranslatedText>Saving...</TranslatedText>
            </>
          ) : (
            <>
              <TranslatedText>Save Survey Data to voter_surveys</TranslatedText>
            </>
          )}
        </button>
        <button
          onClick={clearSurveyData}
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:from-gray-300 hover:to-gray-400 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          <TranslatedText>Clear All Survey Data</TranslatedText>
        </button>
      </div>
      
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
        <p><TranslatedText>Note: All survey data is saved to the voter_surveys collection in Firebase.</TranslatedText></p>
        <p><TranslatedText>Static data (name, voter ID, age, booth) comes from voter.json and cannot be edited here.</TranslatedText></p>
      </div>
    </div>
  );
};

export default VoterSurvey;