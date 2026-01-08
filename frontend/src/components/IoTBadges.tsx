import React from 'react';

interface IoTBadgesProps {
  lteMOperators: string[];
  nbIotOperators: string[];
}

const operatorColors: Record<string, string> = {
  'A1': 'bg-blue-500',
  'Telefonica': 'bg-red-500',
  'Tele2': 'bg-purple-500'
};

export const IoTBadges: React.FC<IoTBadgesProps> = ({ lteMOperators, nbIotOperators }) => {
  const badges = [];

  // CAT-M/LTE-M badge with operator indicators
  if (lteMOperators.length > 0) {
    const operatorDots = lteMOperators.map((op, index) => {
      const color = operatorColors[op] || 'bg-gray-500';
      return (
        <span 
          key={`lte-${op}-${index}`} 
          className={`inline-block w-2 h-2 ${color} rounded-full`}
          title={op}
        />
      );
    });

    badges.push(
      <span 
        key="cat-m"
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded"
      >
        Cat-M
        <span className="inline-flex gap-0.5 ml-1">
          {operatorDots}
        </span>
      </span>
    );
  }

  // NB-IoT badge with operator indicators
  if (nbIotOperators.length > 0) {
    const operatorDots = nbIotOperators.map((op, index) => {
      const color = operatorColors[op] || 'bg-gray-500';
      return (
        <span 
          key={`nb-${op}-${index}`} 
          className={`inline-block w-2 h-2 ${color} rounded-full`}
          title={op}
        />
      );
    });

    badges.push(
      <span 
        key="nb-iot"
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
      >
        NB-IoT
        <span className="inline-flex gap-0.5 ml-1">
          {operatorDots}
        </span>
      </span>
    );
  }

  if (badges.length === 0) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  return (
    <div className="flex gap-1">
      {badges}
    </div>
  );
};