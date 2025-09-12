# 🏗️ Spray Foam CRM System - Claude Code Session Prompt

## 📋 **Project Overview**

You're working on **Econova Backend** - a comprehensive spray foam insulation CRM system built with **Next.js 15**, **TypeScript**, **Supabase**, and **Tailwind CSS**. This is a production-ready application for managing spray foam insulation projects, from lead generation to estimate approval.

## 🎯 **Current Status & Recent Work**

**✅ RECENTLY COMPLETED (Major Refactoring):**
- **Tax Removal**: Completely removed all tax calculations system-wide (no taxes anywhere)
- **Performance Optimization**: 50-70% improvement in database queries and API responses
- **Code Refactoring**: Centralized authentication, consolidated routes, removed duplicate code
- **Hybrid Insulation Support**: Fixed database constraints to support hybrid spray foam systems
- **Invoice-Style Estimates**: Full-page estimate view with editable pricing
- **Authentication Middleware**: Centralized role-based access control

## 🏢 **Business Context**

**Company**: Spray foam insulation contractor in Massachusetts/New Hampshire
**Core Services**: Closed cell foam, open cell foam, hybrid systems, HVAC, plaster
**Workflow**: Lead → Job → Measurements → Estimate → Approval → Work completion

## 🛠️ **Tech Stack & Architecture**

**Frontend**: Next.js 15 with Turbopack, React 19, TypeScript
**Backend**: Next.js API routes, Supabase PostgreSQL
**UI**: Tailwind CSS, Radix UI components, Lucide React icons
**Auth**: Supabase Auth with role-based permissions (manager/salesperson)
**Database**: PostgreSQL with proper relationships and constraints

## 📊 **Database Schema (Key Tables)**

```sql
- users (id, email, full_name, role, commission_rate)
- leads (id, name, phone, email, status, assigned_to, address)  
- jobs (id, lead_id, job_name, service_type, building_type, total_square_feet)
- measurements (id, job_id, room_name, height, width, square_feet, insulation_type, r_value)
- estimates (id, job_id, estimate_number, subtotal, total_amount, status, markup_percentage)
- estimate_line_items (id, estimate_id, description, quantity, unit_price, line_total)
```

## 🔧 **Key Features & Functionality**

### **Lead Management**
- Lead pipeline with status tracking (new → contacted → measured → quoted → won/lost)
- CSV import, manual entry, role-based filtering
- Communication history (calls, SMS, emails via Twilio)

### **Job & Measurement System**
- Multi-service support (insulation, HVAC, plaster)
- Field measurements with room-by-room calculations
- Automatic square footage calculations (height × width)
- **Insulation Types**: closed_cell, open_cell, hybrid (with dual thickness support)
- Photo uploads, notes, measurement locking when estimates approved

### **Pricing & Estimates**
- **NO TAX CALCULATIONS** (recently removed completely)
- Dynamic pricing based on R-value and insulation type
- Markup percentage application (default 6.25%)
- Manager approval required for estimates > $10,000
- **Invoice-style estimate view** with editable square footage and pricing

### **Role-Based System**
- **Managers**: Full access, approve estimates, view all data
- **Salesperson**: Own leads/jobs only, create estimates
- Centralized auth middleware handles permissions

## 📁 **Key File Structure**

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── estimates/         # Estimate CRUD & approval
│   │   ├── jobs/             # Jobs & measurements
│   │   └── analytics/        # Performance metrics
│   ├── dashboard/            # Main application pages
│   │   ├── jobs/            # Job management
│   │   ├── leads/           # Lead pipeline
│   │   └── estimate-approvals/ # Manager approval workflow
├── components/
│   ├── measurements/        # Measurement interface & estimate builder
│   ├── dashboard/          # Dashboard components
│   └── ui/                # Reusable UI components
├── lib/
│   ├── middleware/auth.ts  # Centralized authentication (NEW)
│   ├── services/          # Business logic services
│   ├── utils/            # Pricing calculator, PDF generator
│   └── supabase/        # Database connection
```

## 🚨 **Important Technical Details**

### **Recent Major Changes**
1. **Tax System Removed**: All pricing shows subtotal as final total (no tax anywhere)
2. **Auth Middleware**: `src/lib/middleware/auth.ts` - use `requireAuth()` and `requireManagerRole()`
3. **Hybrid Insulation**: Database constraint fixed, supports "hybrid" insulation type
4. **Optimized Queries**: Analytics service optimized, N+1 query problems fixed

### **Database Constraints & Business Rules**
- Measurements can be locked when estimate is approved (prevents changes)
- Estimate approval workflow: draft → pending_approval → approved/rejected
- Total square feet auto-calculated from measurements
- Insulation pricing varies by R-value and type

### **Pricing Logic** (NO TAX)
```typescript
// Closed cell: $1.80-$8.70/sq ft (based on R-value)
// Open cell: $1.65-$3.50/sq ft (based on R-value)  
// Hybrid: Average of both types
// Final total = subtotal + markup% (NO TAX)
```

## 🎨 **UI/UX Standards**

- **Clean, professional contractor-focused design**
- **Invoice-style layouts** for estimates
- **Role-based UI** (different views for managers vs salespeople)
- **Real-time calculations** and updates
- **Mobile-responsive** design patterns

## ⚡ **Performance Notes**

- Uses Next.js 15 with Turbopack for fast builds
- Optimized database queries (recent refactoring)
- Parallel API calls where possible
- Centralized auth reduces duplicate code

## 🔐 **Security & Permissions**

- **Row-level security** via Supabase policies
- **Role-based access** (manager vs salesperson)
- **Estimate locking** prevents changes after approval
- **User ownership** validation on sensitive operations

## 📋 **Current Development Priorities**

1. **Bug Fixes**: Address any functionality issues
2. **UI Polish**: Improve user experience and workflows  
3. **Performance**: Continue optimizing slow queries
4. **Features**: Add requested business functionality
5. **Testing**: Ensure all workflows function correctly

## 🚀 **Getting Started**

The application is **production-ready** and recently refactored. Key commands:
- `npm run dev` - Development with Turbopack
- Database is hosted on Supabase (all tables exist)
- Authentication and permissions are fully configured

## 💡 **Working with This System**

- **Always check user roles** when building features
- **Use the auth middleware** instead of duplicating auth code  
- **Remember: NO TAX CALCULATIONS** anywhere in the system
- **Test with both manager and salesperson roles**
- **Follow the existing patterns** for consistency

## 🎯 **Success Metrics**

The system should enable:
- ✅ Efficient lead-to-job conversion workflow
- ✅ Accurate measurements and pricing 
- ✅ Streamlined estimate approval process
- ✅ Real-time collaboration between sales and management
- ✅ Professional customer-facing estimates

---

**Ready to build amazing spray foam CRM functionality! 🚀**