import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the context
const CandidateContext = createContext();

// Custom hook to use the candidate context
export const useCandidate = () => {
  const context = useContext(CandidateContext);
  if (!context) {
    throw new Error('useCandidate must be used within a CandidateProvider');
  }
  return context;
};

// Provider component
export const CandidateProvider = ({ children }) => {
  const [candidateInfo, setCandidateInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Default candidate information
  // const defaultCandidateInfo = {
  //   mainFrontImage: '',
  //   mainWhatsappBrandingImage: '',
  //   logoImageCircle: "/logobjp.jpg",
  //   TagLine: "अकोला महानगरपालिका सार्वत्रिक निवडणूक २०२६",
  //   ReSellerName: "Powered By JanNetaa",
  //   name: 'अकोला प्रभाग क्रमांक 4',
  //   namecan: '',
  //   party: "भारतीय जनता पार्टी",
  //   electionSymbol: "कमळ",
  //   slogan: 'सबका साथ, सबका विकास',
  //   contact: "",
  //   area: "अकोला महानगरपालिका सार्वत्रिक निवडणूक २०२६",
  //   messageWhatsapp: "भारतीय जनता पक्षाचे अधिकृत उमेदवार  यांना भारतीय जनता पक्षाच्या(कमळ) चिन्हावर  मतदान करून प्रचंड बहुमतांनी विजयी करा.\n*आपले उमेदवार:*\n(अ) संदीप रामकृष्ण शेगोकर\n(ब) सौ. शिल्पा किशोर वारोकार\n(क) पल्लवी शिवाजीराव मोरे (गावंडे)\n(ड) मिलिंद उर्फ बाळू राऊत\n",

  //   messagePrinting: "भारतीय जनता पार्टी प्रभाग क्रमांक ४ चे अधिकृत उमेदवार<br>अ) श्री संदीप रामकृष्ण शेगोकार<br>ब) शिल्पा किशोर वारोकार<br>क) पल्लवी शिवाजीराव मोरे(गावंडे)<br>ड) मिलिंद उर्फ बाळू राऊत<br>यांना <b>कमळ</b> या निशाणी समोरील बटन दाबून प्रचंड बहुमतांनी विजयी करा"
  // };
  const defaultCandidateInfo = {
    mainFrontImage: '',
    mainWhatsappBrandingImage: '',
    logoImageCircle: "/logo.jpg",
    TagLine: "अकोला महापालिका निवडणूक 2026",
    ReSellerName: "Powered By JanNetaa",
    name: 'Akola Election 2026 Guidelines',
    party: "Akola Election 2026 Guidelines",
    electionSymbol: "",
    slogan: 'अकोला महापालिका निवडणूक 2026 साठी आपले स्वागत आहे!',
    contact: "",
    area: "अकोला महापालिका निवडणूक 2026",
    messageWhatsapp: "Akola Election 2026\n",
    messagePrinting: "Akola Election 2026"
  };

  // Load candidate info from localStorage on mount
  useEffect(() => {
    const loadCandidateInfo = () => {
      try {
        const savedCandidateInfo = localStorage.getItem('candidateInfo');
        if (savedCandidateInfo) {
          setCandidateInfo(JSON.parse(savedCandidateInfo));
        } else {
          setCandidateInfo(defaultCandidateInfo);
        }
      } catch (error) {
        console.error('Error loading candidate info:', error);
        setCandidateInfo(defaultCandidateInfo);
      } finally {
        setLoading(false);
      }
    };

    loadCandidateInfo();
  }, []);

  // Save to localStorage whenever candidateInfo changes
  useEffect(() => {
    if (candidateInfo) {
      localStorage.setItem('candidateInfo', JSON.stringify(candidateInfo));
    }
  }, [candidateInfo]);

  const updateCandidateInfo = (newInfo) => {
    setCandidateInfo(prev => ({ ...prev, ...newInfo }));
  };

  const resetCandidateInfo = () => {
    setCandidateInfo(defaultCandidateInfo);
    localStorage.setItem('candidateInfo', JSON.stringify(defaultCandidateInfo));
  };

  // Don't render children until candidateInfo is loaded
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-300 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading candidate information...</p>
        </div>
      </div>
    );
  }

  const value = {
    candidateInfo,
    updateCandidateInfo,
    resetCandidateInfo
  };

  return (
    <CandidateContext.Provider value={value}>
      {children}
    </CandidateContext.Provider>
  );
};