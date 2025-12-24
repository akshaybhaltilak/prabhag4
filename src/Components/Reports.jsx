import React, { useState, useEffect } from 'react';
import {
  FiUsers,
  FiUser,
  FiMapPin,
  FiPhone,
  FiCheckCircle,
  FiBarChart,
  FiArrowLeft,
  FiTrendingUp,
  FiMessageSquare,
  FiHeart,
  FiMinusCircle,
  FiTarget,
  FiRefreshCw
} from 'react-icons/fi';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Firebase/config';
import TranslatedText from './TranslatedText';
import { Link } from 'react-router-dom';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [totalVoters, setTotalVoters] = useState(0);
  const [maleVoters, setMaleVoters] = useState(0);
  const [femaleVoters, setFemaleVoters] = useState(0);
  const [surveysCount, setSurveysCount] = useState(0);
  const [withWhatsapp, setWithWhatsapp] = useState(0);
  const [votedCount, setVotedCount] = useState(0);
  const [topWards, setTopWards] = useState([]);
  const [supportStats, setSupportStats] = useState({
    supporter: 0,
    medium: 0,
    'not-supporter': 0
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch static voter data
        const staticResponse = await fetch('/voter.json');
        const staticData = await staticResponse.json();
        
        // Count gender distribution
        const males = staticData.filter(v => 
          v.gender === 'M' || v.gender === 'Male' || v.gender === 'male'
        ).length;
        const females = staticData.filter(v => 
          v.gender === 'F' || v.gender === 'Female' || v.gender === 'female'
        ).length;
        
        // Count wards
        const wardMap = {};
        staticData.forEach(voter => {
          const ward = voter.prabhag || 'Unknown';
          wardMap[ward] = (wardMap[ward] || 0) + 1;
        });
        
        // Get top 5 wards
        const sortedWards = Object.entries(wardMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([ward, count]) => ({ ward, count }));
        
        // Fetch survey data
        const surveySnapshot = await getDocs(collection(db, 'voter_surveys'));
        const surveyData = surveySnapshot.docs.map(doc => doc.data());
        
        // Calculate survey stats
        const whatsappCount = surveyData.filter(s => s.whatsapp && s.whatsapp.toString().length >= 10).length;
        const voted = surveyData.filter(s => s.hasVoted === true).length;
        
        // Calculate support stats
        const supportCounts = { supporter: 0, medium: 0, 'not-supporter': 0 };
        surveyData.forEach(s => {
          const status = s.supportStatus || 'medium';
          if (supportCounts[status] !== undefined) {
            supportCounts[status]++;
          }
        });
        
        // Update state
        setTotalVoters(staticData.length);
        setMaleVoters(males);
        setFemaleVoters(females);
        setSurveysCount(surveyData.length);
        setWithWhatsapp(whatsappCount);
        setVotedCount(voted);
        setTopWards(sortedWards);
        setSupportStats(supportCounts);
        
      } catch (error) {
        console.error('Error fetching reports data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate percentages
  const surveyPercentage = totalVoters > 0 ? ((surveysCount / totalVoters) * 100).toFixed(1) : 0;
  const whatsappPercentage = totalVoters > 0 ? ((withWhatsapp / totalVoters) * 100).toFixed(1) : 0;
  const votedPercentage = totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(1) : 0;
  const malePercentage = totalVoters > 0 ? ((maleVoters / totalVoters) * 100).toFixed(1) : 0;
  const femalePercentage = totalVoters > 0 ? ((femaleVoters / totalVoters) * 100).toFixed(1) : 0;

  // Stat Card Component with glassmorphism effect
  const StatCard = ({ icon: Icon, title, value, subtitle, color = "orange", percentage = null }) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:border-orange-200">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2.5 rounded-xl bg-${color}-50 border border-${color}-100`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        {percentage !== null && (
          <span className={`text-sm font-semibold ${parseFloat(percentage) > 50 ? 'text-green-600' : 'text-orange-600'} bg-white px-2 py-1 rounded-full border border-gray-200`}>
            {percentage}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
        <h3 className="font-medium text-gray-800 text-sm">
          <TranslatedText>{title}</TranslatedText>
        </h3>
        <p className="text-gray-500 text-xs">
          <TranslatedText>{subtitle}</TranslatedText>
        </p>
      </div>
    </div>
  );

  // Progress Bar Component
  const SimpleProgress = ({ label, value, total, color = "orange", icon: Icon }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 text-${color}-600`} />
            <span className="text-sm font-medium text-gray-800">
              <TranslatedText>{label}</TranslatedText>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{value.toLocaleString()}</span>
            <span className="text-xs text-gray-500">/ {total.toLocaleString()}</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-700 ease-out`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="relative">
          <div className="w-16 h-16 border-3 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
          <FiRefreshCw className="absolute inset-0 m-auto w-6 h-6 text-orange-500 animate-pulse" />
        </div>
        <p className="mt-4 text-gray-600 text-sm font-medium">
          <TranslatedText>Loading campaign insights...</TranslatedText>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <button className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95">
                <FiArrowLeft className="text-gray-700 w-4 h-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                <TranslatedText>Campaign Analytics</TranslatedText>
              </h1>
              <p className="text-gray-500 text-xs">
                <TranslatedText>Real-time voter insights</TranslatedText>
              </p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Refresh data"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Key Metrics Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              <TranslatedText>Key Metrics</TranslatedText>
            </h2>
            <span className="text-xs text-gray-400">
              {totalVoters.toLocaleString()} <TranslatedText>voters</TranslatedText>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={FiUsers}
              title="Total Voters"
              value={totalVoters}
              subtitle="Registered"
              color="blue"
            />
            <StatCard
              icon={FiTarget}
              title="Surveys Done"
              value={surveysCount}
              subtitle="Completed"
              color="green"
              percentage={surveyPercentage}
            />
            <StatCard
              icon={FiMessageSquare}
              title="WhatsApp"
              value={withWhatsapp}
              subtitle="Contactable"
              color="purple"
              percentage={whatsappPercentage}
            />
            <StatCard
              icon={FiTrendingUp}
              title="Voted"
              value={votedCount}
              subtitle="Marked voted"
              color="orange"
              percentage={votedPercentage}
            />
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/30 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                <FiUser className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="font-semibold text-gray-900">
                <TranslatedText>Gender Distribution</TranslatedText>
              </h2>
            </div>
            <div className="text-sm font-medium text-gray-500">
              {malePercentage}% <TranslatedText>M</TranslatedText> • {femalePercentage}% <TranslatedText>F</TranslatedText>
            </div>
          </div>
          
          <div className="space-y-4">
            <SimpleProgress
              label="Male Voters"
              value={maleVoters}
              total={totalVoters}
              color="blue"
              icon={FiUser}
            />
            
            <SimpleProgress
              label="Female Voters"
              value={femaleVoters}
              total={totalVoters}
              color="pink"
              icon={FiUser}
            />
          </div>
        </div>

        {/* Support Level */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/30 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-xl bg-orange-50 border border-orange-100">
              <FiBarChart className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="font-semibold text-gray-900">
              <TranslatedText>Support Levels</TranslatedText>
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiHeart className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">Strong Supporters</div>
                  <div className="text-xs text-gray-500">Active supporters</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">{supportStats.supporter}</div>
                <div className="text-xs text-gray-500">
                  {surveysCount > 0 ? ((supportStats.supporter / surveysCount) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FiTarget className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">Medium Support</div>
                  <div className="text-xs text-gray-500">Potential supporters</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-yellow-600">{supportStats.medium}</div>
                <div className="text-xs text-gray-500">
                  {surveysCount > 0 ? ((supportStats.medium / surveysCount) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FiMinusCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">Not Supporters</div>
                  <div className="text-xs text-gray-500">Need engagement</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-red-600">{supportStats['not-supporter']}</div>
                <div className="text-xs text-gray-500">
                  {surveysCount > 0 ? ((supportStats['not-supporter'] / surveysCount) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Wards */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/30 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-100">
                <FiMapPin className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="font-semibold text-gray-900">
                <TranslatedText>Top Wards</TranslatedText>
              </h2>
            </div>
            <span className="text-xs text-gray-400">
              <TranslatedText>by voter count</TranslatedText>
            </span>
          </div>
          
          <div className="space-y-3">
            {topWards.map((item, index) => {
              const percentage = (item.count / totalVoters * 100).toFixed(1);
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 flex items-center justify-center rounded-lg font-semibold text-sm
                      ${index === 0 ? 'bg-purple-100 text-purple-700' : 
                        index === 1 ? 'bg-purple-50 text-purple-600' : 
                        'bg-gray-100 text-gray-600'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Ward {item.ward}</div>
                      <div className="text-xs text-gray-500">{item.count.toLocaleString()} voters</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{percentage}%</div>
                    <div className="text-xs text-gray-400">of total</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 shadow-lg">
          <div className="text-center text-white">
            <div className="flex justify-center mb-3">
              <FiBarChart className="w-6 h-6 opacity-90" />
            </div>
            <h3 className="font-bold text-lg mb-1">
              <TranslatedText>Campaign Overview</TranslatedText>
            </h3>
            <p className="text-white/80 text-sm mb-4">
              Based on {totalVoters.toLocaleString()} voters • {surveysCount.toLocaleString()} surveys
            </p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">{surveyPercentage}%</div>
                <div className="text-xs text-white/80">Survey Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">{votedPercentage}%</div>
                <div className="text-xs text-white/80">Voted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">{whatsappPercentage}%</div>
                <div className="text-xs text-white/80">WhatsApp</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center gap-1 text-gray-400 text-xs px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200">
            <FiCheckCircle className="w-3 h-3" />
            <span>Data synced in real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;