
import React from 'react';

interface FormCardProps {
  children: React.ReactNode;
  isMain?: boolean;
}

export const FormCard: React.FC<FormCardProps> = ({ children, isMain }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm mb-4 border border-gray-200 overflow-hidden ${isMain ? 'google-form-card' : ''}`}>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
