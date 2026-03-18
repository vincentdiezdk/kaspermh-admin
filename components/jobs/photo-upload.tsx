'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Camera, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'

interface Photo {
  id: string
  storage_path: string
  public_url: string
  type: 'before' | 'after'
  signed_url?: string
}

interface PhotoUploadProps {
  jobId: string
  type: 'before' | 'after'
  photos: Photo[]
  onPhotosChange: () => void
}

export function PhotoUpload({ jobId, type, photos, onPhotosChange }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const label = type === 'before' ? 'FØR' : 'EFTER'

  // Get signed URLs for display
  useState(() => {
    const supabase = createClient()
    photos.forEach(async (photo) => {
      const { data } = await supabase.storage
        .from('job-photos')
        .createSignedUrl(photo.storage_path, 3600)
      if (data?.signedUrl) {
        setSignedUrls((prev) => ({ ...prev, [photo.id]: data.signedUrl }))
      }
    })
  })

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    try {
      for (const file of Array.from(files)) {
        // Compress image
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })

        // Generate unique path
        const timestamp = Date.now()
        const random = Math.random().toString(36).slice(2, 8)
        const storagePath = `jobs/${jobId}/${type}/${timestamp}-${random}.jpg`

        // Upload to Supabase Storage
        // TODO: Offline support with IndexedDB + Background Sync
        const { error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(storagePath, compressed, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (uploadError) {
          toast.error(`Fejl ved upload: ${uploadError.message}`)
          continue
        }

        // Get signed URL for the record
        const { data: signedData } = await supabase.storage
          .from('job-photos')
          .createSignedUrl(storagePath, 3600)

        // Insert record in job_photos
        const { error: dbError } = await supabase.from('job_photos').insert({
          job_id: jobId,
          storage_path: storagePath,
          public_url: signedData?.signedUrl || storagePath,
          type,
          taken_by: user?.id || null,
        })

        if (dbError) {
          toast.error(`Fejl ved gemning: ${dbError.message}`)
        }
      }

      toast.success(`${files.length} foto${files.length > 1 ? 's' : ''} uploadet`)
      onPhotosChange()
    } catch (err) {
      toast.error('Fejl ved upload af foto')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(photo: Photo) {
    const supabase = createClient()

    // Delete from storage
    await supabase.storage.from('job-photos').remove([photo.storage_path])

    // Delete from database
    await supabase.from('job_photos').delete().eq('id', photo.id)

    toast.success('Foto slettet')
    onPhotosChange()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">
          {label} ({photos.length})
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1 min-h-[44px] min-w-[44px]"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Tilføj
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrls[photo.id] || photo.public_url}
                alt={`${label} foto`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleDelete(photo)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed p-4 text-center text-sm text-muted-foreground">
          Ingen {label.toLowerCase()} billeder endnu
        </div>
      )}
    </div>
  )
}
