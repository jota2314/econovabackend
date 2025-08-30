import jsPDF from 'jspdf'
import { formatCurrency, calculateMeasurementPrice, type InsulationType } from './pricing-calculator'
import { calculateHybridRValue, calculateHybridPricing, formatHybridSystemDescription } from './hybrid-calculator'

interface EstimateData {
  jobName: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  address?: string
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
  }>
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

  // Company Header - Clean White with Logo
  pdf.setFillColor(255, 255, 255) // White background
  pdf.rect(0, 0, pageWidth, 40, 'F')
  
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

  // Customer Information Section
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CUSTOMER INFORMATION', margin, yPosition)
  yPosition += 8

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  
  const customerInfo = [
    `Customer: ${data.customerName}`,
    data.customerEmail ? `Email: ${data.customerEmail}` : '',
    data.customerPhone ? `Phone: ${data.customerPhone}` : '',
    data.address ? `Address: ${data.address}` : '',
    `Job Name: ${data.jobName}`
  ].filter(Boolean)

  customerInfo.forEach(line => {
    pdf.text(line, margin, yPosition)
    yPosition += 6
  })

  yPosition += 5

  // Estimate Details Header
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('ESTIMATE DETAILS', margin, yPosition)
  yPosition += 10

  // Table Headers
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setFillColor(240, 240, 240)
  pdf.rect(margin, yPosition - 5, pageWidth - (margin * 2), 8, 'F')
  
  pdf.text('Description', margin + 2, yPosition)
  pdf.text('Sq Ft', margin + 70, yPosition)
  pdf.text('Insulation', margin + 90, yPosition)
  pdf.text('R-Value', margin + 115, yPosition)
  pdf.text('$/Sq Ft', margin + 135, yPosition)
  pdf.text('Total', margin + 155, yPosition)
  
  yPosition += 8
  pdf.setFont('helvetica', 'normal')

  // Measurement Items
  let subtotal = 0
  const itemsPerPage = 20
  let itemCount = 0

  data.measurements.forEach((measurement, index) => {
    // Check if we need a new page (hybrid systems may need more space)
    const rowHeight = measurement.is_hybrid_system && measurement.insulation_type === 'hybrid' ? 12 : 6
    if (yPosition > pageHeight - 50 || (itemCount > 0 && itemCount % itemsPerPage === 0)) {
      pdf.addPage()
      yPosition = margin
      
      // Redraw headers on new page
      pdf.setFont('helvetica', 'bold')
      pdf.setFillColor(240, 240, 240)
      pdf.rect(margin, yPosition - 5, pageWidth - (margin * 2), 8, 'F')
      
      pdf.text('Description', margin + 2, yPosition)
      pdf.text('Sq Ft', margin + 70, yPosition)
      pdf.text('Insulation', margin + 90, yPosition)
      pdf.text('R-Value', margin + 115, yPosition)
      pdf.text('$/Sq Ft', margin + 135, yPosition)
      pdf.text('Total', margin + 155, yPosition)
      
      yPosition += 8
      pdf.setFont('helvetica', 'normal')
    }

    // Calculate pricing for hybrid and regular systems
    let pricing
    let totalPrice = 0
    let insulationDisplay = 'N/A'
    let pricePerSqftDisplay = 'N/A'

    if (measurement.is_hybrid_system && measurement.insulation_type === 'hybrid') {
      // Calculate hybrid pricing
      const hybridCalc = calculateHybridRValue(
        measurement.closed_cell_inches || 0, 
        measurement.open_cell_inches || 0
      )
      const hybridPricing = calculateHybridPricing(hybridCalc)
      totalPrice = measurement.square_feet * hybridPricing.totalPricePerSqft
      
      insulationDisplay = `Hybrid ${hybridCalc.closedCellInches}"CC+${hybridCalc.openCellInches}"OC`
      pricePerSqftDisplay = formatCurrency(hybridPricing.totalPricePerSqft)
    } else {
      // Regular system pricing
      pricing = calculateMeasurementPrice(
        measurement.square_feet,
        measurement.insulation_type as InsulationType,
        measurement.r_value ? Number(measurement.r_value) : 0
      )
      totalPrice = pricing?.totalPrice || 0
      
      insulationDisplay = measurement.insulation_type 
        ? measurement.insulation_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).substring(0, 12)
        : 'N/A'
      
      pricePerSqftDisplay = pricing?.pricePerSqft ? formatCurrency(pricing.pricePerSqft) : 'N/A'
    }

    // Alternate row coloring
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250)
      pdf.rect(margin, yPosition - 4, pageWidth - (margin * 2), rowHeight, 'F')
    }

    pdf.setFontSize(8)
    
    // Room name with floor level
    let description = measurement.room_name
    if (measurement.floor_level) {
      description += ` (${measurement.floor_level})`
    }
    
    // Truncate long descriptions
    if (description.length > 35) {
      description = description.substring(0, 32) + '...'
    }
    
    pdf.text(description, margin + 2, yPosition)
    pdf.text(measurement.square_feet.toFixed(1), margin + 70, yPosition)
    pdf.text(insulationDisplay, margin + 90, yPosition)
    
    // R-Value display
    pdf.text(measurement.r_value ? `R-${measurement.r_value}` : 'N/A', margin + 115, yPosition)
    
    // Hybrid system breakdown (on second line for hybrid)
    if (measurement.is_hybrid_system && measurement.insulation_type === 'hybrid' && 
        (measurement.closed_cell_inches || 0) > 0 && (measurement.open_cell_inches || 0) > 0) {
      pdf.setFontSize(7)
      pdf.setTextColor(100, 100, 100)
      const hybridCalc = calculateHybridRValue(
        measurement.closed_cell_inches || 0, 
        measurement.open_cell_inches || 0
      )
      const hybridPricing = calculateHybridPricing(hybridCalc)
      
      // Show pricing breakdown
      pdf.text(`${hybridCalc.closedCellInches}" Closed ($${hybridPricing.closedCellPrice.toFixed(2)}) + ${hybridCalc.openCellInches}" Open ($${hybridPricing.openCellPrice.toFixed(2)}) = $${hybridPricing.totalPricePerSqft.toFixed(2)}/sqft`, margin + 2, yPosition + 4)
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(8)
    }
    
    if (totalPrice > 0) {
      pdf.text(pricePerSqftDisplay, margin + 135, yPosition)
      pdf.text(formatCurrency(totalPrice), margin + 155, yPosition)
      subtotal += totalPrice
    } else {
      pdf.text('TBD', margin + 135, yPosition)
      pdf.text('TBD', margin + 155, yPosition)
    }

    // Adjust spacing for hybrid systems
    yPosition += rowHeight
    itemCount++
  })

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
  pdf.text(formatCurrency(subtotal), pageWidth - margin - 5, yPosition, { align: 'right' })
  
  yPosition += 6
  
  // Tax (optional - set to 0 for now)
  const taxRate = 0
  const tax = subtotal * taxRate
  if (taxRate > 0) {
    pdf.text(`Tax (${(taxRate * 100).toFixed(1)}%):`, pageWidth - margin - 40, yPosition)
    pdf.text(formatCurrency(tax), pageWidth - margin - 5, yPosition, { align: 'right' })
    yPosition += 6
  }

  // Total
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  const total = subtotal + tax
  pdf.text('TOTAL:', pageWidth - margin - 40, yPosition)
  pdf.text(formatCurrency(total), pageWidth - margin - 5, yPosition, { align: 'right' })

  yPosition += 15

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
  }

  // Footer
  const footerY = pageHeight - 15
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(100, 100, 100)
  
  if (data.validUntil) {
    pdf.text(`Valid until: ${data.validUntil.toLocaleDateString()}`, margin, footerY)
  }
  
  pdf.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' })
  pdf.text('Page 1', pageWidth - margin, footerY, { align: 'right' })

  // Save the PDF
  const fileName = `estimate_${data.jobName.replace(/[^a-z0-9]/gi, '_')}_${data.generatedDate.getTime()}.pdf`
  pdf.save(fileName)
}

export async function generateQuickEstimatePDF(
  measurements: EstimateData['measurements'],
  jobName: string = 'Quick Estimate',
  customerName: string = 'Customer'
): Promise<void> {
  const estimateData: EstimateData = {
    jobName,
    customerName,
    measurements,
    generatedDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  }

  await generateEstimatePDF(estimateData)
}