import jsPDF from 'jspdf'
import { formatCurrency, calculateMeasurementPrice, type InsulationType } from './pricing-calculator'

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
    insulation_type?: InsulationType
    r_value?: string | number | null
    framing_size?: string | null
  }>
  generatedDate: Date
  validUntil?: Date
  notes?: string
}

export function generateEstimatePDF(data: EstimateData): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  let yPosition = margin

  // Company Header
  pdf.setFillColor(245, 124, 0) // Orange color
  pdf.rect(0, 0, pageWidth, 40, 'F')
  
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(24)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SPRAY FOAM INSULATION', pageWidth / 2, 15, { align: 'center' })
  
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.text('PROFESSIONAL ESTIMATE', pageWidth / 2, 25, { align: 'center' })
  
  pdf.setFontSize(10)
  pdf.text(`Generated: ${data.generatedDate.toLocaleDateString()}`, pageWidth / 2, 32, { align: 'center' })

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
    // Check if we need a new page
    if (yPosition > pageHeight - 40 || (itemCount > 0 && itemCount % itemsPerPage === 0)) {
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

    const pricing = calculateMeasurementPrice(
      measurement.square_feet,
      measurement.insulation_type as InsulationType,
      measurement.r_value ? Number(measurement.r_value) : 0
    )

    // Alternate row coloring
    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250)
      pdf.rect(margin, yPosition - 4, pageWidth - (margin * 2), 6, 'F')
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
    
    const insulationType = measurement.insulation_type 
      ? measurement.insulation_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'N/A'
    pdf.text(insulationType.substring(0, 12), margin + 90, yPosition)
    
    pdf.text(measurement.r_value ? `R-${measurement.r_value}` : 'N/A', margin + 115, yPosition)
    
    if (pricing.pricePerSqft > 0) {
      pdf.text(formatCurrency(pricing.pricePerSqft), margin + 135, yPosition)
      pdf.text(formatCurrency(pricing.totalPrice), margin + 155, yPosition)
      subtotal += pricing.totalPrice
    } else {
      pdf.text('TBD', margin + 135, yPosition)
      pdf.text('TBD', margin + 155, yPosition)
    }

    yPosition += 6
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
  pdf.text(`Page ${pdf.getCurrentPageInfo().pageNumber}`, pageWidth - margin, footerY, { align: 'right' })

  // Save the PDF
  const fileName = `estimate_${data.jobName.replace(/[^a-z0-9]/gi, '_')}_${data.generatedDate.getTime()}.pdf`
  pdf.save(fileName)
}

export function generateQuickEstimatePDF(
  measurements: EstimateData['measurements'],
  jobName: string = 'Quick Estimate',
  customerName: string = 'Customer'
): void {
  const estimateData: EstimateData = {
    jobName,
    customerName,
    measurements,
    generatedDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  }

  generateEstimatePDF(estimateData)
}