import { XCircle, AlertTriangle } from 'lucide-react';

interface RemovalLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RemovalLimitModal({ isOpen, onClose }: RemovalLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Removal Limit Reached</h2>
              <p className="text-sm text-gray-500">Job removal limit exceeded</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sorry, you can't remove more jobs
            </h3>
            <p className="text-gray-600 leading-relaxed">
              You've reached the maximum limit of <span className="font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">100 job removals</span>. 
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Need to remove more jobs?</strong> Contact our support team for assistance.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Got it
            </button>
            <button
              onClick={() => {
                // You can add contact support functionality here
                window.open('mailto:support@flashfirehq.com?subject=Job Removal Limit Exceeded', '_blank');
                onClose();
              }}
              className="flex-1 bg-orange-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
