src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth pages group
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/               # Main app pages
│   │   ├── leads/
│   │   ├── jobs/
│   │   ├── measurements/
│   │   ├── communications/
│   │   ├── reports/
│   │   └── settings/
│   ├── api/                     # API routes
│   │   ├── twilio/
│   │   ├── leads/
│   │   └── measurements/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── leads/
│   │   ├── LeadTable.tsx
│   │   ├── LeadForm.tsx
│   │   └── LeadImport.tsx
│   ├── measurements/
│   │   ├── MeasurementForm.tsx
│   │   ├── RoomMeasurements.tsx
│   │   └── PhotoUpload.tsx
│   ├── communications/
│   │   ├── CallButton.tsx
│   │   ├── SMSForm.tsx
│   │   └── EmailTemplates.tsx
│   └── dashboard/
│       ├── StatsCards.tsx
│       ├── ActivityFeed.tsx
│       └── CommissionTracker.tsx
├── lib/                         # Utilities
│   ├── supabase.ts             # Supabase client
│   ├── twilio.ts               # Twilio integration
│   ├── validations.ts          # Zod schemas
│   ├── calculations.ts         # Square footage calculations
│   └── utils.ts                # General utilities
├── hooks/                       # Custom hooks
│   ├── useLeads.ts
│   ├── useMeasurements.ts
│   └── useCommunications.ts
└── types/                       # TypeScript types
    ├── database.ts
    ├── leads.ts
    └── measurements.ts