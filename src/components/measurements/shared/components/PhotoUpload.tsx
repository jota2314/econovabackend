/**
 * Shared Photo Upload Component for Measurements
 */

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, 
  Upload, 
  X, 
  Eye, 
  Loader2,
  Image as ImageIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageGallery, ImageThumbnailGrid } from '@/components/ui/image-gallery'
import { logger } from '@/lib/services/logger'

interface PhotoUploadProps {
  measurementId?: string
  jobId: string
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  maxPhotos?: number
  allowMultiple?: boolean
  disabled?: boolean
  className?: string
}

export function PhotoUpload({
  measurementId,
  jobId,
  photos,
  onPhotosChange,
  maxPhotos = 10,
  allowMultiple = true,
  disabled = false,
  className
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return

    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`)
        return false
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name} is too large (max 10MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Check photo limit
    if (photos.length + validFiles.length > maxPhotos) {
      toast.error(`Cannot upload more than ${maxPhotos} photos`)
      return
    }

    setUploading(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of validFiles) {
        logger.info('Uploading photo', { 
          fileName: file.name,
          fileSize: file.size,
          jobId,
          measurementId
        })

        const formData = new FormData()
        formData.append('photo', file)
        formData.append('jobId', jobId)
        if (measurementId) {
          formData.append('measurementId', measurementId)
        }

        const endpoint = measurementId 
          ? `/api/measurements/${measurementId}/photo`
          : `/api/jobs/${jobId}/photo`

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || `Failed to upload ${file.name}`)
        }

        uploadedUrls.push(data.url)
        logger.info('Photo uploaded successfully', {
          fileName: file.name,
          url: data.url,
          jobId,
          measurementId
        })
      }

      const newPhotos = [...photos, ...uploadedUrls]
      onPhotosChange(newPhotos)
      
      toast.success(`Successfully uploaded ${uploadedUrls.length} photo(s)`)
    } catch (error) {
      logger.error('Photo upload failed', error, { jobId, measurementId })
      toast.error(error instanceof Error ? error.message : 'Failed to upload photos')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [photos, onPhotosChange, maxPhotos, disabled, jobId, measurementId])

  const handleRemovePhoto = useCallback(async (photoUrl: string, index: number) => {
    try {
      logger.info('Removing photo', { photoUrl, jobId, measurementId })

      const response = await fetch(`/api/jobs/${jobId}/photo`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoUrl }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete photo')
      }

      const newPhotos = photos.filter((_, i) => i !== index)
      onPhotosChange(newPhotos)
      
      toast.success('Photo removed successfully')
      logger.info('Photo removed successfully', { photoUrl, jobId, measurementId })
    } catch (error) {
      logger.error('Failed to remove photo', error, { photoUrl, jobId, measurementId })
      toast.error('Failed to remove photo')
    }
  }, [photos, onPhotosChange, jobId, measurementId])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (disabled) return
      
      const files = e.dataTransfer.files
      handleFileSelect(files)
    },
    [handleFileSelect, disabled]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const openGallery = (index: number = 0) => {
    setSelectedImageIndex(index)
    setGalleryOpen(true)
  }

  return (
    <>
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <span className="font-medium">Photos</span>
                {photos.length > 0 && (
                  <Badge variant="secondary">{photos.length}</Badge>
                )}
              </div>
              
              {!disabled && (
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple={allowMultiple}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || photos.length >= maxPhotos}
                    className="flex items-center gap-2"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload
                  </Button>
                </div>
              )}
            </div>

            {/* Drop Zone */}
            {!disabled && photos.length === 0 && (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop images here, or click upload to select files
                </p>
                <p className="text-xs text-muted-foreground">
                  Max {maxPhotos} photos, 10MB each
                </p>
              </div>
            )}

            {/* Photo Thumbnails */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <ImageThumbnailGrid
                  images={photos}
                  onImageClick={openGallery}
                  onImageRemove={!disabled ? handleRemovePhoto : undefined}
                  className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
                />
                
                {photos.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{photos.length} photo(s)</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openGallery(0)}
                      className="flex items-center gap-1 h-6 px-2"
                    >
                      <Eye className="h-3 w-3" />
                      View All
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading photos...
              </div>
            )}

            {/* Photo Limit Warning */}
            {photos.length >= maxPhotos && (
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                Maximum number of photos ({maxPhotos}) reached
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Gallery Modal */}
      {galleryOpen && photos.length > 0 && (
        <ImageGallery
          images={photos}
          initialIndex={selectedImageIndex}
          onClose={() => setGalleryOpen(false)}
          onDelete={!disabled ? handleRemovePhoto : undefined}
        />
      )}
    </>
  )
}