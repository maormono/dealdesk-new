# DealDesk

Sales pricing analysis tool for Monogoto - Built on Monogoto OS framework.

## Overview

DealDesk is a specialized application for analyzing telecom operator pricing, managing deals, and providing AI-powered recommendations for the sales team.

## Features

- 📊 **Pricing Analysis** - Compare operator pricing across multiple sources
- 📈 **Deal Evaluation** - Analyze deal profitability and risk
- 🤖 **AI Recommendations** - Powered by Google Gemini for intelligent insights
- 📁 **Excel Parsing** - Support for A1, Telefonica, and Tele2 formats
- 🔐 **Role-Based Access** - Secure access for sales team members
- 📱 **Technology Tracking** - Monitor 2G/3G/4G/5G/IoT capabilities

## Architecture

DealDesk is built on top of Monogoto OS framework and uses:
- **@monogoto/auth** - Authentication and authorization
- **@monogoto/types** - Shared TypeScript types
- **@monogoto/parsers** - Excel and CSV parsing

## Setup

### Prerequisites

1. Monogoto OS framework must be installed:
```bash
cd ../monogoto-os
npm install
npm run build
```

2. Environment variables:

Create `.env` files in both frontend and backend directories:

**frontend/.env:**
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

**backend/.env:**
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Installation

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

## Development

### Frontend (React + TypeScript)
```bash
cd frontend
npm run dev        # Start dev server on http://localhost:5173
npm run build      # Build for production
npm run lint       # Run linter
```

### Backend (Node.js + Express)
```bash
cd backend
npm run dev        # Start dev server on http://localhost:3001
npm run build      # Build TypeScript
npm run start      # Run production build
```

## Project Structure

```
dealdesk/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/    # DealDesk specific components
│   │   ├── pages/        # Application pages
│   │   ├── services/     # Business logic services
│   │   └── config/       # Deal evaluation configuration
│   └── package.json
├── backend/           # Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # DealDesk specific parsers
│   │   └── index.ts     # Server entry point
│   └── package.json
└── package.json       # Root workspace config
```

## Data Sources

DealDesk processes pricing data from:
- **A1 Format**: `202509_Country Price List A1 IMSI Sponsoring.xlsx`
- **Telefonica Format**: `20250205 Monogoto TGS UK V1.xlsx`
- **Tele2 Format**: `Tele2 data fee June-23 analysis.xlsx`

## API Endpoints

### File Processing
- `POST /api/files/upload` - Upload and parse Excel files
- `GET /api/files/formats` - Get supported file formats

### Data Management
- `GET /api/data/pricing` - Retrieve pricing data
- `POST /api/data/analyze` - Analyze deal profitability

## Deployment

DealDesk is deployed on:
- **Frontend**: Netlify
- **Backend**: Development only (to be deployed)
- **Database**: Supabase Cloud

## Support

For issues or questions, contact the Monogoto development team.

## License

Private - Monogoto Internal Use Only