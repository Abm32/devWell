import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({ onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${loading ? 'opacity-50' : ''}`}
  >
    <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
  </button>
);