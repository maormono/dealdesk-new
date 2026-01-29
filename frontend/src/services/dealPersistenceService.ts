import { supabase } from '../lib/supabase';
import type { DealRequest, DealEvaluation, SavedDeal, DealFilters, DealStatus } from '../config/dealConfig';

// Evaluation results from all services
export interface EvaluationResults {
  basic_evaluation?: DealEvaluation;
  enhanced_analysis?: any;
  comprehensive_analysis?: any;
}

class DealPersistenceService {
  /**
   * Create a new deal in draft status
   */
  async createDeal(request: DealRequest, userId: string, userEmail: string): Promise<SavedDeal> {
    const { data, error } = await supabase
      .from('deal_evaluations')
      .insert({
        user_id: userId,
        user_email: userEmail,
        status: 'draft',
        deal_request: request,
        sim_quantity: request.simQuantity,
        countries: request.countries,
        monthly_data_per_sim: request.monthlyDataPerSim,
        proposed_price_per_sim: request.proposedPricePerSim,
        currency: request.currency,
        duration_months: request.duration,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating deal:', error);
      throw new Error(`Failed to create deal: ${error.message}`);
    }

    return this.mapToSavedDeal(data);
  }

  /**
   * Update an existing deal's request data
   */
  async updateDeal(dealId: string, request: DealRequest): Promise<SavedDeal> {
    const { data, error } = await supabase
      .from('deal_evaluations')
      .update({
        deal_request: request,
        sim_quantity: request.simQuantity,
        countries: request.countries,
        monthly_data_per_sim: request.monthlyDataPerSim,
        proposed_price_per_sim: request.proposedPricePerSim,
        currency: request.currency,
        duration_months: request.duration,
        // Reset evaluation data when deal is modified
        basic_evaluation: null,
        enhanced_analysis: null,
        comprehensive_analysis: null,
        verdict: null,
        profit_margin: null,
        risk_score: null,
        evaluated_at: null,
        status: 'draft',
      })
      .eq('id', dealId)
      .select()
      .single();

    if (error) {
      console.error('Error updating deal:', error);
      throw new Error(`Failed to update deal: ${error.message}`);
    }

    return this.mapToSavedDeal(data);
  }

  /**
   * Save evaluation results for a deal
   */
  async saveEvaluation(dealId: string, request: DealRequest, results: EvaluationResults): Promise<SavedDeal> {
    const basicEval = results.basic_evaluation;
    const updateData: any = {
      deal_request: request,
      sim_quantity: request.simQuantity,
      countries: request.countries,
      monthly_data_per_sim: request.monthlyDataPerSim,
      proposed_price_per_sim: request.proposedPricePerSim,
      currency: request.currency,
      duration_months: request.duration,
      basic_evaluation: results.basic_evaluation || null,
      enhanced_analysis: results.enhanced_analysis || null,
      comprehensive_analysis: results.comprehensive_analysis || null,
      status: 'evaluated',
      evaluated_at: new Date().toISOString(),
    };

    // Extract key metrics from evaluation
    if (basicEval) {
      updateData.verdict = basicEval.verdict;
      updateData.profit_margin = basicEval.profitMargin;
      updateData.risk_score = basicEval.riskScore;
      updateData.total_contract_value = basicEval.totalMonthlyRevenue * request.duration;
    }

    const { data, error } = await supabase
      .from('deal_evaluations')
      .update(updateData)
      .eq('id', dealId)
      .select()
      .single();

    if (error) {
      console.error('Error saving evaluation:', error);
      throw new Error(`Failed to save evaluation: ${error.message}`);
    }

    return this.mapToSavedDeal(data);
  }

  /**
   * Get all deals for a specific user
   */
  async getUserDeals(userId: string): Promise<SavedDeal[]> {
    const { data, error } = await supabase
      .from('deal_evaluations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user deals:', error);
      throw new Error(`Failed to fetch deals: ${error.message}`);
    }

    return (data || []).map(this.mapToSavedDeal);
  }

  /**
   * Get a single deal by ID
   */
  async getDealById(dealId: string): Promise<SavedDeal | null> {
    const { data, error } = await supabase
      .from('deal_evaluations')
      .select('*')
      .eq('id', dealId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching deal:', error);
      throw new Error(`Failed to fetch deal: ${error.message}`);
    }

    return this.mapToSavedDeal(data);
  }

  /**
   * Update deal status
   */
  async updateDealStatus(dealId: string, status: DealStatus): Promise<void> {
    const updateData: any = { status };

    if (status === 'finalized') {
      updateData.finalized_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('deal_evaluations')
      .update(updateData)
      .eq('id', dealId);

    if (error) {
      console.error('Error updating deal status:', error);
      throw new Error(`Failed to update deal status: ${error.message}`);
    }
  }

  /**
   * Get all deals (admin only - for audit)
   */
  async getAllDeals(filters?: DealFilters): Promise<SavedDeal[]> {
    let query = supabase
      .from('deal_evaluations')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.userEmail) {
        query = query.ilike('user_email', `%${filters.userEmail}%`);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.verdict) {
        query = query.eq('verdict', filters.verdict);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.searchQuery) {
        // Search in deal ID or user email
        query = query.or(`id.ilike.%${filters.searchQuery}%,user_email.ilike.%${filters.searchQuery}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all deals:', error);
      throw new Error(`Failed to fetch deals: ${error.message}`);
    }

    return (data || []).map(this.mapToSavedDeal);
  }

  /**
   * Delete a deal (soft delete by archiving)
   */
  async archiveDeal(dealId: string): Promise<void> {
    await this.updateDealStatus(dealId, 'archived');
  }

  /**
   * Map database row to SavedDeal interface
   */
  private mapToSavedDeal(row: any): SavedDeal {
    return {
      id: row.id,
      user_id: row.user_id,
      user_email: row.user_email,
      deal_name: row.deal_name,
      status: row.status,
      deal_request: row.deal_request,
      basic_evaluation: row.basic_evaluation,
      enhanced_analysis: row.enhanced_analysis,
      comprehensive_analysis: row.comprehensive_analysis,
      sim_quantity: row.sim_quantity,
      countries: row.countries || [],
      monthly_data_per_sim: row.monthly_data_per_sim,
      proposed_price_per_sim: row.proposed_price_per_sim,
      currency: row.currency,
      duration_months: row.duration_months,
      verdict: row.verdict,
      profit_margin: row.profit_margin,
      risk_score: row.risk_score,
      total_contract_value: row.total_contract_value,
      created_at: row.created_at,
      updated_at: row.updated_at,
      evaluated_at: row.evaluated_at,
      finalized_at: row.finalized_at,
    };
  }
}

// Export singleton instance
export const dealPersistenceService = new DealPersistenceService();
