import React from 'react';

interface NotesDisplayProps {
  notes: string | undefined;
  operator: string;
}

// Note categories with icons and standardized display
const noteCategories = {
  // Network Restrictions
  'no permanent roaming': {
    icon: '🚫',
    label: 'No permanent roaming',
    description: 'Network doesn\'t allow permanent M2M roaming',
    severity: 'high'
  },
  'prohibited': {
    icon: '⛔',
    label: 'Network blocked',
    description: 'Prohibited network, cannot be used',
    severity: 'critical'
  },
  'blocked': {
    icon: '⛔',
    label: 'Network blocked',
    description: 'Prohibited network, cannot be used',
    severity: 'critical'
  },
  'no resale': {
    icon: '🔒',
    label: 'No resale',
    description: 'Cannot resell on domestic market',
    severity: 'high'
  },
  'no resell': {
    icon: '🔒',
    label: 'No resale',
    description: 'Cannot resell on domestic market',
    severity: 'high'
  },
  
  // Service Limitations
  'data unavailable': {
    icon: '📵',
    label: 'Data unavailable',
    description: 'Data service not launched on this network',
    severity: 'medium'
  },
  'data not launched': {
    icon: '📵',
    label: 'Data unavailable',
    description: 'Data service not launched on this network',
    severity: 'medium'
  },
  'limited services': {
    icon: '⚠️',
    label: 'Limited services',
    description: 'Some services not available',
    severity: 'medium'
  },
  'services not available': {
    icon: '⚠️',
    label: 'Limited services',
    description: 'Some services not available',
    severity: 'medium'
  },
  
  // Cost Related
  'access fee': {
    icon: '💰',
    label: 'Has access fee',
    description: 'Monthly IMSI/Access fee applies',
    severity: 'low'
  },
  'imsi fee': {
    icon: '💰',
    label: 'Has IMSI fee',
    description: 'Monthly IMSI/Access fee applies',
    severity: 'low'
  },
  
  // Special markers
  'xx': {
    icon: '⛔',
    label: 'Highly restricted',
    description: 'Multiple restrictions apply',
    severity: 'critical'
  },
  'x': {
    icon: '⚠️',
    label: 'Restricted',
    description: 'Some restrictions apply',
    severity: 'medium'
  }
};

const operatorColors = {
  'A1': 'text-blue-600 bg-blue-50 border-blue-200',
  'Telefonica': 'text-red-600 bg-red-50 border-red-200',
  'Tele2': 'text-purple-600 bg-purple-50 border-purple-200',
  'Monogoto': 'text-green-600 bg-green-50 border-green-200'
};

export const NotesDisplay: React.FC<NotesDisplayProps> = ({ notes, operator }) => {
  if (!notes) return null;
  
  // Find matching category
  const lowerNotes = notes.toLowerCase();
  let matchedCategory = null;
  
  for (const [key, category] of Object.entries(noteCategories)) {
    if (lowerNotes.includes(key)) {
      matchedCategory = category;
      break;
    }
  }
  
  // If no category matched, show original note
  if (!matchedCategory) {
    return (
      <div className="text-xs text-gray-600">
        {notes}
      </div>
    );
  }
  
  const colorClass = operatorColors[operator as keyof typeof operatorColors] || 'text-gray-600 bg-gray-50 border-gray-200';
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${colorClass}`}>
      <span className="text-sm">{matchedCategory.icon}</span>
      <span className="font-medium">{matchedCategory.label}</span>
    </div>
  );
};

export const NotesDictionary: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes Dictionary & Legend</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Network Restrictions */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Network Restrictions</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-lg">🚫</span>
              <div>
                <div className="font-medium text-sm text-gray-800">No permanent roaming</div>
                <div className="text-xs text-gray-500">Network doesn't allow permanent M2M roaming</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">⛔</span>
              <div>
                <div className="font-medium text-sm text-gray-800">Network blocked</div>
                <div className="text-xs text-gray-500">Prohibited network, cannot be used</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">🔒</span>
              <div>
                <div className="font-medium text-sm text-gray-800">No resale</div>
                <div className="text-xs text-gray-500">Cannot resell on domestic market</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Service Limitations */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Service Limitations</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-lg">📵</span>
              <div>
                <div className="font-medium text-sm text-gray-800">Data unavailable</div>
                <div className="text-xs text-gray-500">Data service not launched on this network</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <div className="font-medium text-sm text-gray-800">Limited services</div>
                <div className="text-xs text-gray-500">Some services not available</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Cost Information */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Cost Information</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-lg">💰</span>
              <div>
                <div className="font-medium text-sm text-gray-800">Has access fee</div>
                <div className="text-xs text-gray-500">Monthly IMSI/Access fee applies</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Operator Colors */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Operator Colors</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full">A1</span>
              <span className="text-xs text-gray-600">A1 Telekom Austria</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full">TF</span>
              <span className="text-xs text-gray-600">Telefonica</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-full">T2</span>
              <span className="text-xs text-gray-600">Tele2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};