"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { toast } from 'sonner'

interface CsvUploadProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: () => void
}

interface UploadResult {
  success: boolean
  message: string
  imported: number
  errors: string[]
}

export function CsvUpload({ isOpen, onClose, onUploadComplete }: CsvUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed:', event.target.files) // Debug log
    const file = event.target.files?.[0]
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('Selected file:', file.name, file.type) // Debug log
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    await handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/permits/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      setUploadResult(result)

      if (result.success) {
        toast.success(`Successfully imported ${result.imported} permits`)
        onUploadComplete()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
        imported: 0,
        errors: []
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      handleUpload(file)
    } else {
      toast.error('Please drop a CSV file')
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const resetUpload = () => {
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetUpload()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Import Permits from CSV</span>
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with permit data from the city. Expected columns: address, permit_date, builder_name, builder_phone, permit_type, city, zip_code, project_value, description.
            <br />
            <span className="text-xs text-slate-500">
              Optional: project_value (numbers, e.g. 50000 or $50,000), description (project details)
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!uploadResult ? (
            <div className="space-y-4">
              {/* File input button */}
              <div className="text-center">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="mb-4"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose CSV File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="text-center text-sm text-slate-500">
                or
              </div>

              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <p className="text-slate-600">Processing CSV...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <FileText className="w-12 h-12 text-slate-400" />
                    <p className="text-slate-600">
                      Drag & drop your CSV file here
                    </p>
                    <p className="text-xs text-slate-500">
                      CSV files only
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload Result */}
              <div className={`p-4 rounded-lg border ${
                uploadResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {uploadResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    uploadResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {uploadResult.success ? 'Upload Successful' : 'Upload Failed'}
                  </span>
                </div>

                <p className={`text-sm ${
                  uploadResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {uploadResult.message}
                </p>

                {uploadResult.imported > 0 && (
                  <p className="text-sm text-green-700 mt-1">
                    Imported {uploadResult.imported} permits
                  </p>
                )}
              </div>

              {/* Errors */}
              {uploadResult.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {uploadResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span>•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li className="text-yellow-600">
                        ... and {uploadResult.errors.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  onClick={resetUpload}
                  variant="outline"
                  className="flex-1"
                >
                  Upload Another
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}