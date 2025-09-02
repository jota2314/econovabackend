import jsPDF from 'jspdf'
import { formatCurrency, calculateMeasurementPrice, type InsulationType } from './pricing-calculator'
import { calculateHybridRValue, calculateHybridPricing, formatHybridSystemDescription } from './hybrid-calculator'

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
    is_hybrid_system?: boolean
    photo_url?: string
  }>
  jobPhotos?: string[]
  generatedDate: Date
  validUntil?: Date
  notes?: string
}

export async function generateEstimatePDF(data: EstimateData): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = margin

  // Company Header - Very Subtle Green Gradient (Extremely Transparent)
  pdf.setFillColor(251, 255, 251) // Super light green tint - barely visible
  pdf.rect(0, 0, pageWidth, 40, 'F')
  
  // Add even more subtle green accent strip at top (whisper of green)
  pdf.setFillColor(248, 253, 248) // Slightly more green but still extremely subtle
  pdf.rect(0, 0, pageWidth, 8, 'F')
  
  // Add company logo
  try {
    const logoWidth = 50
    const logoHeight = 20
    const logoX = 15
    const logoY = 10
    
    // Load logo using fetch from public folder
    const logoResponse = await fetch('/logo1.png')
    if (logoResponse.ok) {
      const logoBlob = await logoResponse.blob()
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(logoBlob)
      })
      
      pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight)
    } else {
      throw new Error('Logo not found')
    }
    
  } catch (error) {
    console.log('Logo loading failed, using company name instead')
    // Fallback: Show company name instead of logo
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('ECONOVA ENERGY SAVINGS', 15, 25)
  }
  
  pdf.setTextColor(0, 0, 0) // Black text
  pdf.setFontSize(10)
  pdf.text(`Generated: ${data.generatedDate.toLocaleDateString()}`, pageWidth - 50, 25)

  yPosition = 50

  // Reset text color for body
  pdf.setTextColor(0, 0, 0)

  // Enhanced Header with Customer and Salesperson Information
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PROJECT INFORMATION', margin, yPosition)
  yPosition += 8

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')

    // Left Column - Customer & Project Info
  const leftColumnX = margin
  let leftColumnY = yPosition

  pdf.setFont('helvetica', 'bold')
  pdf.text('CUSTOMER:', leftColumnX, leftColumnY)
  leftColumnY += 5
  pdf.setFont('helvetica', 'normal')
  pdf.text(data.customerName, leftColumnX, leftColumnY)
  leftColumnY += 5

  if (data.customerPhone) {
    pdf.text(`Phone: ${data.customerPhone}`, leftColumnX, leftColumnY)
    leftColumnY += 5
  }

  if (data.customerEmail) {
    pdf.text(`Email: ${data.customerEmail}`, leftColumnX, leftColumnY)
    leftColumnY += 5
  }

  // Salesperson
  leftColumnY += 3
  pdf.setFont('helvetica', 'bold')
  pdf.text('SALESPERSON:', leftColumnX, leftColumnY)
  leftColumnY += 5
  pdf.setFont('helvetica', 'normal')
  if (data.salespersonName) {
    pdf.text(data.salespersonName, leftColumnX, leftColumnY)
    leftColumnY += 5
  }

  // Project with Address (combined)
  leftColumnY += 3
  pdf.setFont('helvetica', 'bold')
  pdf.text('PROJECT:', leftColumnX, leftColumnY)
  leftColumnY += 5
  pdf.setFont('helvetica', 'normal')
  
  // Project address (if available)
  if (data.projectAddress) {
    pdf.text(data.projectAddress, leftColumnX, leftColumnY)
    leftColumnY += 5
  }

  if (data.projectCity || data.projectState || data.projectZipCode) {
    const cityStateZip = [data.projectCity, data.projectState, data.projectZipCode].filter(Boolean).join(', ')
    pdf.text(cityStateZip, leftColumnX, leftColumnY)
    leftColumnY += 5
  }

    // Right Column - Company & Estimate Info
  const rightColumnX = pageWidth / 2 + 10
  let rightColumnY = yPosition

  // Estimate Number
  pdf.setFont('helvetica', 'bold')
  pdf.text('ESTIMATE #:', rightColumnX, rightColumnY)
  rightColumnY += 5
  pdf.setFont('helvetica', 'normal')
  const estimateNumber = `EST-${data.generatedDate.getFullYear()}${String(data.generatedDate.getMonth() + 1).padStart(2, '0')}${String(data.generatedDate.getDate()).padStart(2, '0')}-${String(data.generatedDate.getHours()).padStart(2, '0')}${String(data.generatedDate.getMinutes()).padStart(2, '0')}`
  pdf.text(estimateNumber, rightColumnX, rightColumnY)
  rightColumnY += 8

  // Company Contact Info
  pdf.setFont('helvetica', 'bold')
  pdf.text('COMPANY:', rightColumnX, rightColumnY)
  rightColumnY += 5
  pdf.setFont('helvetica', 'normal')

  if (data.salespersonEmail) {
    pdf.text(`Email: ${data.salespersonEmail}`, rightColumnX, rightColumnY)
    rightColumnY += 5
  }

  // Phone and Website on same line
  if (data.salespersonPhone && data.companyWebsite) {
    pdf.text(`Phone: ${data.salespersonPhone} | ${data.companyWebsite}`, rightColumnX, rightColumnY)
    rightColumnY += 5
  } else if (data.salespersonPhone) {
    pdf.text(`Phone: ${data.salespersonPhone}`, rightColumnX, rightColumnY)
    rightColumnY += 5
  } else if (data.companyWebsite) {
    pdf.text(data.companyWebsite, rightColumnX, rightColumnY)
    rightColumnY += 5
  }

  // Set yPosition to the bottom of the longest column
  yPosition = Math.max(leftColumnY, rightColumnY) + 10

  // Project Description (Full Width)
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PROJECT DESCRIPTION:', margin, yPosition)
  yPosition += 8

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  
  // Generate project description
  let projectDescription = 'This project '
  
  if (data.buildingType === 'residential') {
    projectDescription += 'is a residential property '
  } else if (data.buildingType === 'commercial') {
    projectDescription += 'is a commercial property '
  } else {
    projectDescription += 'is a property '
  }
  
  if (data.projectType === 'new_construction') {
    projectDescription += 'for new construction. '
  } else if (data.projectType === 'remodel') {
    projectDescription += 'being remodeled. '
  } else {
    projectDescription += 'requiring insulation services. '
  }
  
  projectDescription += 'We will provide professional spray foam insulation services to meet Massachusetts building code requirements and improve energy efficiency.'
  
  // Split text to fit full page width (like estimate details)
  const fullPageWidth = pageWidth - (margin * 2)
  const descriptionLines = pdf.splitTextToSize(projectDescription, fullPageWidth)
  
  descriptionLines.forEach((line: string) => {
    pdf.text(line, margin, yPosition)
    yPosition += 5
  })
  
  yPosition += 10

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
  
  pdf.text('Description', margin + 2, yPosition)
  pdf.text('Insulation Type', margin + 70, yPosition)
  pdf.text('Inches', margin + 115, yPosition)
  pdf.text('R-Value', margin + 140, yPosition)
  pdf.text('Total', margin + 155, yPosition) // Moved left to give more space
  
  yPosition += 8
  pdf.setFont('helvetica', 'normal')

  // Measurement Items - Use grouped measurements with overrides if available
  let subtotal = 0
  const itemsPerPage = 20
  let itemCount = 0

  // Check if we have grouped measurements with overrides from the UI
  if (data.groupedMeasurements && data.groupOverrides) {
    // Use grouped measurements with override pricing
    Object.entries(data.groupedMeasurements).forEach(([groupKey, group]: [string, any], index) => {
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
        pdf.text('Insulation Type', margin + 70, yPosition)
        pdf.text('Inches', margin + 115, yPosition)
        pdf.text('R-Value', margin + 140, yPosition)
        pdf.text('Total', margin + 155, yPosition) // Moved left to give more space
        
        yPosition += 8
        pdf.setFont('helvetica', 'normal')
      }

      // Get override prices from UI or database
      const uiOverride = data.groupOverrides[groupKey] || {}
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
            Number(group.r_value) || 0
          )
          unitPrice = pricing?.pricePerSqft || 0
        }
      }

      totalPrice = effectiveSqft * unitPrice

      // Format insulation display
      let insulationDisplay = 'N/A'
      if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
        insulationDisplay = 'Hybrid System'
      } else {
        const framingToInches: Record<string, number> = {
          '2x4': 4, '2x6': 6, '2x8': 8, '2x10': 10, '2x12': 12
        }
        
        let insulationName = ''
        let inchesDisplay = ''
        
        switch (group.insulation_type) {
          case 'closed_cell':
            insulationName = 'Closed Cell'
            const ccInches = group.closed_cell_inches || 0
            if (ccInches > 0) {
              inchesDisplay = ` - ${ccInches}"`
            }
            break
          case 'open_cell':
            insulationName = 'Open Cell'
            const ocInches = group.open_cell_inches || 0
            if (ocInches > 0) {
              inchesDisplay = ` - ${ocInches}"`
            }
            break
          case 'batt':
            insulationName = 'Fiberglass Batt'
            const battInches = framingToInches[group.framing_size] || 0
            if (battInches > 0) {
              inchesDisplay = ` - ${battInches}"`
            }
            break
          case 'blown_in':
            insulationName = 'Fiberglass Blown-in'
            break
          default:
            insulationName = group.insulation_type || 'N/A'
        }
        
        insulationDisplay = insulationName + inchesDisplay
      }

      // Light green background for all rows
      pdf.setFillColor(144, 238, 144) // Light green
      pdf.setGState(pdf.GState({opacity: 0.1})) // Much more transparent
      pdf.rect(margin, yPosition - 4, pageWidth - (margin * 2), rowHeight, 'F')
      pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity

      pdf.setFontSize(8)
      
      // Enhanced multi-line description
      let primaryDescription = group.room_name
      
      // Add area type if available
      if (group.area_type) {
        primaryDescription += ` - ${group.area_type}`
      }
      
      // Create second line with technical details
      let secondLineDetails = ''
      if (group.framing_size) {
        secondLineDetails += `${group.framing_size} Framing`
      }
      
      if (effectiveSqft) {
        if (secondLineDetails) secondLineDetails += ' • '
        secondLineDetails += `${effectiveSqft} sq ft`
      }
      
      // Display primary description
      pdf.text(primaryDescription, margin + 2, yPosition)
      
      // Display insulation type
      pdf.text(insulationDisplay, margin + 70, yPosition)
      
      // Create inches display for dedicated column
      let inchesDisplay = ''
      if (group.is_hybrid_system && group.insulation_type === 'hybrid') {
        const closedInches = group.closed_cell_inches || 0
        const openInches = group.open_cell_inches || 0
        if (closedInches > 0 && openInches > 0) {
          inchesDisplay = `${closedInches}" CC + ${openInches}" OC`
        }
      } else {
        // Regular insulation types
        const inches = group.closed_cell_inches || group.open_cell_inches || 0
        if (inches > 0) {
          inchesDisplay = `${inches}"`
        }
      }
      
      // Display inches in dedicated column
      pdf.text(inchesDisplay, margin + 115, yPosition)
      
      // R-Value display with approximation
      let rValueDisplay = 'N/A'
      if (group.r_value) {
        const rValue = typeof group.r_value === 'string' ? parseFloat(group.r_value) : group.r_value
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
      
      // Hybrid system breakdown (on separate lines with proper spacing)
      if (group.is_hybrid_system && group.insulation_type === 'hybrid' && 
          (group.closed_cell_inches || 0) > 0 && (group.open_cell_inches || 0) > 0) {
        pdf.setFontSize(7)
        pdf.setTextColor(100, 100, 100)
        const hybridCalc = calculateHybridRValue(
          group.closed_cell_inches || 0, 
          group.open_cell_inches || 0
        )
        
        // Show each component on separate lines with proper spacing
        if (hybridCalc.closedCellInches > 0) {
          const closedCellText = `• ${hybridCalc.closedCellInches}" Closed Cell (R-${approximateRValue(hybridCalc.closedCellRValue)})`
          pdf.text(closedCellText, margin + 2, nextLineY)
          nextLineY += 4 // More spacing between lines
        }
        
        if (hybridCalc.openCellInches > 0) {
          const openCellText = `• ${hybridCalc.openCellInches}" Open Cell (R-${approximateRValue(hybridCalc.openCellRValue)})`
          pdf.text(openCellText, margin + 2, nextLineY)
        }
        
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(8)
      }
      
      if (totalPrice > 0) {
        pdf.text(formatCurrencyWhole(totalPrice), margin + 155, yPosition, { align: 'left' })
        subtotal += totalPrice
      } else {
        pdf.text('TBD', margin + 155, yPosition)
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
        pdf.text('Insulation Type', margin + 70, yPosition)
        pdf.text('Inches', margin + 115, yPosition)
        pdf.text('R-Value', margin + 140, yPosition)
        pdf.text('Total', margin + 155, yPosition) // Moved left to give more space
        
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
        
        // Format insulation display to match UI
        const framingToInches: Record<string, number> = {
          '2x4': 4, '2x6': 6, '2x8': 8, '2x10': 10, '2x12': 12
        }
        
        let insulationName = ''
        let inchesDisplay = ''
        
        switch (measurement.insulation_type) {
          case 'closed_cell':
            insulationName = 'Closed Cell'
            const ccInches = measurement.closed_cell_inches || 0
            if (ccInches > 0) {
              inchesDisplay = ` - ${ccInches}"`
            }
            break
          case 'open_cell':
            insulationName = 'Open Cell'
            const ocInches = measurement.open_cell_inches || 0
            if (ocInches > 0) {
              inchesDisplay = ` - ${ocInches}"`
            }
            break
          case 'batt':
            insulationName = 'Fiberglass Batt'
            const battInches = framingToInches[measurement.framing_size] || 0
            if (battInches > 0) {
              inchesDisplay = ` - ${battInches}"`
            }
            break
          case 'blown_in':
            insulationName = 'Fiberglass Blown-in'
            break
          default:
            insulationName = measurement.insulation_type || 'N/A'
        }
        
        insulationDisplay = insulationName + inchesDisplay
      }

      // Light green background for all rows
      pdf.setFillColor(144, 238, 144) // Light green
      pdf.setGState(pdf.GState({opacity: 0.1})) // Much more transparent
      pdf.rect(margin, yPosition - 4, pageWidth - (margin * 2), rowHeight, 'F')
      pdf.setGState(pdf.GState({opacity: 1})) // Reset opacity

      pdf.setFontSize(8)
      
      // Enhanced multi-line description
      let primaryDescription = measurement.room_name
      
      // Add area type if available
      if (measurement.area_type) {
        primaryDescription += ` - ${measurement.area_type}`
      }
      
      // Add floor level if available
      if (measurement.floor_level) {
        primaryDescription += ` (${measurement.floor_level})`
      }
      
      // Create second line with technical details
      let secondLineDetails = ''
      if (measurement.framing_size) {
        secondLineDetails += `${measurement.framing_size} Framing`
      }
      
      if (measurement.square_feet) {
        if (secondLineDetails) secondLineDetails += ' • '
        secondLineDetails += `${measurement.square_feet} sq ft`
      }
      
      // Display primary description
      pdf.text(primaryDescription, margin + 2, yPosition)
      
      // Display insulation type
      pdf.text(insulationDisplay, margin + 70, yPosition)
      
      // Create inches display for dedicated column
      let inchesDisplay = ''
      if (measurement.is_hybrid_system && measurement.insulation_type === 'hybrid') {
        const closedInches = measurement.closed_cell_inches || 0
        const openInches = measurement.open_cell_inches || 0
        if (closedInches > 0 && openInches > 0) {
          inchesDisplay = `${closedInches}" CC + ${openInches}" OC`
        }
      } else {
        // Regular insulation types
        const inches = measurement.closed_cell_inches || measurement.open_cell_inches || 0
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
      
      // Hybrid system breakdown (on separate lines with proper spacing)
      if (measurement.is_hybrid_system && measurement.insulation_type === 'hybrid' && 
          (measurement.closed_cell_inches || 0) > 0 && (measurement.open_cell_inches || 0) > 0) {
        pdf.setFontSize(7)
        pdf.setTextColor(100, 100, 100)
        const hybridCalc = calculateHybridRValue(
          measurement.closed_cell_inches || 0, 
          measurement.open_cell_inches || 0
        )
        
        // Show each component on separate lines with proper spacing
        if (hybridCalc.closedCellInches > 0) {
          const closedCellText = `• ${hybridCalc.closedCellInches}" Closed Cell (R-${approximateRValue(hybridCalc.closedCellRValue)})`
          pdf.text(closedCellText, margin + 2, nextLineY)
          nextLineY += 4 // More spacing between lines
        }
        
        if (hybridCalc.openCellInches > 0) {
          const openCellText = `• ${hybridCalc.openCellInches}" Open Cell (R-${approximateRValue(hybridCalc.openCellRValue)})`
          pdf.text(openCellText, margin + 2, nextLineY)
        }
        
        pdf.setTextColor(0, 0, 0)
        pdf.setFontSize(8)
      }
      
      if (totalPrice > 0) {
        pdf.text(formatCurrencyWhole(totalPrice), margin + 155, yPosition, { align: 'left' })
        subtotal += totalPrice
      } else {
        pdf.text('TBD', margin + 155, yPosition)
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
  const boxPadding = 8
  const boxWidth = pageWidth - (margin * 2)
  const textWidth = boxWidth - (boxPadding * 2)
  
  // Split text to fit within box
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  const termsLines = pdf.splitTextToSize(termsText, textWidth)
  
  // Calculate box height
  const lineHeight = 4.5
  const boxHeight = (termsLines.length * lineHeight) + (boxPadding * 2)
  
  // Check if we need a new page for the box
  if (yPosition + boxHeight > pageHeight - 20) {
    pdf.addPage()
    yPosition = margin
  }
  
  // Draw box border
  pdf.setDrawColor(220, 20, 20) // Red border
  pdf.setLineWidth(1)
  pdf.rect(margin, yPosition, boxWidth, boxHeight)
  
  // Optional: Add light red background
  pdf.setFillColor(255, 245, 245) // Very light red background
  pdf.rect(margin, yPosition, boxWidth, boxHeight, 'F')
  
  // Redraw border on top of background
  pdf.setDrawColor(220, 20, 20)
  pdf.rect(margin, yPosition, boxWidth, boxHeight)
  
  // Add text inside the box
  pdf.setTextColor(220, 20, 20) // Red text color
  
  let textY = yPosition + boxPadding + 4 // Start position for text
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
      text: 'It is the customer\'s responsibility to ensure that the following condition is met before work begins: The work area must be free of debris, tools, equipment, storage, and obstructions. ABT is not responsible for any type of damage on personal belongings that remained in the working area.',
      subtext: 'a. There will be a fee of $100/hour if ABT workers need to clean the area before work begins. There will also be a fee of $200 to remove material, equipment, and/or objects that are blocking the workspace.'
    },
    {
      number: '2.',
      text: 'All pre-insulation, pre-hanger, or pre-plastering inspections are to be carried out before work starts. Work delays caused by lack of notice that the inspections are not completed will result in a $500 fee.'
    },
    {
      number: '3.',
      text: 'The electrical wire must be installed tightly so that there is no risk of expanding with the foam. Wires not installed correctly have the risk of being cut when foam excess is being trimmed, which will not be covered by the ABT\'s warranty.'
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
      text: 'Job sites must have at least one electric power switch, one water switch, and heat. If not, there will be a change in the cost of the work, negotiated between ABT and the client before the beginning of the labor.'
    },
    {
      number: '8.',
      text: 'When the carpentry structure is crooked or with structural problems, ABT is not responsible for the perfect alignment of the plaster in the lines of the walls, ceiling, and floor.'
    },
    {
      number: '9.',
      text: 'When doing blown-in cellulose, certain areas of the siding, drilling holes, and blowing in the insulation could result in some damage to the siding or to the aesthetics of the paint. Interior drill and blow require holes to be drilled on the wall or ceiling and can be a very intrusive and dusty process. For this job to go smoothly, the homeowner must make sure that all furniture and any clothing located in adjacent areas to the exterior walls, ceiling, or slopes (that are being treated) must be moved away from those areas and covered with plastic prior to the beginning of the job.',
      subtext: 'a. Once the insulation is blown in, ABT\'s responsibility will be to plug the access holes and treat the surface with an initial application of a filler. The Customer is responsible for any additional work to those areas, including cleaning, dusting, and painting to achieve the desired finish conditions.'
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
      text: 'ABT cannot be responsible for the chemical quality of the applied product but is committed to using products of excellent quality and origin, distributed by structured companies of insulation products.'
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
      subtext: 'a. 1.5% monthly or 18% yearly will be applied in case of late payments; There is also a fee of $40 for bounced checks.\nb. The customer will be responsible for all charges and fees resulting from breach of contract or delay/failure to pay.\nc. When this estimate is approved (by email, phone message, or phone call), it automatically becomes a work order, and everything contained therein is now part of a Service/Work Agreement between the CUSTOMER and ABT.'
    },
    {
      number: '16.',
      text: 'Warranty:',
      subtext: 'ABT offers a one-year warranty after the project\'s completion date. ABT\'s warranty covers installation errors as well as additional warranties imposed by law. The product manufacturer\'s warranty is also applied. ABT\'s sole responsibility for this warranty will be to correct any problem resulting from an error in the application of the product if such error is reported to ABT within the warranty period. Any claim for damages must be limited to the amount paid for the services of this contract and does not include accidental or consequential damages. Each part of this contract will be valid and enforceable to the maximum extent permitted by law. This agreement must be interpreted and enforced under the laws of The Commonwealth of Massachusetts.'
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

  // Save the PDF
  const fileName = `estimate_${data.jobName.replace(/[^a-z0-9]/gi, '_')}_${data.generatedDate.getTime()}.pdf`
  pdf.save(fileName)
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