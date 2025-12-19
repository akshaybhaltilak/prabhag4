import React, { useState, useEffect } from 'react';
import {
  FiUsers,
  FiPieChart,
  FiBarChart2,
  FiMap,
  FiFilter,
  FiRefreshCw,
  FiCheckCircle,
  FiClock,
  FiArrowLeft
} from 'react-icons/fi';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../Firebase/config';
import TranslatedText from './TranslatedText';
import { Link } from 'react-router-dom';

const Reports = () => {
  const [staticVoters, setStaticVoters] = useState([]);
  const [dynamicVoters, setDynamicVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    gender: '',
    prabhag: '',
    ageRange: ''
  });

  // Fetch static data from JSON file
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const response = await fetch('/voter.json');
        const data = await response.json();
        setStaticVoters(data);
      } catch (error) {
        console.error('Error fetching static data:', error);
      }
    };

    fetchStaticData();
  }, []);

  // Fetch dynamic data from Firestore
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        const voterSurveySnapshot = await getDocs(collection(db, 'voter_survey'));
        const voterDynamicSnapshot = await getDocs(collection(db, 'voter_dynamic'));

        const surveyData = voterSurveySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const dynamicData = voterDynamicSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setDynamicVoters([...surveyData, ...dynamicData]);
      } catch (error) {
        console.error('Error fetching dynamic data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicData();
  }, []);

  // Analytics calculations
  const totalVoters = staticVoters.length;
  const maleVoters = staticVoters.filter(voter => voter.gender === 'Male').length;
  const femaleVoters = staticVoters.filter(voter => voter.gender === 'Female').length;

  const ageGroups = {
    '18-25': staticVoters.filter(voter => parseInt(voter.age) >= 18 && parseInt(voter.age) <= 25).length,
    '26-40': staticVoters.filter(voter => parseInt(voter.age) >= 26 && parseInt(voter.age) <= 40).length,
    '41-60': staticVoters.filter(voter => parseInt(voter.age) >= 41 && parseInt(voter.age) <= 60).length,
    '60+': staticVoters.filter(voter => parseInt(voter.age) > 60).length
  };

  const prabhagDistribution = staticVoters.reduce((acc, voter) => {
    acc[voter.prabhag] = (acc[voter.prabhag] || 0) + 1;
    return acc;
  }, {});

  const boothDistribution = staticVoters.reduce((acc, voter) => {
    acc[voter.boothNumber] = (acc[voter.boothNumber] || 0) + 1;
    return acc;
  }, {});

  // Survey analytics
  const surveyStats = {
    totalSurveys: dynamicVoters.length,
    completedSurveys: dynamicVoters.filter(v => v.status === 'completed').length,
    pendingSurveys: dynamicVoters.filter(v => v.status === 'pending').length,
    surveyRate: totalVoters > 0 ? ((dynamicVoters.length / totalVoters) * 100).toFixed(1) : 0
  };

  // Filtered data
  const filteredVoters = staticVoters.filter(voter => {
    return (
      (filters.gender === '' || voter.gender === filters.gender) &&
      (filters.prabhag === '' || voter.prabhag === filters.prabhag) &&
      (filters.ageRange === '' || {
        '18-25': parseInt(voter.age) >= 18 && parseInt(voter.age) <= 25,
        '26-40': parseInt(voter.age) >= 26 && parseInt(voter.age) <= 40,
        '41-60': parseInt(voter.age) >= 41 && parseInt(voter.age) <= 60,
        '60+': parseInt(voter.age) > 60
      }[filters.ageRange])
    );
  });

  // Simple Progress Bar Component
  const ProgressBar = ({ percentage, color, height = 8 }) => {
    return (
      <div className="w-full bg-gray-200 rounded-full" style={{ height: `${height}px` }}>
        <div
          className="rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            height: `${height}px`,
            backgroundColor: color
          }}
        />
      </div>
    );
  };

  // Mobile-friendly Card Component
  const StatCard = ({ icon: Icon, title, value, subtitle, color = "orange" }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-${color}-50`}>
          <Icon className={`w-5 h-5 text-${color}-500`} />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <h3 className="font-semibold text-gray-900 text-sm mb-1">
        <TranslatedText>{title}</TranslatedText>
      </h3>
      <p className="text-gray-500 text-xs">
        <TranslatedText>{subtitle}</TranslatedText>
      </p>
    </div>
  );

  // Distribution Item Component
  const DistributionItem = ({ label, value, total, color }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-gray-700 text-sm flex-1">
        <TranslatedText>{label}</TranslatedText>
      </span>
      <div className="flex items-center gap-3 flex-1">
        <ProgressBar
          percentage={(value / total) * 100}
          color={color}
          height={6}
        />
        <span className="text-gray-900 font-medium text-sm w-12 text-right">
          {value}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <FiRefreshCw className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            <TranslatedText>Loading voter data...</TranslatedText>
          </p>
          <p className="text-gray-500 text-sm mt-2">
            <TranslatedText>Please wait while we prepare your reports</TranslatedText>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}

      <div className="flex mb-3 mt-5 justify-between gap-3">
        <div className="flex">
          <Link to="/">
            <button
              className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-all"
            >
              <FiArrowLeft className="text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              <TranslatedText>Reports And Analysis</TranslatedText>
            </h1>
            <p className="text-gray-500 text-sm">
              <TranslatedText>Get detailed reports and analysis</TranslatedText>
            </p>
          </div>
        </div>
        <div>
        </div>

      </div>

      {/* Mobile Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="flex overflow-x-auto px-4 py-2 gap-1 no-scrollbar">
          {[
            { id: 'overview', label: 'Summary', icon: FiPieChart },
            { id: 'demographics', label: 'People', icon: FiUsers },
            { id: 'distribution', label: 'Areas', icon: FiMap },
            { id: 'surveys', label: 'Surveys', icon: FiCheckCircle },
            { id: 'details', label: 'List', icon: FiBarChart2 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all flex-shrink-0 ${activeTab === tab.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 bg-gray-100'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">
                <TranslatedText>{tab.label}</TranslatedText>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white mx-4 my-4 rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FiFilter className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-gray-900 text-sm">
              <TranslatedText>Filter Data</TranslatedText>
            </h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TranslatedText>Gender</TranslatedText>
            </label>
            <select
              value={filters.gender}
              onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
            >
              <option value=""><TranslatedText>All Genders</TranslatedText></option>
              <option value="Male"><TranslatedText>Male</TranslatedText></option>
              <option value="Female"><TranslatedText>Female</TranslatedText></option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TranslatedText>Area</TranslatedText>
            </label>
            <select
              value={filters.prabhag}
              onChange={(e) => setFilters({ ...filters, prabhag: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
            >
              <option value=""><TranslatedText>All Areas</TranslatedText></option>
              {Object.keys(prabhagDistribution).map(prabhag => (
                <option key={prabhag} value={prabhag}>
                  <TranslatedText>{prabhag}</TranslatedText>
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TranslatedText>Age Group</TranslatedText>
            </label>
            <select
              value={filters.ageRange}
              onChange={(e) => setFilters({ ...filters, ageRange: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
            >
              <option value=""><TranslatedText>All Ages</TranslatedText></option>
              <option value="18-25"><TranslatedText>18-25 Years</TranslatedText></option>
              <option value="26-40"><TranslatedText>26-40 Years</TranslatedText></option>
              <option value="41-60"><TranslatedText>41-60 Years</TranslatedText></option>
              <option value="60+"><TranslatedText>60+ Years</TranslatedText></option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={FiUsers}
                title="Total Voters"
                value={totalVoters}
                subtitle="Registered voters"
                color="blue"
              />
              <StatCard
                icon={FiCheckCircle}
                title="Surveys Done"
                value={surveyStats.totalSurveys}
                subtitle="Completed surveys"
                color="green"
              />
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                <TranslatedText>Gender Breakdown</TranslatedText>
              </h3>
              <div className="space-y-3">
                <DistributionItem
                  label="Male Voters"
                  value={maleVoters}
                  total={totalVoters}
                  color="#3b82f6"
                />
                <DistributionItem
                  label="Female Voters"
                  value={femaleVoters}
                  total={totalVoters}
                  color="#ec4899"
                />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                <TranslatedText>Age Groups</TranslatedText>
              </h3>
              <div className="space-y-3">
                {Object.entries(ageGroups).map(([ageGroup, count]) => (
                  <DistributionItem
                    key={ageGroup}
                    label={`${ageGroup} Years`}
                    value={count}
                    total={totalVoters}
                    color="#f59e0b"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Demographics Tab */}
        {activeTab === 'demographics' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                <TranslatedText>Voter Demographics</TranslatedText>
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 text-sm">
                      <TranslatedText>Male Voters</TranslatedText>
                    </span>
                    <span className="text-gray-900 font-medium text-sm">
                      {maleVoters} ({((maleVoters / totalVoters) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <ProgressBar percentage={(maleVoters / totalVoters) * 100} color="#3b82f6" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 text-sm">
                      <TranslatedText>Female Voters</TranslatedText>
                    </span>
                    <span className="text-gray-900 font-medium text-sm">
                      {femaleVoters} ({((femaleVoters / totalVoters) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <ProgressBar percentage={(femaleVoters / totalVoters) * 100} color="#ec4899" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                <TranslatedText>Age Distribution</TranslatedText>
              </h3>
              <div className="space-y-3">
                {Object.entries(ageGroups).map(([ageGroup, count]) => (
                  <div key={ageGroup} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-700 text-sm">
                      <TranslatedText>{ageGroup} Years</TranslatedText>
                    </span>
                    <span className="text-gray-900 font-medium text-sm">
                      {count} voters
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Distribution Tab */}
        {activeTab === 'distribution' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                <TranslatedText>Area-wise Distribution</TranslatedText>
              </h3>
              <div className="space-y-3">
                {Object.entries(prabhagDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([prabhag, count]) => (
                    <div key={prabhag} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-gray-700 text-sm flex-1">
                        <TranslatedText>{prabhag}</TranslatedText>
                      </span>
                      <span className="text-gray-900 font-medium text-sm">
                        {count} <TranslatedText>voters</TranslatedText>
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                <TranslatedText>Booth Distribution</TranslatedText>
              </h3>
              <div className="space-y-3">
                {Object.entries(boothDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([booth, count]) => (
                    <div key={booth} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-gray-700 text-sm flex-1 truncate">
                        {booth}
                      </span>
                      <span className="text-gray-900 font-medium text-sm">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Surveys Tab */}
        {activeTab === 'surveys' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={FiCheckCircle}
                title="Completed"
                value={surveyStats.completedSurveys}
                subtitle="Surveys done"
                color="green"
              />
              <StatCard
                icon={FiClock}
                title="Pending"
                value={surveyStats.pendingSurveys}
                subtitle="Surveys remaining"
                color="orange"
              />
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                <TranslatedText>Survey Progress</TranslatedText>
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 text-sm">
                      <TranslatedText>Completion Rate</TranslatedText>
                    </span>
                    <span className="text-gray-900 font-medium text-sm">
                      {surveyStats.surveyRate}%
                    </span>
                  </div>
                  <ProgressBar percentage={surveyStats.surveyRate} color="#10b981" />
                </div>

                <div className="text-center text-gray-600 text-sm">
                  <TranslatedText>{surveyStats.totalSurveys} surveys completed out of {totalVoters} total voters</TranslatedText>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 text-sm">
                  <TranslatedText>Voter List</TranslatedText>
                </h3>
                <span className="text-gray-500 text-xs">
                  <TranslatedText>Showing {Math.min(filteredVoters.length, 20)} voters</TranslatedText>
                </span>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredVoters.slice(0, 20).map((voter, index) => (
                <div key={voter.id} className="p-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{voter.name}</h4>
                      <p className="text-gray-500 text-xs">{voter.voterId}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-900 text-sm font-medium">{voter.age} <TranslatedText>yrs</TranslatedText></span>
                      <p className="text-gray-500 text-xs capitalize">{voter.gender}</p>
                    </div>
                  </div>
                  <div className="text-gray-600 text-xs">
                    <p>{voter.prabhag} • {voter.boothNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Reports;