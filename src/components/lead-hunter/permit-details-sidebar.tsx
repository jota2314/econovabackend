"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MapPin,
  Building,
  Phone,
  Calendar,
  FileText,
  ExternalLink,
  Edit,
  Trash2,
  UserPlus,
  X,
  Image as ImageIcon,
  ZoomIn,
  Mic,
  MicOff,
  Square,
  Play,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Permit {
  id: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  builder_name: string
  builder_phone?: string
  permit_type: 'residential' | 'commercial'
  status: 'new' | 'contacted' | 'converted_to_lead' | 'rejected' | 'hot' | 'cold' | 'visited' | 'not_visited'
  notes?: string
  latitude: number
  longitude: number
  created_at: string
  photo_urls?: string[]
  created_by?: {
    full_name: string
  }
}

interface PermitDetailsSidebarProps {
  permit: Permit | null
  isOpen: boolean
  onClose: () => void
  onStatusChange: (permitId: string, newStatus: Permit['status']) => void
  onConvertToLead: (permit: Permit) => void
  onEdit: (permit: Permit) => void
  onDelete: (permitId: string) => void
  onUpdate?: (permitId: string, updates: Partial<Permit>) => void
}

export function PermitDetailsSidebar({
  permit,
  isOpen,
  onClose,
  onStatusChange,
  onConvertToLead,
  onEdit,
  onDelete,
  onUpdate
}: PermitDetailsSidebarProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null)
  const [transcribedText, setTranscribedText] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!permit || !isOpen) return null

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onUpdate) return

    const maxFiles = 10
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const toUpload: File[] = []
    for (let i = 0; i < files.length && i < maxFiles; i++) {
      const f = files[i]
      if (allowedTypes.includes(f.type)) toUpload.push(f)
    }

    if (toUpload.length === 0) return

    setIsUploadingPhoto(true)
    const uploadedUrls: string[] = []
    try {
      for (const file of toUpload) {
        const formData = new FormData()
        formData.append('photo', file)
        const res = await fetch('/api/permits/photo', { method: 'POST', body: formData })
        if (!res.ok) throw new Error(`Upload failed for ${file.name}`)
        const data = await res.json()
        if (!data.success || !data.url) throw new Error('Upload API error')
        uploadedUrls.push(data.url)
      }

      const newPhotos = [...(permit.photo_urls || []), ...uploadedUrls]
      onUpdate(permit.id, { photo_urls: newPhotos })
      toast.success(`Uploaded ${uploadedUrls.length} photo(s)`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload photos')
    } finally {
      setIsUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async (urlToRemove: string) => {
    if (!onUpdate) return
    const newPhotos = (permit.photo_urls || []).filter(url => url !== urlToRemove)
    onUpdate(permit.id, { photo_urls: newPhotos })
    toast.success('Photo removed')
  }

  const handleStatusChange = async (newStatus: Permit['status']) => {
    setIsUpdatingStatus(true)
    try {
      await onStatusChange(permit.id, newStatus)
      toast.success('Status updated successfully')
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleConvertToLead = () => {
    onConvertToLead(permit)
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this permit? This action cannot be undone.')) {
      onDelete(permit.id)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      setAudioChunks([])
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      setRecordingInterval(interval)

      recorder.ondataavailable = (event) => {
        setAudioChunks(prev => [...prev, event.data])
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      toast.success('Recording started')
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Could not access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setIsRecording(false)
      if (recordingInterval) {
        clearInterval(recordingInterval)
        setRecordingInterval(null)
      }
    }
  }

  const processAudioRecording = async () => {
    if (audioChunks.length === 0) {
      toast.error('No audio recorded')
      return
    }

    setIsProcessing(true)
    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

      // Create FormData for API call
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('permitId', permit.id)
      formData.append('returnTranscription', 'true') // Request transcription only

      // Send to transcription API
      const response = await fetch('/api/permits/transcribe-note', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to transcribe audio')
      }

      const result = await response.json()

      if (result.success) {
        // Show transcribed text for editing instead of saving directly
        setTranscribedText(result.transcription || '')
        setIsEditingNote(true)
        toast.success('Voice note transcribed! Review and edit before saving.')
      } else {
        throw new Error(result.error || 'Transcription failed')
      }
    } catch (error) {
      console.error('Error processing audio:', error)
      toast.error('Failed to process voice note')
    } finally {
      setIsProcessing(false)
      setAudioChunks([])
      setRecordingTime(0)
    }
  }

  const saveEditedNote = async () => {
    if (!transcribedText.trim()) {
      toast.error('Note cannot be empty')
      return
    }

    try {
      // Save the edited note
      const response = await fetch('/api/permits/save-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permitId: permit.id,
          note: transcribedText,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save note')
      }

      const result = await response.json()

      if (result.success) {
        toast.success('Note saved successfully!')
        setTranscribedText('')
        setIsEditingNote(false)
        // Update permit notes in state instead of reloading
        window.location.reload() // Temporary - should update state instead
      } else {
        throw new Error(result.error || 'Failed to save note')
      }
    } catch (error) {
      console.error('Error saving note:', error)
      toast.error('Failed to save note')
    }
  }

  const cancelEditNote = () => {
    setTranscribedText('')
    setIsEditingNote(false)
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: Permit['status']) => {
    switch (status) {
      case 'new': return 'bg-green-100 text-green-800 border-green-200'
      case 'contacted': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'converted_to_lead': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'hot': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'cold': return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'visited': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'not_visited': return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getGoogleMapsUrl = () => {
    return `https://www.google.com/maps?q=${permit.latitude},${permit.longitude}`
  }

  const fullAddress = [permit.address, permit.city, permit.state, permit.zip_code]
    .filter(Boolean)
    .join(', ')

  return (
    <div className={`fixed top-0 right-0 h-full w-full sm:w-[28rem] lg:w-[32rem] bg-white shadow-xl border-l transform transition-transform duration-300 z-40 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Permit Details</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Status and Type */}
          <div className="flex items-center space-x-3">
            <Badge className={getStatusColor(permit.status)} variant="outline">
              {permit.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {permit.permit_type}
            </Badge>
          </div>

          {/* Builder Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              Builder Information
            </h3>
            <div className="space-y-2">
              <div>
                <p className="font-medium text-slate-900">{permit.builder_name}</p>
              </div>
              {permit.builder_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <p className="text-slate-600">{permit.builder_phone}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => window.open(`tel:${permit.builder_phone}`)}
                  >
                    Call
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Location Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </h3>
            <div className="space-y-2">
              <p className="text-slate-900">{fullAddress}</p>
              <div className="text-xs text-slate-500">
                {permit.latitude.toFixed(6)}, {permit.longitude.toFixed(6)}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => window.open(getGoogleMapsUrl(), '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View in Google Maps
              </Button>
            </div>
          </Card>

          {/* Photos */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />
                Photos {permit.photo_urls && permit.photo_urls.length > 0 && `(${permit.photo_urls.length})`}
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                {isUploadingPhoto ? 'Uploading...' : 'Add'}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoUpload(e.target.files)}
              className="hidden"
            />

            {permit.photo_urls && permit.photo_urls.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {permit.photo_urls.map((url, index) => (
                  <div key={url} className="relative group">
                    <img
                      src={url}
                      alt={`Permit photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity bg-gray-100"
                      onClick={() => window.open(url, '_blank')}
                      onError={(e) => {
                        console.error('Failed to load image:', url)
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                        e.currentTarget.style.display = 'flex'
                        e.currentTarget.style.alignItems = 'center'
                        e.currentTarget.style.justifyContent = 'center'
                        e.currentTarget.innerHTML = '❌ Failed to load'
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', url)
                      }}
                    />
                    <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center pointer-events-none">
                      <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-white/90 rounded p-1 shadow-sm opacity-0 group-hover:opacity-100 transition z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemovePhoto(url)
                      }}
                      aria-label="Remove photo"
                    >
                      <X className="w-3 h-3 text-slate-700" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No photos yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "Add" above to upload photos</p>
              </div>
            )}
          </Card>

          {/* Notes with Voice Recording */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Notes
              </div>
              {/* Voice Recording Controls */}
              <div className="flex items-center space-x-2">
                {!isRecording && !isProcessing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startRecording}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Mic className="w-4 h-4 mr-1" />
                    Record
                  </Button>
                )}

                {isRecording && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 px-2 py-1 bg-red-50 text-red-700 rounded text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      {formatRecordingTime(recordingTime)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={stopRecording}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {!isRecording && audioChunks.length > 0 && !isProcessing && (
                  <Button
                    size="sm"
                    onClick={processAudioRecording}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Save Note
                  </Button>
                )}

                {isProcessing && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                )}
              </div>
            </h3>

            {/* Show existing notes */}
            {permit.notes && !isEditingNote ? (
              <p className="text-slate-600 text-sm whitespace-pre-wrap">
                {permit.notes}
              </p>
            ) : !isEditingNote ? (
              <p className="text-slate-400 text-sm italic">
                No notes yet. Record a voice note to add observations about this permit.
              </p>
            ) : null}

            {/* Show transcribed text editor */}
            {isEditingNote && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Edit transcribed note:
                  </label>
                  <textarea
                    value={transcribedText}
                    onChange={(e) => setTranscribedText(e.target.value)}
                    className="mt-1 w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={4}
                    placeholder="Edit your transcribed note here..."
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={saveEditedNote}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Save Note
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditNote}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!isRecording && audioChunks.length === 0 && !isEditingNote && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 <strong>Tip:</strong> Click "Record" to add voice notes in English, Spanish, or Portuguese.
                  They'll be automatically transcribed and translated to English.
                </p>
              </div>
            )}
          </Card>


          {/* Status Update */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Update Status</h3>
            <Select
              value={permit.status}
              onValueChange={(value: Permit['status']) => handleStatusChange(value)}
              disabled={isUpdatingStatus}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">🆕 New</SelectItem>
                <SelectItem value="contacted">📞 Contacted</SelectItem>
                <SelectItem value="converted_to_lead">✅ Converted to Lead</SelectItem>
                <SelectItem value="rejected">❌ Rejected</SelectItem>
                <SelectItem value="hot">🔥 Hot</SelectItem>
                <SelectItem value="cold">❄️ Cold</SelectItem>
                <SelectItem value="visited">👥 Visited</SelectItem>
                <SelectItem value="not_visited">📍 Not Visited</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* Metadata */}
          <Card className="p-4 bg-slate-50">
            <div className="flex items-center space-x-2 text-sm text-slate-600 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Added {formatDate(permit.created_at)}</span>
            </div>
            {permit.created_by && (
              <div className="text-sm text-slate-600">
                by {permit.created_by.full_name}
              </div>
            )}
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-slate-50 space-y-2">
          {permit.status !== 'converted_to_lead' && (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleConvertToLead}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Convert to Lead
            </Button>
          )}
          
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}