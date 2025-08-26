# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DealDesk is an operator pricing analysis platform for Monogoto, currently in the planning phase. The comprehensive Product Requirements Document (PRD v2.0) is located at `dealdesk-complete-prd.md`.

## Current State

**Stage 1 MVP Completed** - Basic file upload and parsing functionality implemented:
- ✅ Frontend: React + TypeScript + Vite with Tailwind CSS
- ✅ Backend: Node.js + Express API with TypeScript
- ✅ A1 format Excel parser implemented
- ✅ File upload UI with drag-and-drop
- ✅ Pricing data display cards
- Sample operator data files (A1, Telefonica, Tele2 formats) for testing

## Planned Technology Stack

### Frontend
- React 18+ with TypeScript
- Tailwind CSS for styling
- Recharts/D3.js for visualizations
- React Query for state management
- Netlify hosting

### Backend
- Supabase (PostgreSQL) for database
- Node.js serverless functions for API
- Python microservices for ML/AI components
- Supabase Auth for authentication

## Key Implementation Guidelines

### When Setting Up Development Environment
1. Initialize as a monorepo or separate frontend/backend repositories
2. Use TypeScript for type safety
3. Configure ESLint and Prettier for code consistency
4. Set up environment variables for Supabase and API keys

### Database Schema
The complete database schema is defined in the PRD. Key tables include:
- `operators`: TADIG-based network identification
- `pricing_records`: Operator pricing with technology capabilities
- `deal_analyses`: Deal evaluations with profitability metrics
- `volume_discounts`: Tier-based pricing structures

### File Parsing Requirements
Must support multiple Excel formats:
- A1 format: See `202509_Country Price List A1 IMSI Sponsoring.xlsx`
- Telefonica format: See `20250205 Monogoto TGS UK V1.xlsx`
- Tele2 format: See `Tele2 data fee June-23 analysis.xlsx`

Each format has unique structure requiring specific parsers.

### Core Features Priority
1. File upload and parsing (MVP)
2. Basic pricing comparison
3. Deal profitability analysis
4. Risk assessment
5. AI-powered recommendations
6. Game theory models

### API Design Patterns
- RESTful endpoints for CRUD operations
- WebSocket for real-time collaboration
- Serverless functions for file processing
- Separate microservices for ML models

### Testing Requirements
When implementing, ensure:
- Unit tests for all parsers
- Integration tests for API endpoints
- E2E tests for critical user flows
- Test with actual sample data files provided

## Development Commands

### Setup (IMPORTANT: Fix npm permissions first if needed)
```bash
# If you get npm permission errors, run:
sudo chown -R $(whoami) ~/.npm

# Then install dependencies:
cd frontend && npm install
cd ../backend && npm install
```

### For Frontend (React/TypeScript)
```bash
cd frontend
npm install        # Install dependencies
npm run dev        # Start development server (http://localhost:5173)
npm run build      # Build for production (tsc -b && vite build)
npm run lint       # Lint code with ESLint
npm run preview    # Preview production build locally
```

### For Backend (Node.js/TypeScript)
```bash
cd backend
npm install        # Install dependencies
npm run dev        # Start development server with tsx watch (http://localhost:3001)
npm run build      # Build TypeScript to dist/ folder
npm run start      # Run built JavaScript from dist/
npm run test       # Run tests with vitest
npm run lint       # Lint code with ESLint
npm run typecheck  # Type checking without emitting files
```

### Quick Start Both Servers
```bash
# From root directory (uses npm workspaces and concurrently):
npm run dev

# Individual workspace commands:
npm run dev:frontend
npm run dev:backend

# Or use the helper script:
./start-dev.sh
```

### Testing Commands
```bash
# Backend tests (vitest)
cd backend && npm run test

# Run linting across all workspaces
npm run lint

# Build all workspaces
npm run build
```

### Database Setup
```bash
# After Supabase CLI installation
supabase init      # Initialize project
supabase start     # Start local development
supabase db push   # Apply migrations
```

## Important Implementation Notes

1. **TADIG Codes**: Use official TADIG codes for network identification (format: MCCMNC)
2. **Currency Handling**: Always store amounts in smallest unit (cents) and currency code
3. **Rate Calculations**: Consider technology (2G/3G/4G/5G) capabilities in pricing
4. **Risk Metrics**: Implement both statistical and game theory models
5. **File Processing**: Handle large files asynchronously with progress tracking
6. **Security**: Never expose Supabase service keys or API keys in frontend code

## Current Architecture

### Frontend Structure (React + TypeScript + Vite)
- **Main App**: React Router with authentication-protected routes
- **Key Components**:
  - `PricingTable`: Main database view with search and filtering
  - `AIAdvisorAdvanced`: AI-powered pricing recommendations using Google Gemini
  - `DealReviewTabs`: Multi-tab interface for deal analysis 
  - `FileUpload`: Drag-and-drop file processing interface
  - `ProtectedRoute`: Authentication wrapper component
- **Services**:
  - `aiService.ts`: Google Gemini AI integration
  - `dealEvaluationService.ts`: Deal profitability calculations
- **Authentication**: Supabase Auth with custom login flows

### Backend Structure (Node.js + Express + TypeScript)
- **API Routes**:
  - `/api/files/*`: File upload and parsing endpoints
  - `/api/data/*`: Pricing data CRUD operations
  - `/health`: Health check endpoint
- **Services**:
  - `comprehensiveParser.ts`: Multi-format Excel parser (A1, Telefonica, Tele2)
  - `dataLoader.ts`: Database operations and caching
  - `parsers/a1Parser.ts`: A1-specific parsing logic
- **Middleware**: CORS, Helmet, rate limiting, file size limits

### Data Flow
1. Excel files uploaded via frontend drag-and-drop
2. Backend parses multiple formats using format-specific parsers
3. Data normalized to `NetworkPricing` interface with TADIG mapping
4. Frontend displays searchable pricing cards with technology capabilities
5. AI integration provides recommendations based on deal parameters

### Key Data Types
```typescript
interface NetworkPricing {
  tadig: string;           // Official TADIG code
  country: string;
  network: string;         // Normalized operator name
  imsiCost: number;        // One-time IMSI fee
  dataPerMB: number;       // Per-MB data cost
  gsm?: boolean;           // Technology capabilities
  gprs2G?: boolean;
  umts3G?: boolean;
  lte4G?: boolean;
  lte5G?: boolean;
  lteM?: boolean;
  nbIot?: boolean;
  currency: string;
  source: 'A1' | 'Telefonica' | 'Tele2';
  restrictions?: string;
  specialInstructions?: string;
}
```

## Architecture Decisions

- **Serverless First**: Use serverless functions for scalability
- **Type Safety**: TypeScript throughout for maintainability
- **Real-time Updates**: Leverage Supabase real-time for collaboration
- **Progressive Enhancement**: Start with basic features, add AI/ML incrementally
- **Mobile Responsive**: Design desktop-first but ensure mobile compatibility

## Environment Variables

The application requires these environment variables:

### Frontend (.env in frontend/)
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_google_gemini_api_key
```

### Backend (.env in backend/)
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## File Processing Details

The system handles three distinct Excel formats:

### A1 Format (`202509_Country Price List A1 IMSI Sponsoring.xlsx`)
- Sheet: `prices A1 WS`
- Headers at row 8, data starts row 9
- Comprehensive technology matrix (GSM, GPRS, UMTS, LTE, 5G, LTE-M, NB-IoT)
- Includes closure dates for 2G/3G networks
- EUR currency, detailed restrictions column

### Telefonica Format (`20250205 Monogoto TGS UK V1.xlsx`)  
- Sheet: `Format All`
- Headers at row 1, data starts row 2
- Technology status: Live/Unavailable/In Progress
- USD currency, includes resale status
- Voice pricing (MOC/MTC) included

### Tele2 Format (`Tele2 data fee June-23 analysis.xlsx`)
- Multiple possible sheet names checked automatically
- Customer usage analysis format
- USD currency, network usage statistics
- Minimal technology details (defaults to 3G/4G)

## AI Integration

- **Google Gemini**: Used for deal analysis and pricing recommendations
- **Service Location**: `frontend/src/services/aiService.ts`
- **Key Features**: Natural language deal evaluation, risk assessment, competitive analysis
- **API Integration**: Direct frontend-to-Gemini calls (no backend proxy)

## Recent Changes (August 2025)

### Logo and Branding Updates
- **NEW LOGO**: Replaced IAI logo with new colorful Monogoto logo across all components
  - Updated in: `App.tsx`, `Login.tsx`, `LoginCustom.tsx`
  - File: `frontend/src/assets/monogoto-logo.svg` (colorful design with blue, purple, pink, orange elements)
  - Backup of old logo: `frontend/src/assets/iai-logo.svg.backup`

### UI/UX Improvements
- **Header Layout**:
  - Reduced DealDesk text size from `text-2xl` to `text-xl`
  - Added `whitespace-nowrap` to all navigation buttons to prevent text wrapping
  - Updated button colors from bright/colorful to neutral grays and slate colors for professional appearance
  - Replaced user email display with circular avatar (first letter + gradient background)
  - Admin users get purple shield badge on avatar
  - Sign out button now icon-only with hover tooltip

- **Statistics Cards**:
  - Reduced all number font sizes from `text-2xl` to `text-xl`
  - Changed layout from stacked to inline (number + label on same line)
  - Reduced card padding from `p-5` to `p-4` for more compact design
  - Applied to: Networks, Countries, IMSI Access, Average Price, IoT Enabled cards

- **Currency Selector**:
  - Reordered buttons: USD now appears first (left), EUR second (right)
  - Changed default currency from EUR to USD
  - Updated in: `frontend/src/components/PricingTable.tsx`

### Footer Updates
- Updated copyright year from 2024 to 2025
- Moved "MVP v1.0" version indicator from header to footer
- New footer layout: "© 2025 Monogoto - DealDesk Platform | 📄 MVP v1.0"

### Technical Architecture
- All changes maintain TypeScript type safety
- Responsive design principles preserved
- No breaking changes to API or data structures
- Environment variables properly configured for production deployment

### Deployment
- Changes successfully pushed to GitHub repository: `https://github.com/maormono/dealdesk`
- Netlify auto-deployment configured for production: `https://deal-desk.netlify.app/`
- All environment variables configured for Supabase integration

## References

- Main PRD: `dealdesk-complete-prd.md`
- Sample data files in root directory for parser testing
- Supabase documentation: https://supabase.com/docs
- React Query: https://tanstack.com/query/latest
- Google Gemini API: https://ai.google.dev/docs