import { Router } from 'express';
import multer from 'multer';
import { A1Parser } from '../services/parsers/a1Parser.js';
const router = Router();
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
        }
    },
});
// POST /api/files/upload
router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { originalname, buffer, mimetype } = req.file;
        console.log(`Processing file: ${originalname} (${mimetype})`);
        // Determine parser based on file format or source
        const fileFormat = req.body.format || 'a1'; // Default to A1 format
        let parsedData;
        switch (fileFormat.toLowerCase()) {
            case 'a1':
                const a1Parser = new A1Parser();
                parsedData = await a1Parser.parseFile(buffer);
                break;
            // Add more parsers here for Telefonica, Tele2, etc.
            default:
                return res.status(400).json({ error: `Unsupported file format: ${fileFormat}` });
        }
        console.log(`Successfully parsed ${parsedData.length} pricing records`);
        res.json({
            success: true,
            filename: originalname,
            recordCount: parsedData.length,
            data: parsedData,
        });
    }
    catch (error) {
        console.error('File upload error:', error);
        next(error);
    }
});
// GET /api/files/formats
router.get('/formats', (req, res) => {
    res.json({
        formats: [
            {
                id: 'a1',
                name: 'A1 Telekom Austria',
                description: 'A1 pricing format with IMSI sponsoring',
                supported: true,
            },
            {
                id: 'telefonica',
                name: 'Telefonica',
                description: 'Telefonica O2 pricing format',
                supported: false, // Coming soon
            },
            {
                id: 'tele2',
                name: 'Tele2',
                description: 'Tele2 data fee analysis format',
                supported: false, // Coming soon
            },
        ],
    });
});
export { router as fileRouter };
//# sourceMappingURL=fileRoutes.js.map