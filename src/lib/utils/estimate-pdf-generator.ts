import jsPDF from 'jspdf'

// Extend jsPDF type to include GState methods
declare module 'jspdf' {
  interface jsPDF {
    setGState(state: any): void
    GState(options: { opacity: number }): any
  }
}
import { formatCurrency, calculateMeasurementPrice, type InsulationType } from './pricing-calculator'
import { calculateHybridRValue, calculateHybridPricing, formatHybridSystemDescription } from './hybrid-calculator'

// Helper function to format area type for display (removes underscores and capitalizes)
function formatAreaType(areaType: string): string {
  return areaType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// ---- Small helpers to keep logic consistent across grouped and fallback paths ----

function formatInchesForHybrid(closedInches?: number, openInches?: number): string {
  const cc = Number(closedInches) || 0
  const oc = Number(openInches) || 0
  const total = cc + oc
  if (total <= 0) return 'N/A'
  const formatted = Number.isInteger(total) ? `${total}` : `${total.toFixed(1)}`
  return `${formatted}"`
}

function mapMineralWoolInchesFromR(rValue: unknown): number {
  const rv = typeof rValue === 'string' ? parseFloat(rValue) : Number(rValue)
  if (rv === 15) return 3
  if (rv === 25) return 6
  return 0
}

function drawHybridBreakdownCentered(
  pdf: jsPDF,
  centerX: number,
  startY: number,
  closedInches?: number,
  openInches?: number
) {
  let nextY = startY
  pdf.setFontSize(7)
  pdf.setTextColor(100, 100, 100)
  const hybridCalc = calculateHybridRValue(closedInches || 0, openInches || 0)
  if (hybridCalc.closedCellInches > 0) {
    pdf.text(`• ${hybridCalc.closedCellInches} in Closed Cell`, centerX, nextY, { align: 'center' })
    nextY += 4
  }
  if (hybridCalc.openCellInches > 0) {
    pdf.text(`• ${hybridCalc.openCellInches} in Open Cell`, centerX, nextY, { align: 'center' })
  }
  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(8)
}

/**
 * Approximate R-values to common insulation standards
 */
function approximateRValue(rValue: number): number {
  // Common R-value targets for approximation
  const commonRValues = [
    13, 15, 19, 21, 25, 30, 38, 49, 60, 70, 80, 90, 100
  ]
  
  // Find the closest common R-value
  let closest = commonRValues[0]
  let minDifference = Math.abs(rValue - closest)
  
  for (const commonR of commonRValues) {
    const difference = Math.abs(rValue - commonR)
    if (difference < minDifference) {
      minDifference = difference
      closest = commonR
    }
  }
  
  return closest
}

/**
 * Format currency without decimal places (rounded to whole dollars)
 */
function formatCurrencyWhole(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(amount))
}

/**
 * Convert image URL to base64 for PDF embedding
 */
async function imageToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting image to base64:', error)
    throw error
  }
}

interface EstimateData {
  jobName: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  projectAddress?: string
  projectCity?: string
  projectState?: string
  projectZipCode?: string
  buildingType?: string
  projectType?: string
  salespersonName?: string
  salespersonEmail?: string
  salespersonPhone?: string
  companyWebsite?: string
  measurements: Array<{
    room_name: string
    floor_level?: string | null
    area_type?: string | null
    surface_type: string
    square_feet: number
    height: number
    width: number
    insulation_type?: InsulationType | 'hybrid'
    r_value?: string | number | null
    framing_size?: string | null
    closed_cell_inches?: number
    open_cell_inches?: number
    blown_in_inches?: number
    is_hybrid_system?: boolean
    photo_url?: string
  }>
  jobPhotos?: string[]
  generatedDate: Date
  validUntil?: Date
  notes?: string
  groupedMeasurements?: Record<string, any>
  groupOverrides?: Record<string, any>
  overrideTotal?: number
}

export async function generateEstimatePDF(data: EstimateData & { returnBuffer?: boolean }): Promise<void | Uint8Array> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = margin

  // Add company logo
  try {
    const logoWidth = 50
    const logoHeight = 20
    const logoX = 15
    const logoY = 10
    
    // Load logo from file system (server-side safe)
    const fs = await import('fs')
    const path = await import('path')
    
    const logoPath = path.join(process.cwd(), 'public', 'logo1.png')
    
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath)
      const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
      
      pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight)
      console.log('✅ Logo successfully added to PDF')
    } else {
      throw new Error('Logo file not found at: ' + logoPath)
    }
    
  } catch (error) {
    console.log('❌ Logo loading failed:', error)
    // Fallback: Show company name instead of logo
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('ECONOVA ENERGY SAVINGS', 15, 25)
  }
  
  pdf.setTextColor(0, 0, 0) // Black text
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold') // Make estimate info bold
  
  // Generate estimate number
  const estimateNumber = `EST-${data.generatedDate.getFullYear()}${String(data.generatedDate.getMonth() + 1).padStart(2, '0')}${String(data.generatedDate.getDate()).padStart(2, '0')}-${String(data.generatedDate.getHours()).padStart(2, '0')}${String(data.generatedDate.getMinutes()).padStart(2, '0')}`
  
  // Header right side - Estimate number and date (BOLD)
  pdf.text(`Estimate #: ${estimateNumber}`, pageWidth - 70, 20)
  pdf.text(`Generated: ${data.generatedDate.toLocaleDateString()}`, pageWidth - 70, 25)

  yPosition = 40

  // Reset text color for body
  pdf.setTextColor(0, 0, 0)

  // Add Information Boxes (Contractor, Customer) - Removed Bill To
  const infoBoxHeight = 25
  const infoBoxWidth = (pageWidth - (margin * 2) - 10) / 2 // 2 boxes with 10px spacing between
  const boxSpacing = 10
  
  // Reset opacity for boxes
  pdf.setGState(pdf.GState({opacity: 1}))
  
  // Box 1: CONTRACTOR INFO
  let boxX = margin
  pdf.setFillColor(34, 139, 34) // Dark green header
  pdf.rect(boxX, yPosition, infoBoxWidth, 8, 'F')
  
  pdf.setFillColor(144, 238, 144) // Light green background
  pdf.setGState(pdf.GState({opacity: 0.1}))
  pdf.rect(boxX, yPosition + 8, infoBoxWidth, infoBoxHeight - 8, 'F')
  pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity
  
  // Border
  pdf.setDrawColor(34, 139, 34)
  pdf.setLineWidth(0.5)
  pdf.rect(boxX, yPosition, infoBoxWidth, infoBoxHeight, 'S')
  
  // Header text
  pdf.setTextColor(255, 255, 255) // White text
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CONTRACTOR INFO', boxX + 2, yPosition + 5.5)
  
  // Content
  pdf.setTextColor(0, 0, 0) // Black text
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Econova Energy Savings', boxX + 2, yPosition + 12)
  pdf.text('619 Main St, Wilmington, MA', boxX + 2, yPosition + 16)
  pdf.text('jorge@econovaenergysavings.com', boxX + 2, yPosition + 20)
  pdf.text('781-732-4817', boxX + 2, yPosition + 24)
  
  // Box 2: CUSTOMER INFO (moved to second position)
  boxX = margin + infoBoxWidth + boxSpacing
  pdf.setFillColor(34, 139, 34) // Dark green header
  pdf.rect(boxX, yPosition, infoBoxWidth, 8, 'F')
  
  pdf.setFillColor(144, 238, 144) // Light green background
  pdf.setGState(pdf.GState({opacity: 0.1}))
  pdf.rect(boxX, yPosition + 8, infoBoxWidth, infoBoxHeight - 8, 'F')
  pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity
  
  // Border
  pdf.setDrawColor(34, 139, 34)
  pdf.rect(boxX, yPosition, infoBoxWidth, infoBoxHeight, 'S')
  
  // Header text
  pdf.setTextColor(255, 255, 255) // White text
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CUSTOMER INFO', boxX + 2, yPosition + 5.5)
  
  // Content
  pdf.setTextColor(0, 0, 0) // Black text
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.text(data.customerName || 'Customer Name', boxX + 2, yPosition + 12)
  
  if (data.customerEmail) {
    pdf.text(data.customerEmail, boxX + 2, yPosition + 16)
  }
  
  if (data.customerPhone) {
    pdf.text(data.customerPhone, boxX + 2, yPosition + 20)
  }
  
  // Move yPosition past the boxes
  yPosition += infoBoxHeight + 5
  
  // Project Address Box (green box like info boxes)
  const projectBoxWidth = pageWidth - (margin * 2)
  const projectBoxHeight = 18 // Compact size
  
  // Build full project address
  let fullProjectAddress = ''
  if (data.projectAddress) {
    fullProjectAddress = data.projectAddress
    if (data.projectCity || data.projectState || data.projectZipCode) {
      const cityStateZip = [data.projectCity, data.projectState, data.projectZipCode].filter(Boolean).join(', ')
      fullProjectAddress += ', ' + cityStateZip
    }
  } else if (data.projectCity || data.projectState || data.projectZipCode) {
    fullProjectAddress = [data.projectCity, data.projectState, data.projectZipCode].filter(Boolean).join(', ')
  }
  
  if (!fullProjectAddress) {
    fullProjectAddress = 'Project Address Not Specified'
  }
  
  // Green header
  pdf.setFillColor(34, 139, 34) // Dark green header
  pdf.rect(margin, yPosition, projectBoxWidth, 6, 'F')
  
  // Light green background
  pdf.setFillColor(144, 238, 144) // Light green background
  pdf.setGState(pdf.GState({opacity: 0.1}))
  pdf.rect(margin, yPosition + 6, projectBoxWidth, projectBoxHeight - 6, 'F')
  pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity
  
  // Border
  pdf.setDrawColor(34, 139, 34)
  pdf.setLineWidth(0.5)
  pdf.rect(margin, yPosition, projectBoxWidth, projectBoxHeight, 'S')
  
  // Header text
  pdf.setTextColor(255, 255, 255) // White text
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PROJECT ADDRESS', margin + 2, yPosition + 4)
  
  // Content text
  pdf.setTextColor(0, 0, 0) // Black text
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  
  // Position address text within the box
  pdf.text(fullProjectAddress, margin + 4, yPosition + 12)
  
  yPosition += projectBoxHeight + 2
  
  // Reduced spacing before insurance statement
  yPosition += 2
  
  // Insurance and Licensing Statement Box (green box without header/title)
  const insuranceStatement = 'Econova Energy Savings is fully licensed and insured. All work will be performed in accordance with OSHA safety regulations. Local building codes will be followed to ensure the highest standards of quality and safety.'
  
  // Calculate box dimensions
  const insuranceBoxWidth = pageWidth - (margin * 2)
  const insuranceBoxHeight = 14 // Made slimmer
  
  // Light green background
  pdf.setFillColor(144, 238, 144) // Light green background
  pdf.setGState(pdf.GState({opacity: 0.1}))
  pdf.rect(margin, yPosition, insuranceBoxWidth, insuranceBoxHeight, 'F')
  pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity
  
  // Border
  pdf.setDrawColor(34, 139, 34)
  pdf.setLineWidth(0.5)
  pdf.rect(margin, yPosition, insuranceBoxWidth, insuranceBoxHeight, 'S')
  
  // Content text (no header)
  pdf.setTextColor(0, 0, 0) // Black text
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  
  // Split text to fit box width with proper margins
  const boxContentWidth = insuranceBoxWidth - 8 // 4px margin on each side
  const statementLines = pdf.splitTextToSize(insuranceStatement, boxContentWidth)
  
  // Position text lines within the box (starting from top since no header)
  let insuranceTextY = yPosition + 6 // Start closer to top
  statementLines.forEach((line: string, index: number) => {
    if (insuranceTextY < yPosition + insuranceBoxHeight - 2) { // Ensure text fits within box
      pdf.text(line, margin + 4, insuranceTextY)
      insuranceTextY += 3.5
    }
  })
  
  yPosition += insuranceBoxHeight + 8
  
  // Reset drawing color and text color for rest of PDF
  pdf.setDrawColor(0, 0, 0)
  pdf.setTextColor(0, 0, 0)

  // Estimate Details Header
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('ESTIMATE DETAILS', margin, yPosition)
  yPosition += 10

  // Table Headers - Enhanced with Inches column
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  // Solid green header without stripes
  pdf.setFillColor(34, 139, 34) // Dark green
  pdf.setGState(pdf.GState({opacity: 0.25})) // Transparent
  pdf.rect(margin, yPosition - 5, pageWidth - (margin * 2), 8, 'F')
  pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity
  
  // Calculate available width
  const availableWidth = pageWidth - (margin * 2)
  
  // Column widths (proportional)
  const descWidth = availableWidth * 0.35 // 35% for Description
  const insulWidth = availableWidth * 0.25 // 25% for Insulation Type
  const inchesWidth = availableWidth * 0.15 // 15% for Inches
  const rValueWidth = availableWidth * 0.12 // 12% for R-Value
  const totalWidth = availableWidth * 0.13 // 13% for Total
  
  // Column positions (left edge)
  const descPos = margin + 2
  const insulPos = descPos + descWidth
  const inchesPos = insulPos + insulWidth
  const rValuePos = inchesPos + inchesWidth
  const totalPos = rValuePos + rValueWidth
  
  // Headers (centered in their columns)
  pdf.text('Description', descPos + descWidth/2, yPosition, { align: 'center' })
  pdf.text('Insulation Type', insulPos + insulWidth/2, yPosition, { align: 'center' })
  pdf.text('Inches', inchesPos + inchesWidth/2, yPosition, { align: 'center' })
  pdf.text('R-Value', rValuePos + rValueWidth/2, yPosition, { align: 'center' })
  pdf.text('Total', totalPos + totalWidth/2, yPosition, { align: 'center' })
  
  yPosition += 8
  pdf.setFont('helvetica', 'normal')

  // Measurement Items - Group like the on-screen Estimate Summary
  let subtotal = 0
  const itemsPerPage = 20
  let itemCount = 0

  // Build grouped data from input if not provided
  const derivedGrouped: Record<string, any> | undefined = (() => {
    if (data.groupedMeasurements && Object.keys(data.groupedMeasurements).length > 0) return undefined
    if (!data.measurements || data.measurements.length === 0) return undefined
    const real = data.measurements.filter(m => !m.room_name.startsWith('Photo:'))
    const groups = real.reduce((acc: Record<string, any>, m: any) => {
      const baseRoomName = m.room_name.replace(/ - Wall \d+$/, '')
      let insulationKey = m.insulation_type || 'unknown'
      if (m.is_hybrid_system) {
        insulationKey = `hybrid-${m.closed_cell_inches || 0}cc-${m.open_cell_inches || 0}oc`
      } else if ((m.closed_cell_inches || 0) > 0) {
        insulationKey = `${m.insulation_type}-${m.closed_cell_inches}in`
      } else if ((m.open_cell_inches || 0) > 0) {
        insulationKey = `${m.insulation_type}-${m.open_cell_inches}in`
      } else if (m.r_value) {
        insulationKey = `${m.insulation_type}-R${m.r_value}`
      }
      const key = `${baseRoomName}-${m.area_type}-${insulationKey}`
      if (!acc[key]) {
        acc[key] = {
          room_name: baseRoomName,
          area_type: m.area_type || 'exterior_walls',
          measurements: [],
          total_square_feet: 0,
          insulation_type: m.insulation_type,
          r_value: m.r_value,
          framing_size: m.framing_size || null,
          is_hybrid_system: m.is_hybrid_system || false,
          closed_cell_inches: m.closed_cell_inches || 0,
          open_cell_inches: m.open_cell_inches || 0,
          wall_count: 0
        }
      }
      acc[key].measurements.push(m)
      acc[key].total_square_feet += (m.square_feet || 0)
      acc[key].wall_count += 1
      return acc
    }, {} as Record<string, any>)
    return groups
  })()

  const groupedSource = data.groupedMeasurements && Object.keys(data.groupedMeasurements).length > 0
    ? data.groupedMeasurements
    : (derivedGrouped || {})
  const overrideSource = data.groupOverrides || {}

  if (Object.keys(groupedSource).length > 0) {
    // Use grouped measurements with override pricing
    Object.entries(groupedSource).forEach(([groupKey, group]: [string, any], index) => {
      // Check if we need a new page
      const rowHeight = group.is_hybrid_system && group.insulation_type === 'hybrid' ? 22 : 10
      if (yPosition > pageHeight - 50 || (itemCount > 0 && itemCount % itemsPerPage === 0)) {
        pdf.addPage()
        yPosition = margin
        
        // Redraw headers on new page
        pdf.setFont('helvetica', 'bold')
        // Solid green header without stripes
        pdf.setFillColor(34, 139, 34) // Dark green
        pdf.setGState(pdf.GState({opacity: 0.25})) // Transparent
        pdf.rect(margin, yPosition - 5, pageWidth - (margin * 2), 8, 'F')
        pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity
        
        pdf.text('Description', margin + 2, yPosition)
        pdf.text('Frame Size', margin + 70, yPosition)
        pdf.text('Insulation Type', margin + 95, yPosition)
        pdf.text('Inches', margin + 135, yPosition)
        pdf.text('R-Value', margin + 160, yPosition)
        pdf.text('Total', margin + 180, yPosition)
        
        yPosition += 8
        pdf.setFont('helvetica', 'normal')
      }

      // Get override prices from UI or database
      const uiOverride = overrideSource?.[groupKey] || {}
      const persistedUnit = (group.measurements[0] as any)?.override_unit_price as number | undefined
      const persistedSqft = (group.measurements[0] as any)?.override_group_sqft as number | undefined

      // Calculate effective square feet and unit price
      const effectiveSqft = typeof uiOverride.sqft === 'number'
        ? uiOverride.sqft
        : (typeof persistedSqft === 'number' ? persistedSqft : group.total_square_feet)

      let unitPrice = 0
      let totalPrice = 0

      if (typeof uiOverride.unitPrice === 'number') {
        unitPrice = uiOverride.unitPrice
      } else if (typeof persistedUnit === 'number') {
        unitPrice = persistedUnit
      } else {
        // Calculate standard price
        if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
          const hybridCalc = calculateHybridRValue(
            group.closed_cell_inches || 0,
            group.open_cell_inches || 0
          )
          const hybridPricing = calculateHybridPricing(hybridCalc)
          unitPrice = hybridPricing.totalPricePerSqft
        } else {
          const pricing = calculateMeasurementPrice(
            effectiveSqft,
            group.insulation_type as InsulationType,
            Number(group.r_value) || 0,
            group.area_type
          )
          unitPrice = pricing?.pricePerSqft || 0
        }
      }

      totalPrice = effectiveSqft * unitPrice

      // Format insulation display (cleaner, without inches here)
      let insulationDisplay = 'N/A'
      if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
        insulationDisplay = 'Hybrid System'
      } else {
        switch (group.insulation_type) {
          case 'closed_cell':
            insulationDisplay = 'Closed Cell Foam'
            break
          case 'open_cell':
            insulationDisplay = 'Open Cell Foam'
            break
          case 'batt':
            insulationDisplay = 'Fiberglass Batt'
            break
          case 'mineral_wool':
            insulationDisplay = 'Mineral Wool Batt'
            break
          case 'blown_in':
            insulationDisplay = 'Blown-in Fiberglass'
            break
          default:
            insulationDisplay = group.insulation_type || 'Insulation'
        }
      }

      // Light green background for all rows
      pdf.setFillColor(144, 238, 144) // Light green
      pdf.setGState(pdf.GState({opacity: 0.1})) // Much more transparent
      pdf.rect(margin, yPosition - 4, pageWidth - (margin * 2), rowHeight, 'F')
      pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity

      pdf.setFontSize(8)
      
      // Enhanced multi-line description
      let primaryDescription = ''
      
      // Build a meaningful description
      if (group.room_name) {
        primaryDescription = group.room_name
      } else {
        primaryDescription = 'Insulation Work'
      }
      
      // Add area type if available  
      if (group.area_type && group.area_type !== 'other') {
        primaryDescription += ` - ${formatAreaType(group.area_type)}`
      }
      
      // Add floor level if available
      if (group.floor_level && group.floor_level !== 'other') {
        primaryDescription += ` (${group.floor_level})`
      }

      // Add framing size if available
      if (group.framing_size) {
        primaryDescription += ` - ${group.framing_size}`
      }
      
      // Create second line with technical details
      let secondLineDetails = ''
      
      // Display primary description (centered)
      pdf.text(primaryDescription, descPos + descWidth/2, yPosition, { align: 'center' })
      
      // Display insulation type (centered)
      pdf.text(insulationDisplay, insulPos + insulWidth/2, yPosition, { align: 'center' })
      
      // Create inches display for dedicated column
      let inchesDisplay = 'N/A'
      if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
        inchesDisplay = formatInchesForHybrid(group.closed_cell_inches, group.open_cell_inches)
      } else {
        // Regular insulation types
        let inches = 0
        
        switch (group.insulation_type) {
          case 'closed_cell':
            inches = Number(group.closed_cell_inches) || 0
            break
          case 'open_cell':
            inches = Number(group.open_cell_inches) || 0
            break
          case 'batt':
            // For batt insulation, use framing size
            const framingToInches: Record<string, number> = {
              '2x4': 3.5, '2x6': 5.5, '2x8': 7.25, '2x10': 9.25, '2x12': 11.25
            }
            inches = group.framing_size ? (framingToInches[group.framing_size] || 0) : 0
            break
          case 'mineral_wool':
            inches = mapMineralWoolInchesFromR(group.r_value)
            break
          case 'blown_in':
            // For blown-in, check if there's a custom thickness
            inches = Number(group.blown_in_inches) || Number(group.closed_cell_inches) || Number(group.open_cell_inches) || 0
            break
        }
        
        if (inches > 0) {
          inchesDisplay = `${inches}"`
        }
      }
      
      // Display inches (centered)
      pdf.text(inchesDisplay, inchesPos + inchesWidth/2, yPosition, { align: 'center' })
      
      // R-Value display with approximation (centered)
      let rValueDisplay = 'N/A'
      if (group.r_value) {
        const rValue = typeof group.r_value === 'string' ? parseFloat(group.r_value) : group.r_value
        const approximatedRValue = approximateRValue(rValue)
        rValueDisplay = `R-${approximatedRValue}`
      }
      pdf.text(rValueDisplay, rValuePos + rValueWidth/2, yPosition, { align: 'center' })
      
      // Calculate proper line positioning to avoid overlaps
      let nextLineY = yPosition + 4
      
      // Display second line with technical details if available
      if (secondLineDetails) {
        pdf.setFontSize(7)
        pdf.setTextColor(100, 100, 100)
        pdf.text(secondLineDetails, margin + 2, nextLineY)
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(8)
        nextLineY += 4 // Move down for next line
      }
      
      // Hybrid system breakdown (on separate, centered lines within Description)
      if (group.is_hybrid_system && group.insulation_type === 'hybrid' && 
          (group.closed_cell_inches || 0) > 0 && (group.open_cell_inches || 0) > 0) {
        pdf.setFontSize(7)
        pdf.setTextColor(100, 100, 100)
        // Center text within description column
        const centerX = descPos + descWidth / 2
        drawHybridBreakdownCentered(
          pdf,
          centerX,
          nextLineY,
          group.closed_cell_inches || 0,
          group.open_cell_inches || 0
        )
      }
      
      if (totalPrice > 0) {
        pdf.text(formatCurrencyWhole(totalPrice), totalPos + totalWidth/2, yPosition, { align: 'right' })
        subtotal += totalPrice
      } else {
        pdf.text('TBD', totalPos + totalWidth/2, yPosition, { align: 'right' })
      }

      // Adjust spacing for hybrid systems
      yPosition += rowHeight
      itemCount++
    })
  } else {
    // Fallback: Use original individual measurements logic
    const realMeasurements = data.measurements.filter(measurement => 
      !measurement.room_name.startsWith('Photo:') && 
      !measurement.room_name.toLowerCase().includes('screenshot')
    )

    realMeasurements.forEach((measurement, index) => {
      // Check if we need a new page (enhanced rows need more space for multi-line descriptions)
      const rowHeight = measurement.is_hybrid_system && measurement.insulation_type === 'hybrid' ? 22 : 10
      if (yPosition > pageHeight - 50 || (itemCount > 0 && itemCount % itemsPerPage === 0)) {
        pdf.addPage()
        yPosition = margin
        
        // Redraw headers on new page
        pdf.setFont('helvetica', 'bold')
        // Solid green header without stripes
        pdf.setFillColor(34, 139, 34) // Dark green
        pdf.setGState(pdf.GState({opacity: 0.25})) // Transparent
        pdf.rect(margin, yPosition - 5, pageWidth - (margin * 2), 8, 'F')
        pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity
        
        pdf.text('Description', margin + 2, yPosition)
        pdf.text('Frame Size', margin + 70, yPosition)
        pdf.text('Insulation Type', margin + 95, yPosition)
        pdf.text('Inches', margin + 135, yPosition)
        pdf.text('R-Value', margin + 160, yPosition)
        pdf.text('Total', margin + 180, yPosition)
        
        yPosition += 8
        pdf.setFont('helvetica', 'normal')
      }

      // Calculate pricing for hybrid and regular systems
      let pricing
      let totalPrice = 0
      let insulationDisplay = 'N/A'

      if (measurement.is_hybrid_system && measurement.insulation_type === 'hybrid') {
        // Calculate hybrid pricing
        const hybridCalc = calculateHybridRValue(
          measurement.closed_cell_inches || 0, 
          measurement.open_cell_inches || 0
        )
        const hybridPricing = calculateHybridPricing(hybridCalc)
        totalPrice = measurement.square_feet * hybridPricing.totalPricePerSqft
        
        insulationDisplay = `Hybrid System`
      } else {
        // Regular system pricing
        pricing = calculateMeasurementPrice(
          measurement.square_feet,
          measurement.insulation_type as InsulationType,
          measurement.r_value ? Number(measurement.r_value) : 0
        )
        totalPrice = pricing?.totalPrice || 0
        
        // Format insulation display (cleaner)
        switch (measurement.insulation_type) {
          case 'closed_cell':
            insulationDisplay = 'Closed Cell Foam'
            break
          case 'open_cell':
            insulationDisplay = 'Open Cell Foam'
            break
          case 'batt':
            insulationDisplay = 'Fiberglass Batt'
            break
          case 'mineral_wool':
            insulationDisplay = 'Mineral Wool Batt'
            break
          case 'blown_in':
            insulationDisplay = 'Blown-in Fiberglass'
            break
          default:
            insulationDisplay = measurement.insulation_type || 'Insulation'
        }
      }

      // Light green background for all rows
      pdf.setFillColor(144, 238, 144) // Light green
      pdf.setGState(pdf.GState({opacity: 0.1})) // Much more transparent
      pdf.rect(margin, yPosition - 4, pageWidth - (margin * 2), rowHeight, 'F')
      pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity

      pdf.setFontSize(8)
      
      // Enhanced multi-line description
      let primaryDescription = ''
      
      // Build a meaningful description
      if (measurement.room_name) {
        primaryDescription = measurement.room_name
      } else {
        primaryDescription = 'Insulation Work'
      }
      
      // Add area type if available  
      if (measurement.area_type && measurement.area_type !== 'other') {
        primaryDescription += ` - ${formatAreaType(measurement.area_type)}`
      }
      
      // Add floor level if available
      if (measurement.floor_level && measurement.floor_level !== 'other') {
        primaryDescription += ` (${measurement.floor_level})`
      }
      
      // Create second line with technical details (removed sq ft and framing details)
      let secondLineDetails = ''
      // Removed framing and sq ft details as requested
      
      // Display primary description
      pdf.text(primaryDescription, margin + 2, yPosition)
      
      // Display insulation type
      pdf.text(insulationDisplay, margin + 70, yPosition)
      
      // Create inches display for dedicated column
      let inchesDisplay = 'N/A'
      if (measurement.is_hybrid_system && measurement.insulation_type === 'hybrid') {
        inchesDisplay = formatInchesForHybrid(measurement.closed_cell_inches, measurement.open_cell_inches)
      } else {
        // Regular insulation types
        let inches = 0
        
        switch (measurement.insulation_type) {
          case 'closed_cell':
            inches = Number(measurement.closed_cell_inches) || 0
            break
          case 'open_cell':
            inches = Number(measurement.open_cell_inches) || 0
            break
          case 'batt':
            // For batt insulation, use framing size
            const framingToInches: Record<string, number> = {
              '2x4': 3.5, '2x6': 5.5, '2x8': 7.25, '2x10': 9.25, '2x12': 11.25
            }
            inches = measurement.framing_size ? (framingToInches[measurement.framing_size] || 0) : 0
            break
          case 'mineral_wool':
            inches = mapMineralWoolInchesFromR(measurement.r_value)
            break
          case 'blown_in':
            // For blown-in, check if there's a custom thickness
            inches = Number(measurement.blown_in_inches) || Number(measurement.closed_cell_inches) || Number(measurement.open_cell_inches) || 0
            break
        }
        
        if (inches > 0) {
          inchesDisplay = `${inches}"`
        }
      }
      
      // Display inches in dedicated column
      pdf.text(inchesDisplay, margin + 115, yPosition)
      
      // R-Value display with approximation
      let rValueDisplay = 'N/A'
      if (measurement.r_value) {
        const rValue = typeof measurement.r_value === 'string' ? parseFloat(measurement.r_value) : measurement.r_value
        const approximatedRValue = approximateRValue(rValue)
        rValueDisplay = `R-${approximatedRValue}`
      }
      pdf.text(rValueDisplay, margin + 140, yPosition)
      
      // Calculate proper line positioning to avoid overlaps
      let nextLineY = yPosition + 4
      
      // Display second line with technical details if available
      if (secondLineDetails) {
        pdf.setFontSize(7)
        pdf.setTextColor(100, 100, 100)
        pdf.text(secondLineDetails, margin + 2, nextLineY)
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(8)
        nextLineY += 4 // Move down for next line
      }
      
      // Hybrid system breakdown (on separate, centered lines within Description)
      if (measurement.is_hybrid_system && measurement.insulation_type === 'hybrid' && 
          (measurement.closed_cell_inches || 0) > 0 && (measurement.open_cell_inches || 0) > 0) {
        pdf.setFontSize(7)
        pdf.setTextColor(100, 100, 100)
        // Center text within description column of fallback table
        const centerX = margin + 2 + (descWidth) / 2
        drawHybridBreakdownCentered(
          pdf,
          centerX,
          nextLineY,
          measurement.closed_cell_inches || 0,
          measurement.open_cell_inches || 0
        )
      }
      
      if (totalPrice > 0) {
        pdf.text(formatCurrencyWhole(totalPrice), totalPos + totalWidth/2, yPosition, { align: 'right' })
        subtotal += totalPrice
      } else {
        pdf.text('TBD', totalPos + totalWidth/2, yPosition, { align: 'right' })
      }

      // Adjust spacing for hybrid systems
      yPosition += rowHeight
      itemCount++
    })
  }

  // Ensure we have room for totals, or add new page
  if (yPosition > pageHeight - 50) {
    pdf.addPage()
    yPosition = margin
  }

  yPosition += 5

  // Totals Section
  pdf.setDrawColor(200, 200, 200)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Subtotal:', pageWidth - margin - 40, yPosition)
  const displaySubtotal = data.overrideTotal !== undefined ? data.overrideTotal : subtotal
  pdf.text(formatCurrencyWhole(displaySubtotal), pageWidth - margin - 5, yPosition, { align: 'right' })
  
  yPosition += 6
  
  // Total - use override total if provided
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  const total = data.overrideTotal !== undefined ? data.overrideTotal : subtotal
  pdf.text('TOTAL:', pageWidth - margin - 40, yPosition)
  pdf.text(formatCurrencyWhole(total), pageWidth - margin - 5, yPosition, { align: 'right' })

  yPosition += 10

  // Terms and Conditions (in red with box)
  const termsText = 'After 15 days of the date above, this estimate is subject to revision and also to readjustment due to manufacturers prices increases. All materials are guaranteed to be as specified. The job will be performed according to drawings and specifications provided.'
  
  // Calculate box dimensions
  const boxPadding = 3 // Even slimmer padding
  const boxWidth = pageWidth - (margin * 2)
  const textWidth = boxWidth - (boxPadding * 2)
  
  // Split text to fit within box
  pdf.setFontSize(7) // Even smaller font size
  pdf.setFont('helvetica', 'normal')
  const termsLines = pdf.splitTextToSize(termsText, textWidth)
  
  // Calculate box height
  const lineHeight = 3.0 // Even tighter line height
  const boxHeight = (termsLines.length * lineHeight) + (boxPadding * 2)
  
  // Check if we need a new page for the box
  if (yPosition + boxHeight > pageHeight - 20) {
    pdf.addPage()
    yPosition = margin
  }
  
  // Draw box border
  pdf.setDrawColor(200, 50, 50) // Lighter red border
  pdf.setLineWidth(0.5) // Thinner border
  pdf.rect(margin, yPosition, boxWidth, boxHeight)
  
  // Optional: Add very light red background
  pdf.setFillColor(255, 250, 250) // Even lighter red background
  pdf.rect(margin, yPosition, boxWidth, boxHeight, 'F')
  
  // Redraw border on top of background
  pdf.setDrawColor(200, 50, 50) // Lighter red border
  pdf.rect(margin, yPosition, boxWidth, boxHeight)
  
  // Add text inside the box
  pdf.setTextColor(200, 50, 50) // Lighter red text color
  
  let textY = yPosition + boxPadding + 3 // Adjusted start position for text
  termsLines.forEach((line: string) => {
    pdf.text(line, margin + boxPadding, textY)
    textY += lineHeight
  })
  
  // Reset text color to black
  pdf.setTextColor(0, 0, 0)
  pdf.setDrawColor(0, 0, 0) // Reset border color
  pdf.setLineWidth(0.1) // Reset line width
  
  yPosition += boxHeight + 10

  // Add "Valid until" and "Thank you" 
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(100, 100, 100)
  
  if (data.validUntil) {
    pdf.text(`Valid until: ${data.validUntil.toLocaleDateString()}`, margin, yPosition)
  }
  
  pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15
  
  // Reset text color
  pdf.setTextColor(0, 0, 0)

  // Only add new page if we don't have enough space for terms (estimate ~150px needed)
  if (yPosition > pageHeight - 150) {
    pdf.addPage()
    yPosition = margin
  } else {
    yPosition += 5 // Add minimal spacing before terms
  }

  // Additional Terms and Conditions - Compact
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Additional Terms and Customer Responsibility', margin, yPosition)
  yPosition += 6

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')

  const terms = [
    {
      number: '1.',
      text: 'It is the customer\'s responsibility to ensure that the following condition is met before work begins: The work area must be free of debris, tools, equipment, storage, and obstructions. Econova is not responsible for any type of damage on personal belongings that remained in the working area.',
      subtext: 'a. There will be a fee of $100/hour if Econova workers need to clean the area before work begins. There will also be a fee of $200 to remove material, equipment, and/or objects that are blocking the workspace.'
    },
    {
      number: '2.',
      text: 'All pre-insulation, pre-hanger, or pre-plastering inspections are to be carried out before work starts. Work delays caused by lack of notice that the inspections are not completed will result in a $500 fee.'
    },
    {
      number: '3.',
      text: 'The electrical wire must be installed tightly so that there is no risk of expanding with the foam. Wires not installed correctly have the risk of being cut when foam excess is being trimmed, which will not be covered by the Econova\'s warranty.'
    },
    {
      number: '4.',
      text: 'All the surfaces on the work area must be free of staples and screws (or the surfaces will not be scrapped).'
    },
    {
      number: '5.',
      text: 'For SPRAY FOAM, the property must be completely vacated when being sprayed and for 24 hours after completing the installation process.'
    },
    {
      number: '6.',
      text: 'All permits and parking licenses are the responsibility of the contractor or owner of the job site.'
    },
    {
      number: '7.',
      text: 'Job sites must have at least one electric power switch, one water switch, and heat. If not, there will be a change in the cost of the work, negotiated between Econova and the client before the beginning of the labor.'
    },
    {
      number: '8.',
      text: 'When the carpentry structure is crooked or with structural problems, Econova is not responsible for the perfect alignment of the plaster in the lines of the walls, ceiling, and floor.'
    },
    {
      number: '9.',
      text: 'When doing blown-in cellulose, certain areas of the siding, drilling holes, and blowing in the insulation could result in some damage to the siding or to the aesthetics of the paint. Interior drill and blow require holes to be drilled on the wall or ceiling and can be a very intrusive and dusty process. For this job to go smoothly, the homeowner must make sure that all furniture and any clothing located in adjacent areas to the exterior walls, ceiling, or slopes (that are being treated) must be moved away from those areas and covered with plastic prior to the beginning of the job.',
      subtext: 'a. Once the insulation is blown in, Econova\'s responsibility will be to plug the access holes and treat the surface with an initial application of a filler. The Customer is responsible for any additional work to those areas, including cleaning, dusting, and painting to achieve the desired finish conditions.'
    },
    {
      number: '10.',
      text: 'All the waste resulting from the work of Insulation, or Hang, or Plaster will be placed in the dumpster of the workplace. If there is a need for garbage collection, a $500 fee will be added.'
    },
    {
      number: '11.',
      text: 'The job should only be rescheduled last minute in case of an EMERGENCY, due to weather conditions, illness, or death of someone who is directly connected to the job. In this case, it\'ll be rescheduled at no cost. Any other reason should be discussed with the Project manager and can result in a charge associated with the rescheduling costs.'
    },
    {
      number: '12.',
      text: 'Econova cannot be responsible for the chemical quality of the applied product but is committed to using products of excellent quality and origin, distributed by structured companies of insulation products.'
    },
    {
      number: '13.',
      text: 'Any changes or additions must be made in writing and will be subject to the same conditions agreed in this contract.'
    },
    {
      number: '14.',
      text: 'Payment schedule:',
      subtext: 'a. The payment schedule will be negotiated based on the job\'s amount and duration.\nb. NOTE: The final payment must be made at the end of the job. If there are any outstanding tasks due to the contractor\'s or owner\'s schedule, the final payment will be calculated based on the completed work and invoiced as a final payment without any exceptions.'
    },
    {
      number: '15.',
      text: 'Late Payment Fees:',
      subtext: 'a. 1.5% monthly or 18% yearly will be applied in case of late payments; There is also a fee of $40 for bounced checks.\nb. The customer will be responsible for all charges and fees resulting from breach of contract or delay/failure to pay.\nc. When this estimate is approved (by email, phone message, or phone call), it automatically becomes a work order, and everything contained therein is now part of a Service/Work Agreement between the CUSTOMER and Econova.'
    },
    {
      number: '16.',
      text: 'Warranty:',
      subtext: 'Econova offers a one-year warranty after the project\'s completion date. Econova\'s warranty covers installation errors as well as additional warranties imposed by law. The product manufacturer\'s warranty is also applied. Econova\'s sole responsibility for this warranty will be to correct any problem resulting from an error in the application of the product if such error is reported to Econova within the warranty period. Any claim for damages must be limited to the amount paid for the services of this contract and does not include accidental or consequential damages. Each part of this contract will be valid and enforceable to the maximum extent permitted by law. This agreement must be interpreted and enforced under the laws of The Commonwealth of Massachusetts.'
    }
  ]

  // Process each term - Normal spacing on second page
  terms.forEach((term) => {
    // Check if we need a new page (shouldn't happen but safety check)
    if (yPosition > pageHeight - 40) {
      pdf.addPage()
      yPosition = margin
    }

    // Term number and main text - Compact
    const termLines = pdf.splitTextToSize(`${term.number} ${term.text}`, pageWidth - (margin * 2))
    termLines.forEach((line: string) => {
      pdf.text(line, margin, yPosition)
      yPosition += 3.5 // Tighter line spacing
    })

    // Subtext if available - Compact
    if (term.subtext) {
      yPosition += 1
      const subLines = term.subtext.split('\n')
      subLines.forEach((subLine) => {
        const wrappedSubLines = pdf.splitTextToSize(`    ${subLine}`, pageWidth - (margin * 2))
        wrappedSubLines.forEach((line: string) => {
          pdf.text(line, margin, yPosition)
          yPosition += 3.5
        })
      })
    }

    yPosition += 3 // Minimal space between terms
  })

  // Agreement statement - Compact
  yPosition += 10
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('The undersigned hereby agree to the above terms and conditions.', margin, yPosition)
  yPosition += 15

  // Signature lines - Centered layout
  pdf.setFont('helvetica', 'normal')
  const signatureY = yPosition + 5
  
  // Calculate centered positions for signature lines
  const totalSignatureWidth = 180
  const startX = (pageWidth - totalSignatureWidth) / 2
  
  // Draw signature lines (centered)
  pdf.line(startX, signatureY, startX + 50, signatureY) // Name line
  pdf.line(startX + 65, signatureY, startX + 115, signatureY) // Signature line  
  pdf.line(startX + 130, signatureY, startX + 180, signatureY) // Date line

  // Labels under lines (centered)
  pdf.setFontSize(8)
  pdf.text('Name', startX + 25, signatureY + 8, { align: 'center' })
  pdf.text('Signature', startX + 90, signatureY + 8, { align: 'center' })
  pdf.text('Date', startX + 155, signatureY + 8, { align: 'center' })

  yPosition = signatureY + 15

  // Notes Section
  if (data.notes) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text('NOTES:', margin, yPosition)
    yPosition += 6
    
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    const lines = pdf.splitTextToSize(data.notes, pageWidth - (margin * 2))
    lines.forEach((line: string) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage()
        yPosition = margin
      }
      pdf.text(line, margin, yPosition)
      yPosition += 5
    })
    yPosition += 10
  }

  // Job Photos Section - Removed to save space for terms and conditions
  
  // No footer on page 2 - only signatures

  // Save the PDF or return buffer
  if (data.returnBuffer) {
    // Return buffer for storage
    const pdfBuffer = pdf.output('arraybuffer')
    return new Uint8Array(pdfBuffer)
  } else {
    // Download as before
    const fileName = `estimate_${data.jobName.replace(/[^a-z0-9]/gi, '_')}_${data.generatedDate.getTime()}.pdf`
    pdf.save(fileName)
  }
}

export async function generateQuickEstimatePDF(
  measurements: EstimateData['measurements'],
  jobName: string = 'Quick Estimate',
  customerName: string = 'Customer',
  jobPhotos?: string[],
  additionalData?: {
    customerEmail?: string
    customerPhone?: string
    customerAddress?: string
    projectAddress?: string
    projectCity?: string
    projectState?: string
    projectZipCode?: string
    buildingType?: string
    projectType?: string
    salespersonName?: string
    salespersonEmail?: string
    salespersonPhone?: string
    companyWebsite?: string
    overrideTotal?: number
    groupOverrides?: any
    groupedMeasurements?: any
  }
): Promise<void> {
  const estimateData: EstimateData = {
    jobName,
    customerName,
    measurements,
    jobPhotos,
    generatedDate: new Date(),
    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    ...additionalData
  }

  await generateEstimatePDF(estimateData)
}

