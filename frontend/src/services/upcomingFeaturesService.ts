import { supabase } from '../lib/supabase';

export type FeatureStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface UpcomingFeature {
  id: string;
  title: string;
  description?: string;
  priority: number;
  status: FeatureStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFeatureInput {
  title: string;
  description?: string;
  status?: FeatureStatus;
}

class UpcomingFeaturesService {
  /**
   * Get all features ordered by priority
   */
  async getFeatures(): Promise<UpcomingFeature[]> {
    const { data, error } = await supabase
      .from('upcoming_features')
      .select('*')
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching features:', error);
      throw new Error(`Failed to fetch features: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new feature
   */
  async createFeature(input: CreateFeatureInput, userEmail?: string): Promise<UpcomingFeature> {
    // Get the max priority to add at the end
    const { data: maxData } = await supabase
      .from('upcoming_features')
      .select('priority')
      .order('priority', { ascending: false })
      .limit(1);

    const newPriority = maxData && maxData.length > 0 ? maxData[0].priority + 1 : 0;

    const { data, error } = await supabase
      .from('upcoming_features')
      .insert({
        title: input.title,
        description: input.description || null,
        status: input.status || 'planned',
        priority: newPriority,
        created_by: userEmail || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feature:', error);
      throw new Error(`Failed to create feature: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a feature
   */
  async updateFeature(id: string, updates: Partial<Pick<UpcomingFeature, 'title' | 'description' | 'status'>>): Promise<UpcomingFeature> {
    const { data, error } = await supabase
      .from('upcoming_features')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating feature:', error);
      throw new Error(`Failed to update feature: ${error.message}`);
    }

    return data;
  }

  /**
   * Reorder features by updating priorities
   */
  async reorderFeatures(orderedIds: string[]): Promise<void> {
    // Update each feature with its new priority
    const updates = orderedIds.map((id, index) => ({
      id,
      priority: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('upcoming_features')
        .update({ priority: update.priority })
        .eq('id', update.id);

      if (error) {
        console.error('Error reordering feature:', error);
        throw new Error(`Failed to reorder features: ${error.message}`);
      }
    }
  }

  /**
   * Delete a feature (only allowed for specific users via RLS)
   */
  async deleteFeature(id: string): Promise<void> {
    const { error } = await supabase
      .from('upcoming_features')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting feature:', error);
      throw new Error(`Failed to delete feature: ${error.message}`);
    }
  }
}

export const upcomingFeaturesService = new UpcomingFeaturesService();
