# Insulation Pricing Refactor

This directory contains the refactored insulation measurement pricing logic that centralizes pricing calculations into a single orchestrator function.

## Overview

The pricing logic has been refactored to eliminate duplication and provide a single source of truth for insulation pricing calculations. The new system uses dependency injection to make testing easier and provides a clear precedence order.

## Files Created

### Core Orchestrator
- **`determine-unit-price.ts`** - Main orchestrator function that applies pricing precedence
- **`fetchDbUnitPrice.ts`** - Client helper to fetch database pricing via API

### API Endpoint
- **`../app/api/pricing/insulation/unit/route.ts`** - Server-only API endpoint for database pricing

## Pricing Precedence

The `determineUnitPrice()` function applies pricing in this order:

1. **Manager override** - Highest precedence, if set by manager
2. **Database price** - From pricing catalog if available  
3. **Hybrid system** - For hybrid insulation with ccInches/ocInches
4. **Per-inch pricing** - For closed/open cell with inches data
5. **Per-R-value fallback** - Static pricing tables as last resort

## Usage

### Basic Usage
```typescript
import { determineUnitPrice } from '@/lib/pricing/determine-unit-price'
import { fetchDbUnitPrice } from '@/lib/pricing/fetchDbUnitPrice'

const result = await determineUnitPrice({
  sqft: 1000,
  kind: "closed_cell",
  r: 25,
  ccInches: 3.5,
  override: 6.50, // Manager override
  // Injected helpers
  getDbUnitPrice: fetchDbUnitPrice,
  hybridPerSqft: (cc, oc) => calculateHybridPricing(calculateHybridRValue(cc, oc)).totalPricePerSqft,
  perInch: (sqft, kind, inches) => calculatePriceByInches(sqft, kind, inches).pricePerSqft,
  perRValue: (sqft, kind, r) => calculateMeasurementPrice(sqft, kind, r).pricePerSqft
})

// result.unitPrice = 6.50 (from override)
// result.source = "override"
```

### Integration with measurement-interface.tsx

The measurement interface now uses this orchestrator via a feature flag:

```typescript
// Feature flag controls which pricing system to use
const USE_NEW_PRICING = process.env.NEXT_PUBLIC_USE_NEW_PRICING === 'true' || false

// In useEffect:
if (USE_NEW_PRICING) {
  calculateRealtimePriceWithOrchestrator()
} else {
  calculateRealtimePriceAsync() // Old logic
}
```

## Feature Flag

Set the environment variable to enable new pricing:

```bash
# Enable new pricing system
NEXT_PUBLIC_USE_NEW_PRICING=true

# Disable (use old system) 
NEXT_PUBLIC_USE_NEW_PRICING=false
```

## API Endpoint

The new API endpoint provides server-side database pricing:

```typescript
POST /api/pricing/insulation/unit
{
  "kind": "closed_cell",
  "r": 25,
  "ccInches": 3.5,
  "ocInches": 0
}

// Response:
{
  "success": true,
  "price": 5.70,
  "details": { ... }
}
```

## Benefits

1. **Single source of truth** - All pricing logic centralized in one function
2. **Clear precedence** - Explicit ordering of pricing methods
3. **Dependency injection** - Easy to test and mock different pricing sources
4. **Feature flag** - Safe rollback if issues arise
5. **Server-side security** - Database pricing stays on server
6. **Maintainable** - Future pricing changes only need to touch one place

## Future Plans

- Refactor `estimate-builder.tsx` to also use `determineUnitPrice()`
- Add HVAC pricing orchestrator following same pattern
- Consider adding pricing audit logs to track which method was used

## Migration Notes

- Old pricing logic is preserved and still functional
- Feature flag allows gradual rollout and easy rollback
- All existing functionality remains identical when flag is disabled
- estimate-builder.tsx continues to use old logic for now (will be refactored later)
