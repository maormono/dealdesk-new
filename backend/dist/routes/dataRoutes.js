import { Router } from 'express';
import { DataLoader } from '../services/dataLoader.js';
const router = Router();
const dataLoader = new DataLoader();
let dataLoaded = false;
// Middleware to ensure data is loaded
const ensureDataLoaded = async (req, res, next) => {
    if (!dataLoaded) {
        try {
            await dataLoader.loadAllData();
            dataLoaded = true;
        }
        catch (error) {
            console.error('Error loading data:', error);
            return res.status(500).json({ error: 'Failed to load data' });
        }
    }
    next();
};
// GET /api/data/all
router.get('/all', ensureDataLoaded, (req, res) => {
    const data = dataLoader.getAllData();
    res.json({
        success: true,
        count: data.length,
        data
    });
});
// GET /api/data/search?tadig=GRCPF
router.get('/search', ensureDataLoaded, (req, res) => {
    const { tadig } = req.query;
    if (!tadig || typeof tadig !== 'string') {
        return res.status(400).json({ error: 'TADIG parameter required' });
    }
    const results = dataLoader.searchByTadig(tadig);
    res.json({
        success: true,
        query: tadig,
        count: results.length,
        data: results
    });
});
// GET /api/data/compare?tadig=GRCPF
router.get('/compare', ensureDataLoaded, (req, res) => {
    const { tadig } = req.query;
    if (!tadig || typeof tadig !== 'string') {
        return res.status(400).json({ error: 'TADIG parameter required' });
    }
    const results = dataLoader.getComparison(tadig);
    res.json({
        success: true,
        tadig,
        sources: results.map(r => r.source),
        comparison: results,
        bestPrice: results.length > 0 ?
            Math.min(...results.map(r => r.dataPerMB)) : null
    });
});
export { router as dataRouter };
//# sourceMappingURL=dataRoutes.js.map