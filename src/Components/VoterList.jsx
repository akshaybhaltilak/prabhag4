import React, { memo, useCallback } from 'react';
import {
  FiEye,
  FiMapPin,
  FiPhone,
  FiUser,
  FiHome,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import TranslatedText from './TranslatedText';

const VoterList = memo(({ voters = [], loading = false }) => {
  const navigate = useNavigate();

  const handleViewDetails = useCallback((voterId, e) => {
    if (e) e.stopPropagation();
    navigate(`/voter/${voterId}`);
  }, [navigate]);

  const handleCardClick = useCallback((voterId) => {
    navigate(`/voter/${voterId}`);
  }, [navigate]);

  // Format phone number
  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    return phone;
  };

  // No results state
  if (!loading && (!Array.isArray(voters) || voters.length === 0)) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <div className="text-4xl mb-3 text-gray-300">👥</div>
        <h3 className="text-sm font-semibold text-gray-600 mb-1">
          <TranslatedText>No Voters Found</TranslatedText>
        </h3>
        <p className="text-xs text-gray-500">
          <TranslatedText>Adjust your search or filters</TranslatedText>
        </p>
      </div>
    );
  }

  // Loading state - compact skeleton
  if (loading && voters.length === 0) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-2 animate-pulse"
          >
            {/* <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                  <div className="h-3 bg-gray-200 rounded w-8"></div>
                </div>
              </div>
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
            </div> */}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {voters.map((voter, index) => (
        <div
          key={voter.id || index}
          onClick={() => handleCardClick(voter.id)}
          className="bg-white border border-gray-200 rounded-lg p-2 hover:border-orange-300 hover:shadow-sm cursor-pointer transition-all duration-150"
        >
          <div className="flex items-center justify-between">
            {/* Left Section - Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col items-left">

                <h3 className="font-semibold text-gray-700 text-sm truncate flex items-center gap-1">
                  {/* <FiUser className="text-orange-500 text-lg flex-shrink-0" /> */}
                  {voter.serialNumber && (
                    <span className='text-gray-700'>{voter.serialNumber})</span>
                  )}
                  <div className='flex w-full justify-between'>
                    {voter.voterNameEng ? (
                      <span className="">{voter.name}</span>
                    ) : (
                      <span className=''><TranslatedText>{voter.name || 'N/A'}</TranslatedText></span>
                    )}
                    {voter.voterId && (
                      <span className='text-gray-700 text-sm'>{voter.voterId}</span>
                    )}
                  </div>

                </h3>
                <div className='flex  justify-between w-full'>
                  {voter.name && voter.voterNameEng && (
                    <div className="text-sm font-semibold text-gray-700 truncate">{voter.voterNameEng}</div>
                  )}

                  <div className=''>
                    {/* Age & Gender */}
                    {voter.age && (
                      <span className="text-gray-800 font-semibold text-sm ">
                        {voter.age}
                      </span>
                    )}

                    {voter.gender && (
                      <span className="text-orange-700 font-bold text-sm capitalize">
                        |{voter.gender}
                      </span>
                    )}

                    {voter.boothNumber && (
                      <span className="ml-2 text-gray-700 text-sm ">
                        बू.क्र.{voter.boothNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Voting Status Badge */}
                {/* {voter.hasVoted !== undefined && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${voter.hasVoted
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                    }`}>
                    {voter.hasVoted ? (
                      <FiCheckCircle className="text-xs" />
                    ) : (
                      <FiXCircle className="text-xs" />
                    )}
                    {voter.hasVoted ? 'Voted' : 'Not Voted'}
                  </span>
                )} */}
              </div>

              {/* Tertiary Info Row */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {/* Phone */}
                {/* {voter.phone ? (
                  <span className="flex items-center gap-1">
                    <FiPhone className="text-xs" />
                    {formatPhone(voter.phone)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-400">
                    <FiPhone className="text-xs" />
                    No Phone
                  </span>
                )} */}

                {/* Village/Location */}
                {/* {voter.village && (
                  <span className="flex items-center gap-1 truncate max-w-[100px]">
                    <FiMapPin className="text-xs" />
                    {voter.village}
                  </span>
                )} */}

                {/* Father Name */}
                {/* {voter.fatherName && (
                  <span className="hidden sm:inline">
                    S/O {voter.fatherName}
                  </span>
                )} */}
              </div>

              {/* Bottom Row - IDs */}
              <div className="flex items-center text-xs text-gray-400 ">
                {/* <FiMapPin className="text-orange-500 font-bold flex-shrink-0 text-xs" />
                {voter.boothNumber && (
                  <span className="flex items-center bg-orange-100 gap-1 ml-1 text-orange-500 px-1.5 rounded">
                    {voter.boothNumber}
                  </span>
                )} */}

                {(voter.pollingStationAddress || voter.yadiBhagAddress) && (
                  <div className="">
                    <div className="flex gap-1 text-xs text-gray-500">
                      <span className="flex">
                        <FiMapPin className="text-orange-500 font-bold  text-xs mr-1" />
                        {voter.pollingStationAddress || voter.yadiBhagAddress}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address - Only show if available and space permits */}


                    </div>
      ))}
                  </div>
                );
});

                VoterList.displayName = 'VoterList';

                export default VoterList;