"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablesInsert } from "@/lib/types/database"
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Loader2
} from "lucide-react"

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (leads: TablesInsert<'leads'>[]) => Promise<void>
  loading?: boolean
}

interface ParsedLead extends TablesInsert<'leads'> {
  _rowIndex: number
  _errors: string[]
}

export function CsvImportDialog({ 
  open, 
  onOpenChange, 
  onImport, 
  loading = false 
}: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'complete'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      processFile(selectedFile)
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const dataRows = lines.slice(1)

      // Map CSV headers to our database fields
      const fieldMapping: { [key: string]: keyof TablesInsert<'leads'> } = {
        'name': 'name',
        'full name': 'name',
        'fullname': 'name',
        'full_name': 'name',
        'email': 'email',
        'phone': 'phone',
        'phone number': 'phone',
        'company': 'company',
        'business': 'company',
        'address': 'address',
        'street': 'address',
        'city': 'city',
        'state': 'state',
        'lead source': 'lead_source',
        'source': 'lead_source',
        'lead_source': 'lead_source',
        'notes': 'notes',
        'comments': 'notes',
        'status': 'status',
      }

      const parsed: ParsedLead[] = []

      dataRows.forEach((row, index) => {
        const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const lead: Partial<TablesInsert<'leads'>> = {}
        const errors: string[] = []

        // Map each CSV column to database field
        headers.forEach((header, colIndex) => {
          const field = fieldMapping[header]
          if (field && values[colIndex]) {
            (lead as any)[field] = values[colIndex]
          }
        })

        // Validate required fields
        if (!lead.name) errors.push('Name is required')
        if (!lead.phone) errors.push('Phone is required')

        // Validate phone format (basic)
        if (lead.phone && lead.phone.replace(/\D/g, '').length < 10) {
          errors.push('Phone number must be at least 10 digits')
        }

        // Validate email if provided
        if (lead.email && !lead.email.includes('@')) {
          errors.push('Invalid email format')
        }

        // Validate state (MA or NH only)
        if (lead.state && !['MA', 'NH'].includes(lead.state.toUpperCase())) {
          errors.push('State must be MA or NH')
        }

        // Set defaults
        if (!lead.status) lead.status = 'new'
        if (!lead.lead_source) lead.lead_source = null
        if (!lead.notes) lead.notes = null
        if (!lead.email) lead.email = null
        if (!lead.company) lead.company = null
        if (!lead.address) lead.address = null
        if (!lead.city) lead.city = null
        if (!lead.state) lead.state = null

        parsed.push({
          ...lead as TablesInsert<'leads'>,
          _rowIndex: index + 2, // +2 because we skip header and arrays are 0-indexed
          _errors: errors
        })
      })

      setParsedLeads(parsed)
      setImportStep('preview')
    } catch (error) {
      alert('Error processing file: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    const validLeads = parsedLeads.filter(lead => lead._errors.length === 0)
    if (validLeads.length === 0) {
      alert('No valid leads to import')
      return
    }

    try {
      // Remove the validation fields before importing
      const cleanLeads = validLeads.map(({ _rowIndex, _errors, ...lead }) => lead)
      await onImport(cleanLeads)
      setImportStep('complete')
    } catch (error) {
      alert('Error importing leads: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const resetDialog = () => {
    setFile(null)
    setParsedLeads([])
    setImportStep('upload')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const template = `name,phone,email,company,address,city,state,lead_source,notes
John Smith,(555) 123-4567,john@example.com,ABC Corp,123 Main St,Boston,MA,referral,Interested in spray foam insulation
Jane Doe,(555) 987-6543,jane@example.com,XYZ Inc,456 Oak Ave,Manchester,NH,website,Called about basement insulation`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const validLeadsCount = parsedLeads.filter(lead => lead._errors.length === 0).length
  const errorLeadsCount = parsedLeads.filter(lead => lead._errors.length > 0).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple leads at once
          </DialogDescription>
        </DialogHeader>

        {importStep === 'upload' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <Label htmlFor="csv-file" className="cursor-pointer">
                    <span className="text-lg font-medium">Choose CSV file</span>
                    <br />
                    <span className="text-sm text-gray-500">or drag and drop</span>
                  </Label>
                  <Input
                    id="csv-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {file && (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Need a template?</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="text-xs text-gray-600 space-y-2">
                <p><strong>Required columns:</strong> name, phone</p>
                <p><strong>Optional columns:</strong> email, company, address, city, state, lead_source, notes, status</p>
                <p><strong>Note:</strong> Column headers are case-insensitive and can use spaces or underscores. State must be MA or NH.</p>
              </div>
            </div>
          </div>
        )}

        {importStep === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {validLeadsCount} Valid
              </Badge>
              {errorLeadsCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <XCircle className="h-3 w-3 mr-1" />
                  {errorLeadsCount} Errors
                </Badge>
              )}
            </div>

            <div className="border rounded-md max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedLeads.map((lead, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-sm">{lead._rowIndex}</TableCell>
                      <TableCell>
                        {lead._errors.length === 0 ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.name}
                        </div>
                        {lead.company && (
                          <div className="text-xs text-slate-500">{lead.company}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{lead.phone}</TableCell>
                      <TableCell className="text-sm">
                        {lead.city && lead.state ? `${lead.city}, ${lead.state}` : (lead.city || lead.state || '--')}
                      </TableCell>
                      <TableCell>
                        {lead._errors.length > 0 && (
                          <div className="space-y-1">
                            {lead._errors.map((error, idx) => (
                              <div key={idx} className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {error}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {importStep === 'complete' && (
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
            <div>
              <h3 className="text-lg font-medium">Import Successful!</h3>
              <p className="text-sm text-gray-600 mt-2">
                Successfully imported {validLeadsCount} leads
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {importStep === 'upload' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}

          {importStep === 'preview' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={resetDialog}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={validLeadsCount === 0 || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {validLeadsCount} Leads
              </Button>
            </>
          )}

          {importStep === 'complete' && (
            <Button
              onClick={() => {
                resetDialog()
                onOpenChange(false)
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}