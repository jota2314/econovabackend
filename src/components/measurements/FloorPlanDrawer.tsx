"use client"

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Pencil,
  Trash2,
  Undo,
  RotateCcw,
  Ruler,
  Save,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface Point {
  x: number
  y: number
}

interface Wall {
  start: Point
  end: Point
  length: number // in feet
  id: string
}

interface FloorPlanDrawerProps {
  onWallsComplete: (walls: Array<{ height: number; width: number }>) => void
  defaultHeight?: number
}

export function FloorPlanDrawer({ onWallsComplete, defaultHeight = 8 }: FloorPlanDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [walls, setWalls] = useState<Wall[]>([])
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [scale, setScale] = useState(10) // pixels per foot
  const [showGrid, setShowGrid] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const CANVAS_WIDTH = isMobile ? Math.min(window.innerWidth - 40, 400) : 800
  const CANVAS_HEIGHT = isMobile ? 400 : 600

  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1

      // Vertical lines (every foot)
      for (let x = 0; x <= CANVAS_WIDTH; x += scale) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, CANVAS_HEIGHT)
        ctx.stroke()
      }

      // Horizontal lines (every foot)
      for (let y = 0; y <= CANVAS_HEIGHT; y += scale) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(CANVAS_WIDTH, y)
        ctx.stroke()
      }
    }

    // Draw walls
    walls.forEach((wall, index) => {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(wall.start.x, wall.start.y)
      ctx.lineTo(wall.end.x, wall.end.y)
      ctx.stroke()

      // Draw wall length label
      const midX = (wall.start.x + wall.end.x) / 2
      const midY = (wall.start.y + wall.end.y) / 2

      ctx.fillStyle = '#1e40af'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText(`${wall.length.toFixed(1)} ft`, midX + 5, midY - 5)

      // Draw wall number
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(`#${index + 1}`, wall.start.x - 10, wall.start.y - 10)
    })

    // Draw start point (when user clicks first time)
    if (startPoint) {
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(startPoint.x, startPoint.y, 6, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Draw preview line when hovering
    if (startPoint && currentPoint && startPoint !== currentPoint) {
      const previewLength = calculateDistance(startPoint, currentPoint)

      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(startPoint.x, startPoint.y)
      ctx.lineTo(currentPoint.x, currentPoint.y)
      ctx.stroke()
      ctx.setLineDash([])

      // Show preview length
      const midX = (startPoint.x + currentPoint.x) / 2
      const midY = (startPoint.y + currentPoint.y) / 2
      ctx.fillStyle = '#6b7280'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(`${previewLength.toFixed(1)} ft`, midX + 5, midY - 5)

      // Draw hover point
      ctx.fillStyle = '#9ca3af'
      ctx.beginPath()
      ctx.arc(currentPoint.x, currentPoint.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }
  }, [walls, startPoint, currentPoint, showGrid, scale])

  const calculateDistance = (p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const pixelDistance = Math.sqrt(dx * dx + dy * dy)
    return pixelDistance / scale // Convert to feet
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Scale coordinates to match canvas internal size
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Snap to grid
    const snappedX = Math.round(x / scale) * scale
    const snappedY = Math.round(y / scale) * scale

    const point: Point = { x: snappedX, y: snappedY }

    if (!startPoint) {
      // First click - set start point
      setStartPoint(point)
      setCurrentPoint(point)
    } else {
      // Check if clicking near the first wall's start point (to close the shape)
      if (walls.length > 0) {
        const firstPoint = walls[0].start
        const distanceToFirst = calculateDistance(point, firstPoint)

        if (distanceToFirst < 2) { // Within 2 feet of first point
          // Close the shape
          const length = calculateDistance(startPoint, firstPoint)

          if (length > 0.1) {
            const newWall: Wall = {
              start: startPoint,
              end: firstPoint,
              length,
              id: `wall-${Date.now()}`
            }

            setWalls(prev => [...prev, newWall])
            toast.success(`Shape closed! Total ${walls.length + 1} walls`)
          }

          // Stop drawing
          setStartPoint(null)
          setCurrentPoint(null)
          return
        }
      }

      // Second click - complete wall
      const length = calculateDistance(startPoint, point)

      if (length < 0.1) {
        toast.error('Wall is too short. Click further away.')
        return
      }

      const newWall: Wall = {
        start: startPoint,
        end: point,
        length,
        id: `wall-${Date.now()}`
      }

      setWalls(prev => [...prev, newWall])

      // Set this end point as the start of the next wall
      setStartPoint(point)
      setCurrentPoint(point)

      toast.success(`Wall #${walls.length + 1} added: ${length.toFixed(1)} ft`)
    }
  }

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Scale coordinates to match canvas internal size
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Snap to grid
    const snappedX = Math.round(x / scale) * scale
    const snappedY = Math.round(y / scale) * scale

    setCurrentPoint({ x: snappedX, y: snappedY })
  }

  const undoLastWall = () => {
    if (walls.length === 0) return

    const newWalls = [...walls]
    newWalls.pop()
    setWalls(newWalls)

    if (newWalls.length > 0) {
      // Set start point to the start of the last wall
      setStartPoint(newWalls[newWalls.length - 1].end)
      setCurrentPoint(newWalls[newWalls.length - 1].end)
    } else {
      setStartPoint(null)
      setCurrentPoint(null)
    }

    toast.info('Wall removed')
  }

  const clearAll = () => {
    if (walls.length === 0) return

    if (confirm('Clear all walls?')) {
      setWalls([])
      setStartPoint(null)
      setCurrentPoint(null)
      toast.info('All walls cleared')
    }
  }

  const finishDrawing = () => {
    if (walls.length === 0) {
      toast.error('Draw at least one wall first')
      return
    }

    // Convert walls to measurements (height x width)
    const measurements = walls.map(wall => ({
      height: defaultHeight,
      width: wall.length
    }))

    onWallsComplete(measurements)
    toast.success(`${walls.length} walls ready to save`)
  }

  const totalPerimeter = walls.reduce((sum, wall) => sum + wall.length, 0)

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-purple-600" />
            Floor Plan Drawer
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {walls.length} wall{walls.length !== 1 ? 's' : ''}
            </Badge>
            {totalPerimeter > 0 && (
              <Badge variant="outline">
                <Ruler className="h-3 w-3 mr-1" />
                {totalPerimeter.toFixed(1)} ft total
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <p className="font-semibold mb-1">How to use:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click on canvas to start drawing a wall</li>
              <li>Click again to complete the wall and start the next one</li>
              <li>Each wall will automatically connect to continue drawing</li>
              <li><strong>To close the shape:</strong> Click near the first point (red dot #1)</li>
              <li><strong>To stop without closing:</strong> Click the "Stop Drawing" button</li>
              <li>Click "Finish Drawing" when done to add all walls as measurements</li>
            </ol>
          </div>

          {/* Canvas */}
          <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMove}
              onTouchStart={(e) => {
                e.preventDefault()
                const touch = e.touches[0]
                const canvas = canvasRef.current
                if (!canvas) return
                const rect = canvas.getBoundingClientRect()
                const scaleX = CANVAS_WIDTH / rect.width
                const scaleY = CANVAS_HEIGHT / rect.height
                const x = (touch.clientX - rect.left) * scaleX
                const y = (touch.clientY - rect.top) * scaleY
                const snappedX = Math.round(x / scale) * scale
                const snappedY = Math.round(y / scale) * scale
                const point: Point = { x: snappedX, y: snappedY }

                if (!startPoint) {
                  // First touch - set start point
                  setStartPoint(point)
                  setCurrentPoint(point)
                }
              }}
              onTouchMove={(e) => {
                e.preventDefault()
                const touch = e.touches[0]
                const canvas = canvasRef.current
                if (!canvas) return
                const rect = canvas.getBoundingClientRect()
                const scaleX = CANVAS_WIDTH / rect.width
                const scaleY = CANVAS_HEIGHT / rect.height
                const x = (touch.clientX - rect.left) * scaleX
                const y = (touch.clientY - rect.top) * scaleY
                const snappedX = Math.round(x / scale) * scale
                const snappedY = Math.round(y / scale) * scale
                setCurrentPoint({ x: snappedX, y: snappedY })
              }}
              onTouchEnd={(e) => {
                e.preventDefault()
                if (!startPoint || !currentPoint) return

                const canvas = canvasRef.current
                if (!canvas) return

                // Check if clicking near the first wall's start point (to close the shape)
                if (walls.length > 0) {
                  const firstPoint = walls[0].start
                  const distanceToFirst = calculateDistance(currentPoint, firstPoint)

                  if (distanceToFirst < 2) { // Within 2 feet of first point
                    // Close the shape
                    const length = calculateDistance(startPoint, firstPoint)

                    if (length > 0.1) {
                      const newWall: Wall = {
                        start: startPoint,
                        end: firstPoint,
                        length,
                        id: `wall-${Date.now()}`
                      }

                      setWalls(prev => [...prev, newWall])
                      toast.success(`Shape closed! Total ${walls.length + 1} walls`)
                    }

                    // Stop drawing
                    setStartPoint(null)
                    setCurrentPoint(null)
                    return
                  }
                }

                // Complete wall
                const length = calculateDistance(startPoint, currentPoint)

                if (length < 0.1) {
                  toast.error('Wall is too short. Drag further away.')
                  return
                }

                const newWall: Wall = {
                  start: startPoint,
                  end: currentPoint,
                  length,
                  id: `wall-${Date.now()}`
                }

                setWalls(prev => [...prev, newWall])

                // Set this end point as the start of the next wall
                setStartPoint(currentPoint)

                toast.success(`Wall #${walls.length + 1} added: ${length.toFixed(1)} ft`)
              }}
              className="cursor-crosshair touch-none w-full"
            />
          </div>

          {/* Controls */}
          <div className="space-y-2">
            {/* Top Row - Main Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undoLastWall}
                disabled={walls.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Undo className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Undo Last</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={walls.length === 0}
                className="flex-1 sm:flex-none"
              >
                <RotateCcw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clear All</span>
              </Button>

              {startPoint && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setStartPoint(null)
                    setCurrentPoint(null)
                    toast.info('Drawing stopped. Click canvas to start a new wall.')
                  }}
                  className="bg-orange-500 hover:bg-orange-600 flex-1 sm:flex-none"
                >
                  <X className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Stop</span>
                </Button>
              )}
            </div>

            {/* Bottom Row - Settings */}
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                className="flex-1 sm:flex-none"
              >
                Grid: {showGrid ? 'ON' : 'OFF'}
              </Button>

              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <span className="text-sm text-gray-600 whitespace-nowrap">Scale:</span>
                <select
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 sm:flex-none"
                >
                  <option value={5}>5 px/ft</option>
                  <option value={10}>10 px/ft</option>
                  <option value={20}>20 px/ft</option>
                </select>
              </div>
            </div>
          </div>

          {/* Wall List */}
          {walls.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h4 className="font-semibold text-sm mb-2">Walls ({walls.length})</h4>
              <div className="space-y-1">
                {walls.map((wall, index) => (
                  <div key={wall.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-600 flex-shrink-0">
                      #{index + 1}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-semibold flex-1 text-right">
                      {defaultHeight} × {wall.length.toFixed(1)} = {(defaultHeight * wall.length).toFixed(0)} sq ft
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setWalls(prev => prev.filter((_, i) => i !== index))
                        toast.info(`Wall #${index + 1} removed`)
                      }}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between font-semibold">
                <span>Total Area:</span>
                <span className="text-green-600">
                  {(defaultHeight * totalPerimeter).toFixed(1)} sq ft
                </span>
              </div>
            </div>
          )}

          {/* Finish Button */}
          <Button
            onClick={finishDrawing}
            disabled={walls.length === 0}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">
              Finish Drawing & Add {walls.length} Wall{walls.length !== 1 ? 's' : ''} to Measurements
            </span>
            <span className="sm:hidden">
              Add {walls.length} Wall{walls.length !== 1 ? 's' : ''}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
