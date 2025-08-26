import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Search networks with pricing from all sources
 * GET /api/pricing/search?query=australia
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query = '' } = req.query;
    const searchTerm = String(query).toLowerCase();

    // Search networks
    const { data: networks, error } = await supabase
      .from('networks')
      .select(`
        id,
        tadig,
        network_name,
        country,
        network_pricing (
          source_id,
          data_per_mb,
          imsi_access_fee,
          sms_mo,
          voice_moc,
          lte_4g,
          lte_5g,
          pricing_sources (
            source_name,
            currency
          )
        ),
        network_restrictions (
          restriction_type,
          is_active
        )
      `)
      .or(`tadig.ilike.%${searchTerm}%,network_name.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) throw error;

    // Transform data for frontend
    const results = networks?.map(network => {
      const sources: any = {};
      const restrictions: string[] = [];

      // Group pricing by source
      network.network_pricing?.forEach((pricing: any) => {
        const sourceName = pricing.pricing_sources?.source_name;
        if (sourceName) {
          sources[sourceName] = {
            data_per_mb: pricing.data_per_mb,
            imsi_access_fee: pricing.imsi_access_fee,
            sms_mo: pricing.sms_mo,
            voice_moc: pricing.voice_moc,
            currency: pricing.pricing_sources.currency
          };
        }
      });

      // Collect active restrictions
      network.network_restrictions?.forEach((restriction: any) => {
        if (restriction.is_active) {
          restrictions.push(restriction.restriction_type);
        }
      });

      return {
        tadig: network.tadig,
        network_name: network.network_name,
        country: network.country,
        sources,
        restrictions,
        is_prohibited: restrictions.includes('prohibited')
      };
    });

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search networks'
    });
  }
});

/**
 * Get pricing comparison for a specific TADIG
 * GET /api/pricing/compare/AUSTA
 */
router.get('/compare/:tadig', async (req: Request, res: Response) => {
  try {
    const { tadig } = req.params;

    // Use the database function
    const { data, error } = await supabase
      .rpc('get_pricing_comparison', { p_tadig: tadig });

    if (error) throw error;

    // Transform for frontend
    const comparison = {
      tadig,
      sources: {
        A1: data?.find((d: any) => d.source_name === 'A1'),
        Telefonica: data?.find((d: any) => d.source_name === 'Telefonica'),
        Tele2: data?.find((d: any) => d.source_name === 'Tele2')
      }
    };

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing comparison'
    });
  }
});

/**
 * Get all networks with IMSI fees
 * GET /api/pricing/imsi-fees
 */
router.get('/imsi-fees', async (req: Request, res: Response) => {
  try {
    const { source } = req.query;
    
    let query = supabase
      .from('v_networks_with_imsi_fees')
      .select('*');
    
    if (source) {
      query = query.eq('source_name', source);
    }
    
    const { data, error } = await query.order('imsi_access_fee', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
      summary: {
        total_networks: data?.length || 0,
        highest_fee: data?.[0]?.imsi_access_fee || 0,
        sources: [...new Set(data?.map((d: any) => d.source_name) || [])]
      }
    });
  } catch (error) {
    console.error('IMSI fees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get IMSI fees'
    });
  }
});

/**
 * Get pricing by source
 * GET /api/pricing/by-source?source=Tele2
 */
router.get('/by-source', async (req: Request, res: Response) => {
  try {
    const { source = 'all', country, limit = 100 } = req.query;
    
    let query = supabase
      .from('v_network_pricing_all')
      .select('*');
    
    if (source !== 'all') {
      query = query.eq('source_name', source);
    }
    
    if (country) {
      query = query.ilike('country', `%${country}%`);
    }
    
    const { data, error } = await query.limit(Number(limit));

    if (error) throw error;

    // Group by source for summary
    const bySource: any = {};
    data?.forEach((item: any) => {
      const src = item.source_name;
      if (!bySource[src]) {
        bySource[src] = {
          count: 0,
          with_imsi: 0,
          prohibited: 0
        };
      }
      bySource[src].count++;
      if (item.imsi_access_fee > 0) bySource[src].with_imsi++;
      if (item.is_prohibited) bySource[src].prohibited++;
    });

    res.json({
      success: true,
      data,
      summary: bySource
    });
  } catch (error) {
    console.error('By source error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing by source'
    });
  }
});

/**
 * Get restricted networks
 * GET /api/pricing/restrictions
 */
router.get('/restrictions', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('network_restrictions')
      .select(`
        restriction_type,
        description,
        networks (
          tadig,
          network_name,
          country
        )
      `)
      .eq('is_active', true);

    if (error) throw error;

    // Group by restriction type
    const byType: any = {};
    data?.forEach((item: any) => {
      const type = item.restriction_type;
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push({
        tadig: item.networks.tadig,
        network: item.networks.network_name,
        country: item.networks.country,
        description: item.description
      });
    });

    res.json({
      success: true,
      data: byType,
      summary: {
        prohibited: byType.prohibited?.length || 0,
        no_roaming: byType.no_roaming?.length || 0,
        data_not_launched: byType.data_not_launched?.length || 0,
        no_resell: byType.no_resell?.length || 0
      }
    });
  } catch (error) {
    console.error('Restrictions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get restrictions'
    });
  }
});

/**
 * Get Australia-specific pricing (for testing)
 * GET /api/pricing/australia
 */
router.get('/australia', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('v_australia_pricing')
      .select('*')
      .order('tadig');

    if (error) throw error;

    // Format for easy comparison
    const byTadig: any = {};
    data?.forEach((item: any) => {
      if (!byTadig[item.tadig]) {
        byTadig[item.tadig] = {
          network: item.network_name,
          country: item.country,
          sources: {}
        };
      }
      byTadig[item.tadig].sources[item.source_name] = {
        data_per_mb: item.data_per_mb,
        imsi_access_fee: item.imsi_access_fee,
        is_prohibited: item.is_prohibited
      };
    });

    res.json({
      success: true,
      data: byTadig,
      raw: data
    });
  } catch (error) {
    console.error('Australia error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Australia pricing'
    });
  }
});

export default router;