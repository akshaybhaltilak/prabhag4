import React from 'react';
import { FiArrowLeft, FiDownload, FiCheckCircle, FiFileText, FiEdit3, FiClock, FiImage } from 'react-icons/fi';
import TranslatedText from './TranslatedText';

const ElectoralFlyerService = ({ onBack }) => {
  const demoPdfUrl = '/demo-flyer.pdf'; // place the demo PDF in the public/ folder

  const handleBack = () => {
    if (onBack) onBack();
    else window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Top header with back button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              aria-label="Back"
              className="w-10 h-10 bg-white rounded-lg flex items-center justify-center hover:bg-gray-100 transition-all shadow-sm"
            >
              <FiArrowLeft className="text-gray-600" />
            </button>

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                <TranslatedText>Voter Slip</TranslatedText>
              </h1>
              <p className="text-gray-500 text-sm">
                <TranslatedText>Download Voter Slip</TranslatedText>
              </p>
            </div>
          </div>

          <a
            href=""
            download
            className="inline-flex items-center gap-2 bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-orange-700 transition"
            aria-label="Download demo PDF"
            title="Download demo flyer (saved in public folder)"
          >
            <FiDownload />
            <span>
              <TranslatedText>Download Demo PDF</TranslatedText>
            </span>
          </a>
        </div>

        {/* Simple hero */}
        <div className="bg-white rounded-2xl shadow p-6 md:p-8 mb-8 border border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              <TranslatedText>Electoral Campaign Flyer Design Service</TranslatedText>
            </h2>
            <p className="text-gray-600 mt-2">
              <TranslatedText>Professional, print-ready PDF designs for municipal elections.</TranslatedText>
            </p>
            <div className="w-20 h-1 bg-orange-500 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Service Highlights */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 ">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                <TranslatedText>Our Premium Service</TranslatedText>
              </h3>
              {/* <p className="text-gray-500 text-sm mt-1">
                <TranslatedText>High-quality, print-ready flyers per polling booth</TranslatedText>
              </p> */}
            </div>

            <div className="">
              <div className="text-3xl font-bold text-orange-600">₹1,000</div>
              <div className="text-gray-500 text-sm"> <TranslatedText>per booth</TranslatedText> </div>
            </div>
          </div>

          {/* What We Deliver */}
          {/* <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-3">
              <span className="text-orange-600"><FiCheckCircle /></span>
              <TranslatedText>What You Get Per Booth</TranslatedText>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-orange-50 p-3 rounded-lg text-orange-600">
                  <FiFileText />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800"><TranslatedText>Custom Candidate Flyer</TranslatedText></h5>
                  <p className="text-gray-500 text-sm mt-1"><TranslatedText>Personalized design with candidate photo, name and election details.</TranslatedText></p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-orange-50 p-3 rounded-lg text-orange-600">
                  <FiEdit3 />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800"><TranslatedText>Voter Slip Section</TranslatedText></h5>
                  <p className="text-gray-500 text-sm mt-1"><TranslatedText>Detachable voter slip with polling location and timing.</TranslatedText></p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-orange-50 p-3 rounded-lg text-orange-600">
                  <FiFileText />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800"><TranslatedText>Print-Ready Format</TranslatedText></h5>
                  <p className="text-gray-500 text-sm mt-1"><TranslatedText>High-resolution PDF optimized for mass printing.</TranslatedText></p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-orange-50 p-3 rounded-lg text-orange-600">
                  <FiClock />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800"><TranslatedText>Booth-Specific Details</TranslatedText></h5>
                  <p className="text-gray-500 text-sm mt-1"><TranslatedText>Ward number, section and voter list details included.</TranslatedText></p>
                </div>
              </div>
            </div>
          </div> */}

          {/* Design Preview */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-3">
              <span className="text-orange-600"><FiImage /></span>
              <TranslatedText>Design Preview & Features</TranslatedText>
            </h4>

            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <img src="https://res.cloudinary.com/dkrslpxmh/image/upload/v1766155145/Screenshot_2025-12-19_200845_swv5xy.png" alt="" />
                <div className="md:w-2/3 w-full">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mt-2"></div>
                      <div className="text-gray-800"><TranslatedText>Clean, attention‑grabbing layout with candidate focus.</TranslatedText></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mt-2"></div>
                      <div className="text-gray-800"><TranslatedText>Voter slip with detachable section for easy distribution.</TranslatedText></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mt-2"></div>
                      <div className="text-gray-800"><TranslatedText>All essential election details: date, time and location.</TranslatedText></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mt-2"></div>
                      <div className="text-gray-800"><TranslatedText>Optimized for digital sharing and mass printing.</TranslatedText></div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-3">
              <span className="text-orange-600"><FiFileText /></span>
              <TranslatedText>Complete Package Includes</TranslatedText>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                <div className="text-orange-600 text-2xl mb-2"><FiFileText /></div>
                <h5 className="font-bold text-gray-800 mb-1"><TranslatedText>Print-Ready PDF</TranslatedText></h5>
                <p className="text-gray-500 text-sm"><TranslatedText>High-resolution, CMYK-ready files for printers.</TranslatedText></p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                <div className="text-orange-600 text-2xl mb-2"><FiEdit3 /></div>
                <h5 className="font-bold text-gray-800 mb-1"><TranslatedText>Custom Design</TranslatedText></h5>
                <p className="text-gray-500 text-sm"><TranslatedText>Personalized with candidate and booth information.</TranslatedText></p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-100 text-center">
                <div className="text-orange-600 text-2xl mb-2"><FiClock /></div>
                <h5 className="font-bold text-gray-800 mb-1"><TranslatedText>Fast Turnaround</TranslatedText></h5>
                <p className="text-gray-500 text-sm"><TranslatedText>Delivery within 48 hours after receiving all details.</TranslatedText></p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 md:p-8 text-center text-white">
            <h4 className="text-2xl font-bold mb-3"><TranslatedText>Ready to Boost Your Campaign?</TranslatedText></h4>
            <p className="mb-5 max-w-2xl mx-auto text-orange-100"><TranslatedText>Professional flyers that capture attention and convey important election information clearly.</TranslatedText></p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button className="bg-white text-orange-600 font-bold py-3 px-6 rounded-lg hover:bg-orange-50 transition shadow">
                <TranslatedText>Order Now - ₹1,000 / Booth</TranslatedText>
              </button>

              <button className="bg-white/10 border border-white/30 text-white font-bold py-3 px-6 rounded-lg hover:bg-white/20 transition">
                <TranslatedText>Request Sample</TranslatedText>
              </button>
            </div>

            <div className="mt-4 text-sm text-orange-100"><TranslatedText>*Bulk discounts available for multiple booths</TranslatedText></div>
            <div className="mt-3 text-xs text-orange-200"><TranslatedText>Demo PDF is available at <code>/demo-flyer.pdf</code> in the public folder.</TranslatedText></div>
          </div>
        </div>

        {/* Footer Note */}
        {/* <div className="text-center text-gray-500 text-sm mt-4">
          <p><TranslatedText>© 2025 Electoral Design Services. All election materials comply with election commission guidelines.</TranslatedText></p>
          <p className="mt-2"><TranslatedText>Contact: +91 XXXXX XXXXX | info@electoraldesigns.com</TranslatedText></p>
        </div> */}
      </div>
    </div>
  );
};

export default ElectoralFlyerService;