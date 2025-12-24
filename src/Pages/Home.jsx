import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TranslatedText from '../Components/TranslatedText';
import { useCandidate } from '../Context/CandidateContext';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Simple image slider component (height 40px) — update `bannerImages` with your public URLs
const BannerSlider = ({ images }) => {
  const bannerImages = images || [
    // 'https://res.cloudinary.com/dkrslpxmh/image/upload/v1766151106/WhatsApp_Image_2025-12-19_at_6.44.37_PM_lypwv7.jpg',
    // 'https://res.cloudinary.com/dkrslpxmh/image/upload/v1766151106/WhatsApp_Image_2025-12-19_at_6.44.16_PM_gvtojn.jpg',
    'https://res.cloudinary.com/dkrslpxmh/image/upload/v1766151106/WhatsApp_Image_2025-12-19_at_6.44.37_PM_lypwv7.jpg',
    'https://res.cloudinary.com/dkrslpxmh/image/upload/v1766151106/WhatsApp_Image_2025-12-19_at_6.44.16_PM_gvtojn.jpg',
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % bannerImages.length), 2000);
    return () => clearInterval(t);
  }, [bannerImages.length]);

  return (
    <div className="w-full max-w-5xl mx-auto mt-5 mb-4 px-4">
      <div className="relative h-50 rounded-md overflow-hidden shadow-sm bg-gray-800/10">
        {bannerImages.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`banner-${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { candidateInfo } = useCandidate();

  const features = [
    {
      id: 'search',
      title: 'Search',
      image: 'https://cdn-icons-png.flaticon.com/128/2195/2195496.png',
      action: () => navigate('/search'),
    },
    {
      id: 'lists',
      title: 'Lists',
      image: 'https://cdn-icons-png.flaticon.com/128/1292/1292734.png',
      action: () => navigate('/lists'),
    },
    {
      id: 'slip',
      title: 'Slip',
      image: 'https://cdn-icons-png.flaticon.com/128/8304/8304482.png',
      action: () => navigate('/slip'),
    },
    {
      id: 'booth-management',
      title: 'Booths',
      image: 'https://cdn-icons-png.flaticon.com/128/3189/3189420.png',
      action: () => navigate('/booths'),
    },
    {
      id: 'reports',
      title: 'Reports',
      image: 'https://cdn-icons-png.flaticon.com/128/1170/1170616.png',
      action: () => navigate('/reports'),
    },
    {
      id: 'contact',
      title: 'Contact',
      image: 'https://cdn-icons-png.flaticon.com/128/9374/9374926.png',
      action: () => navigate('/contact'),
    },
  ];

  return (
    <div className="relative h-fit w-full overflow-hidden bg-gray-100">
      {/* Fixed Background Image - sticky and non-interactive */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <img
          src=""
          alt=""
          aria-hidden
          className="min-h-screen w-full min-w-full object-cover block"
          style={{ objectPosition: 'center center' }}
        />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 h-full flex flex-col">

        {/* Top auto-rotating banner */}
        <BannerSlider />

        {/* --- BannerSlider component --- */}

        {/* Features Grid - Centered and responsive; pb adds space so footer remains visible */}
        <div className="flex-1 flex items-center justify-center px-4 py-6 pb-10">
          <div className="w-full max-w-5xl">
            {/* Grid Container: compact gaps and flexible sizing to fit six buttons on most viewports */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 items-stretch">              {features.map((feature, index) => (
              <div
                key={feature.id}
                onClick={feature.action}
                className="group relative cursor-pointer"
              >
                {/* Feature Card */}
                <div className="bg-white shadow-xl backdrop-blur-sm rounded-2xl border border-white/40 p-3 sm:p-4 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] w-full h-30 sm:h-36 md:h-36">
                  {/* Icon Container with subtle glow */}
                  <div className="relative mb-2 sm:mb-4 w-full flex items-center justify-center">
                    <div className="absolute inset-0 bg-orange-100 rounded-full blur-md opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
                    <div className="relative w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center">
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="w-14 h-14 sm:w-20 sm:h-20 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.icon-fallback');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      {/* Fallback Icon */}
                      <div className="icon-fallback hidden items-center justify-center w-full h-full text-orange-500 font-bold text-2xl">
                        {feature.title.charAt(0)}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center px-1">
                    <h3 className="text-sm sm:text-base font-bold text-gray-800 group-hover:text-gray-900 transition-colors duration-300 font-sans">
                      <TranslatedText>{feature.title}</TranslatedText>
                    </h3>
                  </div>

                  {/* Decorative Bottom Wave */}
                  <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden rounded-b-2xl">
                    <svg
                      viewBox="0 0 120 24"
                      preserveAspectRatio="none"
                      className="w-full h-full"
                    >
                      <path
                        d="M0,0 C30,8 60,0 90,6 C120,12 120,12 120,12 L120,24 L0,24 Z"
                        className="fill-orange-500 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                      />
                    </svg>
                  </div>
                </div>

                {/* Subtle Hover Effect Border */}
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-orange-300/30 transition-all duration-300 pointer-events-none"></div>
              </div>
            ))}
            </div>

          </div>
        </div>


      </div>

      <footer className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-auto">
        <div className="backdrop-blur-sm bg-white border border-white/30 shadow-lg w-auto rounded-full px-4 py-2 flex items-center justify-center gap-2 text-xs md:text-sm whitespace-nowrap select-none">
          <strong className="text-orange-500 font-semibold tracking-wide">
            <CandidateFooter />
          </strong>
        </div>
      </footer>
    </div>
  );
};

// Separate component for footer to use candidate hook
const CandidateFooter = () => {
  const { candidateInfo } = useCandidate();
  return candidateInfo?.ReSellerName || 'Campaign App';
};

export default Home;