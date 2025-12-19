import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BulkSurveyModal from '../Components/BulkSurveyModal';

const BulkSurveyPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { surname, voters } = state || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Bulk Survey{surname ? ` — ${surname}` : ''}</h2>
          <div>
            <button onClick={() => navigate('/lists')} className="px-3 py-1 bg-white border rounded">Back to Lists</button>
          </div>
        </div>

        {!voters || voters.length === 0 ? (
          <div className="bg-white p-6 rounded border text-center">
            <p className="text-gray-600">No surname group provided. Open a surname group from the Lists page and click "Bulk Survey".</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-gray-700">This page allows you to run a bulk survey on {voters.length} voters in the <strong>{surname}</strong> group. Use the modal below to pick category/caste/support status and save results to Firestore.</div>
            <BulkSurveyModal open={true} onClose={() => navigate('/lists')} surname={surname} voters={voters} onSaved={() => navigate('/lists')} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkSurveyPage;