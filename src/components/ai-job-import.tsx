"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Loader2, CheckCircle, AlertCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

// Schema for the editable job data
const jobReviewSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  client_email: z.string().email("Valid email required").optional().or(z.literal("")),
  client_company: z.string().optional(),
  type: z.enum(['translation', 'interpreting']),
  description: z.string().optional(),
  source_language: z.string().optional(),
  target_language: z.string().optional(),
  word_count: z.number().optional(),
  rate_per_word: z.number().optional(),
  duration_hours: z.number().optional(),
  rate_per_hour: z.number().optional(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
})

type JobReviewData = z.infer<typeof jobReviewSchema>

interface AIJobImportProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AIJobImport({ isOpen, onClose, onSuccess }: AIJobImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parsedData, setParsedData] = useState<JobReviewData | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)

  const form = useForm<JobReviewData>({
    resolver: zodResolver(jobReviewSchema),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check if it's a text file (best support)
      if (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.txt')) {
        setFile(selectedFile)
        return
      }

      // Accept common document formats (with warning for PDFs)
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]

      if (validTypes.includes(selectedFile.type) || selectedFile.name.match(/\.(pdf|doc|docx|xls|xlsx)$/i)) {
        setFile(selectedFile)
        // Show warning for PDFs
        if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
          toast.warning('PDF support is limited. For best results, use a text (.txt) file or copy-paste the content.')
        }
      } else {
        toast.error('Please upload a text file (.txt) for best results, or PDF/Word/Excel')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload')
      return
    }

    setIsUploading(true)
    setIsParsing(true)

    try {
      // Read file as text
      const text = await readFileAsText(file)

      // Call AI parsing API
      const response = await fetch('/api/ai-parse-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to parse job details')
      }

      const result = await response.json()

      // Set parsed data and show review modal
      const data = result.data
      setParsedData(data)
      form.reset(data)
      setShowReviewModal(true)
      toast.success('Job details parsed successfully! Please review and edit as needed.')

    } catch (error) {
      console.error('Error parsing job:', error)
      toast.error('Failed to parse job details: ' + (error as Error).message)
    } finally {
      setIsUploading(false)
      setIsParsing(false)
    }
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        resolve(text)
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const handleSaveJob = async (data: JobReviewData) => {
    setIsSaving(true)

    try {
      // Call save job API
      const response = await fetch('/api/save-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save job')
      }

      const result = await response.json()
      toast.success('Job created successfully!')

      // Reset everything and close
      setFile(null)
      setParsedData(null)
      setShowReviewModal(false)
      form.reset()
      onSuccess()
      onClose()

    } catch (error) {
      console.error('Error saving job:', error)
      toast.error('Failed to save job: ' + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFile(null)
    setParsedData(null)
    setShowReviewModal(false)
    form.reset()
    onClose()
  }

  const jobType = form.watch('type')

  return (
    <>
      {/* Upload Modal */}
      <Dialog open={isOpen && !showReviewModal} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Job Import
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Upload Job Document</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">
                Best results: Text files (.txt). Also supports PDF, Word, Excel
              </p>
            </div>

            {file && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Upload a job request document</li>
                    <li>AI extracts client and job details</li>
                    <li>Review and edit the parsed information</li>
                    <li>Confirm to create the job</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="flex-1"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing with AI...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Parse Document
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review & Edit Modal */}
      <Dialog open={showReviewModal} onOpenChange={(open) => !open && setShowReviewModal(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Review & Confirm Job Details
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSaveJob)} className="space-y-6 py-4">
            {/* Client Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Client Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    {...form.register('client_name')}
                    placeholder="John Doe"
                  />
                  {form.formState.errors.client_name && (
                    <p className="text-xs text-red-600">{form.formState.errors.client_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_email">Client Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    {...form.register('client_email')}
                    placeholder="john@example.com"
                  />
                  {form.formState.errors.client_email && (
                    <p className="text-xs text-red-600">{form.formState.errors.client_email.message}</p>
                  )}
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="client_company">Company</Label>
                  <Input
                    id="client_company"
                    {...form.register('client_company')}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
            </div>

            {/* Job Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Job Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Job Type *</Label>
                  <Select
                    value={jobType}
                    onValueChange={(value) => form.setValue('type', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="translation">Translation</SelectItem>
                      <SelectItem value="interpreting">Interpreting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    {...form.register('deadline')}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Job description..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Job-type specific fields */}
            {jobType === 'translation' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Translation Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source_language">Source Language</Label>
                    <Input
                      id="source_language"
                      {...form.register('source_language')}
                      placeholder="English"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_language">Target Language</Label>
                    <Input
                      id="target_language"
                      {...form.register('target_language')}
                      placeholder="Spanish"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="word_count">Word Count</Label>
                    <Input
                      id="word_count"
                      type="number"
                      {...form.register('word_count', { valueAsNumber: true })}
                      placeholder="5000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate_per_word">Rate per Word ($)</Label>
                    <Input
                      id="rate_per_word"
                      type="number"
                      step="0.01"
                      {...form.register('rate_per_word', { valueAsNumber: true })}
                      placeholder="0.10"
                    />
                  </div>
                </div>
              </div>
            )}

            {jobType === 'interpreting' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Interpreting Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration_hours">Duration (hours)</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      step="0.5"
                      {...form.register('duration_hours', { valueAsNumber: true })}
                      placeholder="2.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate_per_hour">Rate per Hour ($)</Label>
                    <Input
                      id="rate_per_hour"
                      type="number"
                      step="0.01"
                      {...form.register('rate_per_hour', { valueAsNumber: true })}
                      placeholder="75.00"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Job...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm & Create Job
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReviewModal(false)}
                disabled={isSaving}
              >
                Back to Edit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
