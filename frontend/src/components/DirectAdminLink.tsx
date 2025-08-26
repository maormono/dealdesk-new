import React from 'react';
import { Link } from 'react-router-dom';

export const DirectAdminLink: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link 
        to="/admin"
        className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600"
      >
        Direct Admin Access (Debug)
      </Link>
    </div>
  );
};