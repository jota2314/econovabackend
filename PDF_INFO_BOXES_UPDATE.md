# PDF Information Boxes Update

## Changes Made to `src/lib/utils/estimate-pdf-generator.ts`

### ✅ **Added 3 Information Boxes Above Estimate Details**

#### **Box 1: CONTRACTOR INFO**
- **Content**: American Building Technologies
- **Address**: 619 Main St, Wilmington, MA 01887
- **Email**: HVAC@abtinsulation.com
- **Phone**: 978-598-7125

#### **Box 2: BILL TO**
- **Content**: MOC Inc. (Making Opportunity Count)
- **Address**: 601 River St, Fitchburg, MA 01420
- **Email**: energyservices@mocinc.org
- **Phone**: 978-342-7025

#### **Box 3: CUSTOMER INFO** (Dynamic)
- **Name**: Uses `data.customerName` from estimate data
- **Address**: Dynamically builds from `data.projectAddress`, `data.projectCity`, `data.projectState`, `data.projectZipCode`
- **Phone**: Uses `data.customerPhone` from estimate data

### 🎨 **Design Features**

#### **Brand Colors (Matching Estimate Table)**
- **Header Background**: `rgb(34, 139, 34)` - Dark green
- **Content Background**: `rgb(144, 238, 144)` - Light green with 10% opacity
- **Header Text**: White text for contrast
- **Content Text**: Black text for readability
- **Borders**: Dark green borders matching the brand

#### **Layout**
- **3 equal-width boxes** across the page
- **10px spacing** between boxes
- **25px height** per box
- **8px header section** with white text on dark green
- **17px content section** with black text on light green background
- **Positioned above** the "ESTIMATE DETAILS" section

### 🔧 **Technical Implementation**
- Used `infoBoxHeight` and `infoBoxWidth` variables to avoid naming conflicts
- Proper opacity management with `pdf.setGState()`
- Dynamic customer information from estimate data
- Consistent spacing and typography
- Border styling matching brand guidelines

### 📋 **Result**
The PDF now includes professional information boxes that:
- ✅ **Match Econova brand colors** exactly like the estimate table
- ✅ **Display contractor information** prominently
- ✅ **Show billing information** clearly
- ✅ **Include dynamic customer data** from the estimate
- ✅ **Maintain professional layout** with proper spacing
- ✅ **Positioned above estimate details** as requested

### 🧪 **Testing**
- ✅ **Build successful** - no compilation errors
- ✅ **Variable naming resolved** - no conflicts
- ✅ **Ready for PDF generation** testing

## Next Steps
1. Start development server
2. Navigate to Jobs page
3. Generate estimate PDF
4. Verify the new information boxes appear correctly above estimate details
