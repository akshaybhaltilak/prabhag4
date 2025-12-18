import React from 'react';
import { useNavigate } from 'react-router-dom';
import TranslatedText from '../Components/TranslatedText';
import { useCandidate } from '../Context/CandidateContext';

const Home = () => {
  const navigate = useNavigate();
  const { candidateInfo } = useCandidate();

  const features = [
    {
      id: 'search',
      title: 'Search',
      image: 'https://cdn-icons-gif.flaticon.com/15309/15309754.gif',
      action: () => navigate('/search'),
    },
    {
      id: 'lists',
      title: 'Lists',
      image: 'https://cdn-icons-gif.flaticon.com/16875/16875019.gif',
      action: () => navigate('/lists'),
    },
    {
      id: 'survey',
      title: 'Survey',
      image: 'https://cdn-icons-gif.flaticon.com/11677/11677519.gif',
      action: () => navigate('/survey'),
    },
    {
      id: 'booth-management',
      title: 'Booths',
      image: 'https://cdn-icons-gif.flaticon.com/11186/11186810.gif',
      action: () => navigate('/booths'),
    },
  ];

  const bottomFeatures = [
    {
      id: 'Reports',
      title: 'Reports',
      image: 'https://cdn-icons-gif.flaticon.com/16275/16275744.gif',
      action: () => navigate('/reports'),
    },
    {
      id: 'contact',
      title: 'Contact',
      image: 'https://cdn-icons-gif.flaticon.com/19018/19018390.gif',
      action: () => navigate('/contact'),
    },
  ];

  return (
    <div className="relative min-h-screen pb-8">
      <img
        src="https://static.vecteezy.com/system/resources/thumbnails/029/752/340/small_2x/golden-corner-element-png.png"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-90 z-0"
      />

      <div className="relative z-10 min-h-screen pb-8">
        {/* Top Branding Image (instant load) */}
        <div className="max-w-md mx-auto mb-8 mt-3 px-4">
          <div className="rounded-md overflow-hidden shadow-2xl border border-white/80">
           
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto px-4">
          {[...features, ...bottomFeatures].map((feature) => (
            <div
              key={feature.id}
              onClick={feature.action}
              className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-4 text-center h-full flex flex-col items-center justify-center">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-14 h-14 object-contain"
                />
                <div className="text-sm font-semibold text-gray-800 mt-1">
                  <TranslatedText>{feature.title}</TranslatedText>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="flex justify-center text-amber-100 font-bold">
          Akola Prabhag - 4
        </p>

        <footer className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <strong className="text-orange-500">
              <CandidateFooter />
            </strong>
          </div>
        </footer>
      </div>
    </div>
  );
};

const CandidateFooter = () => {
  const { candidateInfo } = useCandidate();
  return candidateInfo?.ReSellerName;
};

export default Home;
