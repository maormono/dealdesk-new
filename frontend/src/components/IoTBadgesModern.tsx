import React from 'react';
import { Wifi, Radio } from 'lucide-react';

interface IoTBadgesProps {
  lteMOperators: string[];
  nbIotOperators: string[];
}

// Monogoto brand colors for operators
const operatorDots = {
  'A1': 'bg-[#5B9BD5]',
  'Telefonica': 'bg-[#EC6B9D]',
  'Tele2': 'bg-[#9B7BB6]',
  'Monogoto': 'bg-[#F5B342]'
};

export const IoTBadgesModern: React.FC<IoTBadgesProps> = ({ lteMOperators, nbIotOperators }) => {
  if (lteMOperators.length === 0 && nbIotOperators.length === 0) {
    return <span className="text-gray-300 text-xs">—</span>;
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      {lteMOperators.length > 0 && (
        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
          <Wifi className="w-3 h-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">CAT-M</span>
          <div className="flex gap-1">
            {lteMOperators.map((op, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${operatorDots[op as keyof typeof operatorDots] || 'bg-gray-400'}`}
                title={op}
              />
            ))}
          </div>
        </div>
      )}
      
      {nbIotOperators.length > 0 && (
        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
          <Radio className="w-3 h-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">NB-IoT</span>
          <div className="flex gap-1">
            {nbIotOperators.map((op, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${operatorDots[op as keyof typeof operatorDots] || 'bg-gray-400'}`}
                title={op}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};