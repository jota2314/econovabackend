# Spray Foam CRM

A comprehensive, production-ready CRM system for spray foam insulation contractors serving Massachusetts and New Hampshire. Features advanced measurement tools, automated pricing calculations, and integrated communication workflows.

## Features

### Lead & Customer Management
- Complete lead management with Supabase integration
- Lead tracking with status updates and priority levels
- Customer contact information management
- Lead conversion tracking and analytics

### Communication Tools
- Click-to-call functionality through Twilio
- SMS messaging with pre-built templates
- Communication history tracking
- Call recording integration
- Email notifications via Resend

### Measurement & Estimation System
- Interactive measurement interface with real-time calculations
- Support for 5 insulation types:
  - Closed Cell Spray Foam (R-6 to R-7 per inch)
  - Open Cell Spray Foam (R-3.5 to R-3.7 per inch)
  - Fiberglass Batt (R-2.9 to R-3.8 per inch)
  - Fiberglass Blown-in (R-2.2 to R-4.3 per inch)
  - Hybrid Systems (R-4.5 to R-6.5 per inch)
- Multiple wall dimension tracking with field arrays
- Automatic square footage calculations
- Real-time pricing display with dynamic rate lookup

### Estimate Generation
- Comprehensive estimate builder with detailed breakdowns
- Prep work calculations and fire retardant applications
- Complexity multipliers for challenging installations
- Discount and tax calculations
- Professional PDF estimate generation
- Material cost breakdown with labor estimates

### Job Management
- Job creation from leads and estimates
- Job status tracking throughout project lifecycle
- Measurement data integration with job records
- Progress tracking and completion status

### Dashboard & Analytics
- Professional dashboard interface with key metrics
- Lead statistics and conversion rates
- Recent activity tracking
- Performance analytics and insights
- Responsive design for mobile and desktop access

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Tech Stack

- **Framework**: Next.js 15.5.0 with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Communication**: Twilio (Voice & SMS)
- **Email**: Resend
- **UI Components**: Radix UI
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **PDF Generation**: jsPDF
- **Deployment**: Vercel

## Prerequisites

Before running this application, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- Twilio account with phone number
- Resend account for email notifications

## Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd spray-foam-crm
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Resend Configuration
RESEND_API_KEY=your_resend_api_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Set up your Supabase database tables (see Database Schema section below)

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with auto-fix
- `npm run lint:check` - Run ESLint without fixing
- `npm run typecheck` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run test` - Run Jest tests
- `npm run test:coverage` - Generate test coverage report
- `npm run clean` - Clean build artifacts

## Database Schema

The application requires the following Supabase tables:

### Core Tables
- `leads` - Customer lead information and status tracking
- `customers` - Converted customer records
- `jobs` - Active and completed job records
- `estimates` - Generated estimates with pricing details
- `measurements` - Measurement data for insulation projects

### Communication Tables
- `communications` - Call and SMS history
- `call_recordings` - Call recording metadata and links

### System Tables
- `users` - User authentication and profile data
- `settings` - Application configuration

## Key API Endpoints

- `GET/POST /api/leads` - Lead management
- `GET/POST /api/jobs` - Job operations
- `POST /api/jobs/[id]/estimate` - Estimate generation
- `GET /api/pricing/insulation` - Dynamic pricing data
- `POST /api/twilio/call` - Initiate calls
- `POST /api/twilio/sms` - Send SMS messages

## Project Structure (Reorganized)

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   └── dashboard/                # Dashboard pages
├── components/                   # React components
│   ├── analytics/                # Analytics components
│   ├── common/                   # Shared components (ErrorBoundary, LoadingSkeleton)
│   ├── dashboard/                # Dashboard components
│   └── ui/                       # Base UI components
├── hooks/                        # Custom React hooks
│   └── business/                 # Business logic hooks (useLeads, useJobs)
├── lib/                          # Core library code
│   ├── business/                 # Business rules and workflows
│   │   ├── rules/                # Business validation rules
│   │   └── workflows/            # State transition logic
│   ├── constants/                # Business constants and pricing
│   ├── config/                   # Configuration files (env validation)
│   ├── errors/                   # Custom error classes
│   ├── services/                 # Service layer
│   │   ├── analytics/            # Analytics services
│   │   └── business/             # Business domain services
│   └── utils/                    # Utility functions
│       ├── calculations/         # Business calculations
│       ├── formatting/           # Data formatting
│       └── validation/           # Input validation (Zod schemas)
├── providers/                    # React context providers
└── types/                        # TypeScript type definitions
    ├── api/                      # API response types
    ├── business/                 # Business domain types
    └── ui/                       # UI component types
```

## Measurement System

The measurement interface supports:
- Multiple wall dimensions with dynamic field arrays
- Real-time square footage calculations
- 5 insulation type options with specific R-values
- Automatic pricing lookups based on material and thickness
- Prep work and complexity factor calculations

## Pricing Calculator

Dynamic pricing system with:
- Tiered pricing based on R-value requirements
- Material-specific rate structures
- Bulk quantity discounts
- Regional pricing adjustments
- Real-time quote generation

## Deployment

The application is configured for Vercel deployment:

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on git push

Environment variables needed in production:
- All `.env.local` variables
- `NEXT_PUBLIC_APP_URL` should point to your domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` to ensure code quality
5. Commit and push your changes
6. Create a pull request

## License

This project is private and proprietary.
