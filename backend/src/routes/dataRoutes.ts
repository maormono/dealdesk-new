import { Router } from 'express';
import { ComprehensiveParser } from '../services/comprehensiveParser.js';
import type { Request, Response } from 'express';

const router = Router();
const parser = new ComprehensiveParser();
let dataLoaded = false;
let allData: any[] = [];

// Middleware to ensure data is loaded
const ensureDataLoaded = async (req: Request, res: Response, next: Function) => {
  if (!dataLoaded) {
    try {
      console.log('Loading data using ComprehensiveParser...');
      allData = await parser.loadAllData();
      dataLoaded = true;
      console.log(`Data loaded: ${allData.length} records`);
    } catch (error) {
      console.error('Error loading data:', error);
      return res.status(500).json({ error: 'Failed to load data' });
    }
  }
  next();
};

// GET /api/data/all
router.get('/all', ensureDataLoaded, (req: Request, res: Response) => {
  res.json({
    success: true,
    count: allData.length,
    data: allData
  });
});

// GET /api/data/search?tadig=GRCPF
router.get('/search', ensureDataLoaded, (req: Request, res: Response) => {
  const { tadig } = req.query;
  
  if (!tadig || typeof tadig !== 'string') {
    return res.status(400).json({ error: 'TADIG parameter required' });
  }
  
  const results = allData.filter(item => 
    item.tadig?.toLowerCase().includes(tadig.toLowerCase())
  );
  
  res.json({
    success: true,
    query: tadig,
    count: results.length,
    data: results
  });
});

// GET /api/data/compare?tadig=GRCPF
router.get('/compare', ensureDataLoaded, (req: Request, res: Response) => {
  const { tadig } = req.query;
  
  if (!tadig || typeof tadig !== 'string') {
    return res.status(400).json({ error: 'TADIG parameter required' });
  }
  
  const results = allData.filter(item => 
    item.tadig === tadig.toUpperCase()
  );
  
  res.json({
    success: true,
    tadig,
    sources: results.map((r: any) => r.source),
    comparison: results,
    bestPrice: results.length > 0 ? 
      Math.min(...results.map((r: any) => r.dataPerMB)) : null
  });
});

export { router as dataRouter };