# Spray Foam Insulation CRM

## Business Overview
Construction company specializing in spray foam insulation and HVAC systems serving Massachusetts and New Hampshire. Need a complete sales CRM to track leads, manage measurements, and automate follow-ups.

## User Personas
- **Salesperson**: Makes calls, schedules measurements, takes photos, calculates sq ft
- **Manager**: Oversees pipeline, tracks commissions, analyzes performance
- **Operations** (future): Receives handoffs, manages installations

## Core Workflow
1. **Lead Import**: CSV upload or manual entry
2. **Outreach**: Call/SMS/Email from the app
3. **Measurement**: On-site or from drawings
   - Multiple rooms per job
   - Height × Width = Square feet
   - Photo per wall (optional)
   - Structural framing selection
4. **Quote**: Auto-calculate based on measurements
5. **Proposal**: Send to customer
6. **Handoff**: Email all data to operations
7. **Commission**: Track frontend/backend payments

## Key Business Rules
- Commission split: Frontend (when profitable) + Backend (when completed)
- Measurement types: Walls vs Ceilings (different pricing)
- Structural options: 2x4, 2x6, 2x8, 2x10, 2x12 framing
- Service area: Massachusetts and New Hampshire only
- Lead sources: Drive-by prospecting, building permits, referrals