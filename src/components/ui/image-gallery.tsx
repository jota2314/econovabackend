"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Download,
  Maximize2,
  Minimize2,
  Trash2
} from 'lucide-react'
import Image from 'next/image'

interface ImageGalleryProps {
  images: Array<{
    id: string
    url: string
    alt?: string
    caption?: string
  }>
  isOpen: boolean
  onClose: () => void
  initialIndex?: number
  onDelete?: (imageId: string) => void
}

export function ImageGallery({ images, isOpen, onClose, initialIndex = 0, onDelete }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setZoom(1)
    setRotation(0)
  }, [initialIndex, isOpen])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case 'Escape':
          onClose()
          break
        case '+':
        case '=':
          zoomIn()
          break
        case '-':
          zoomOut()
          break
        case 'r':
        case 'R':
          rotate()
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [isOpen, currentIndex])

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
    resetTransforms()
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    resetTransforms()
  }

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 5))
  }

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.5))
  }

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const resetTransforms = () => {
    setZoom(1)
    setRotation(0)
  }

  const handleDownload = async () => {
    const currentImage = images[currentIndex]
    if (!currentImage) return

    try {
      const response = await fetch(currentImage.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `job-photo-${currentImage.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  if (!images.length) return null

  const currentImage = images[currentIndex]
  if (!currentImage) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${
          isFullscreen 
            ? 'max-w-none w-screen h-screen p-0 rounded-none' 
            : 'max-w-6xl w-full h-[90vh] p-0'
        } bg-black/95 border-0`}
      >
        <DialogTitle className="sr-only">
          Image Gallery - {currentImage?.caption || `Image ${currentIndex + 1} of ${images.length}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          View and navigate through job photos. Use arrow keys or click thumbnails to navigate between images.
        </DialogDescription>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-white">
              <span className="text-sm font-medium">
                {currentIndex + 1} of {images.length}
              </span>
              {currentImage?.caption && (
                <span className="text-sm text-white/80">
                  • {currentImage.caption}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-white text-sm min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                disabled={zoom >= 5}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              {/* Rotate */}
              <Button
                variant="ghost"
                size="icon"
                onClick={rotate}
                className="text-white hover:bg-white/20"
              >
                <RotateCw className="h-4 w-4" />
              </Button>

              {/* Delete */}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (currentImage && confirm('Are you sure you want to delete this photo?')) {
                      onDelete(currentImage.id)
                    }
                  }}
                  className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  title="Delete photo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              {/* Download */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Image Container */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-4 z-40 text-white hover:bg-white/20 h-12 w-12"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-4 z-40 text-white hover:bg-white/20 h-12 w-12"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Image */}
          <div 
            className="relative transition-transform duration-200 ease-in-out max-w-full max-h-full"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
          >
            <Image
              src={currentImage.url}
              alt={currentImage.alt || `Job photo ${currentIndex + 1}`}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 p-4 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => {
                    setCurrentIndex(index)
                    resetTransforms()
                  }}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-white' 
                      : 'border-transparent hover:border-white/50'
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={image.alt || `Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Simplified thumbnail grid component for initial display
interface ImageThumbnailGridProps {
  images: Array<{
    id: string
    url: string
    alt?: string
    caption?: string
  }>
  onImageClick: (index: number) => void
  className?: string
}

export function ImageThumbnailGrid({ images, onImageClick, className = "" }: ImageThumbnailGridProps) {
  if (!images.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No photos available</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {images.map((image, index) => (
        <button
          key={image.id}
          onClick={() => onImageClick(index)}
          className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity group"
        >
          <Image
            src={image.url}
            alt={image.alt || `Job photo ${index + 1}`}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/90 rounded-full p-2">
                <ZoomIn className="h-4 w-4 text-gray-700" />
              </div>
            </div>
          </div>
          {image.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
              {image.caption}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
