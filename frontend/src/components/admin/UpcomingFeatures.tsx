import React, { useState, useEffect, useRef } from 'react';
import { GripVertical, Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';
import { upcomingFeaturesService, type UpcomingFeature, type FeatureStatus, type CreateFeatureInput } from '../../services/upcomingFeaturesService';
import { useAuth } from '../../contexts/AuthContext';

const statusColors: Record<FeatureStatus, { bg: string; text: string; label: string }> = {
  planned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Planned' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
};

export const UpcomingFeatures: React.FC = () => {
  const { user } = useAuth();
  const [features, setFeatures] = useState<UpcomingFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // New feature form
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<FeatureStatus>('planned');
  const [isSaving, setIsSaving] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<FeatureStatus>('planned');

  const dragRef = useRef<HTMLDivElement>(null);

  // All users who can view the roadmap can delete features

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await upcomingFeaturesService.getFeatures();
      setFeatures(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load features');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    // Reorder in local state
    const newFeatures = [...features];
    const draggedIndex = newFeatures.findIndex(f => f.id === draggedId);
    const targetIndex = newFeatures.findIndex(f => f.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    // Remove dragged item and insert at target position
    const [draggedItem] = newFeatures.splice(draggedIndex, 1);
    newFeatures.splice(targetIndex, 0, draggedItem);

    setFeatures(newFeatures);
    setDraggedId(null);

    // Save new order to database
    try {
      await upcomingFeaturesService.reorderFeatures(newFeatures.map(f => f.id));
    } catch (err) {
      // Revert on error
      setError('Failed to save order');
      loadFeatures();
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleAddNew = async () => {
    if (!newTitle.trim()) return;

    setIsSaving(true);
    try {
      const input: CreateFeatureInput = {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        status: newStatus,
      };
      await upcomingFeaturesService.createFeature(input, user?.email);
      await loadFeatures();
      setNewTitle('');
      setNewDescription('');
      setNewStatus('planned');
      setIsAddingNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (feature: UpcomingFeature) => {
    setEditingId(feature.id);
    setEditTitle(feature.title);
    setEditDescription(feature.description || '');
    setEditStatus(feature.status);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
    setEditStatus('planned');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    setIsSaving(true);
    try {
      await upcomingFeaturesService.updateFeature(editingId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        status: editStatus,
      });
      await loadFeatures();
      handleCancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) return;

    try {
      await upcomingFeaturesService.deleteFeature(id);
      await loadFeatures();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feature');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Roadmap</h3>
          <p className="text-sm text-gray-500 mt-1">Drag and drop to reorder by priority</p>
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Feature
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Add New Feature Form */}
      {isAddingNew && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Add New Feature</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Feature title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as FeatureStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAddNew}
                disabled={isSaving || !newTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => { setIsAddingNew(false); setNewTitle(''); setNewDescription(''); setNewStatus('planned'); }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features List */}
      <div ref={dragRef} className="space-y-2">
        {features.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No features yet. Click "Add Feature" to get started.
          </div>
        ) : (
          features.map((feature, index) => (
            <div
              key={feature.id}
              draggable={editingId !== feature.id}
              onDragStart={(e) => handleDragStart(e, feature.id)}
              onDragOver={(e) => handleDragOver(e, feature.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, feature.id)}
              onDragEnd={handleDragEnd}
              className={`
                p-4 bg-white rounded-lg border transition-all
                ${draggedId === feature.id ? 'opacity-50 border-blue-400' : 'border-gray-200'}
                ${dragOverId === feature.id ? 'border-blue-500 border-2 bg-blue-50' : ''}
                ${editingId !== feature.id ? 'cursor-grab active:cursor-grabbing' : ''}
              `}
            >
              {editingId === feature.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-center gap-3">
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as FeatureStatus)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving || !editTitle.trim()}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start gap-3">
                  <div className="flex items-center text-gray-400 mt-1">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                      <h4 className="font-medium text-gray-900">{feature.title}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[feature.status].bg} ${statusColors[feature.status].text}`}>
                        {statusColors[feature.status].label}
                      </span>
                    </div>
                    {feature.description && (
                      <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Added by {feature.created_by || 'unknown'} on {new Date(feature.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(feature)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(feature.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
