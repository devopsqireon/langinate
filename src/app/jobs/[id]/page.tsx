"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase-client"
import { ArrowLeft, Edit, Save, X, Trash2 } from "lucide-react"

type JobType = 'translation' | 'interpreting'
type JobStatus = 'draft' | 'pending' | 'completed' | 'invoiced' | 'paid'

interface Job {
  id: string
  type: JobType
  status: JobStatus
  deadline?: string
  description?: string
  notes?: string
  source_lang?: string
  target_lang?: string
  word_count?: number
  rate_per_word?: number
  hours?: number
  rate_per_hour?: number
  created_at: string
  updated_at: string
  client_id: string
  client_name: string
  client_email?: string
  client_company?: string
  earnings?: number
  email_from?: string
  email_subject?: string
  received_at?: string
}

export default function JobDetails() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Job>>({})

  const supabase = createClient()

  useEffect(() => {
    if (jobId) {
      fetchJobDetails()
    }
  }, [jobId])

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs_with_earnings')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) throw error

      setJob(data)
      setEditForm(data)
    } catch (error) {
      console.error('Error fetching job details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'invoiced': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm(job || {})
  }

  const handleSave = async () => {
    if (!job) return

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          type: editForm.type,
          status: editForm.status,
          deadline: editForm.deadline,
          description: editForm.description,
          notes: editForm.notes,
          source_lang: editForm.source_lang,
          target_lang: editForm.target_lang,
          word_count: editForm.word_count,
          rate_per_word: editForm.rate_per_word,
          hours: editForm.hours,
          rate_per_hour: editForm.rate_per_hour,
        })
        .eq('id', jobId)

      if (error) throw error

      await fetchJobDetails()
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating job:', error)
      alert('Error updating job: ' + (error as Error).message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!job) return

    if (confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('jobs')
          .delete()
          .eq('id', jobId)

        if (error) throw error

        router.push('/jobs')
      } catch (error) {
        console.error('Error deleting job:', error)
        alert('Error deleting job: ' + (error as Error).message)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-8">Loading job details...</div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-8">Job not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Job Details</h1>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Job Type</Label>
              {isEditing ? (
                <Select
                  value={editForm.type}
                  onValueChange={(value: JobType) => setEditForm({...editForm, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="translation">Translation</SelectItem>
                    <SelectItem value="interpreting">Interpreting</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="font-medium capitalize">{job.type}</div>
              )}
            </div>

            <div>
              <Label>Status</Label>
              {isEditing ? (
                <Select
                  value={editForm.status}
                  onValueChange={(value: JobStatus) => setEditForm({...editForm, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="invoiced">Invoiced</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={getStatusColor(job.status)}>
                  {job.status}
                </Badge>
              )}
            </div>

            <div>
              <Label>Deadline</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editForm.deadline || ''}
                  onChange={(e) => setEditForm({...editForm, deadline: e.target.value})}
                />
              ) : (
                <div className="font-medium">
                  {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'No deadline set'}
                </div>
              )}
            </div>

            <div>
              <Label>Created</Label>
              <div className="font-medium">{new Date(job.created_at).toLocaleString()}</div>
            </div>

            <div>
              <Label>Last Updated</Label>
              <div className="font-medium">{new Date(job.updated_at).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Client Name</Label>
              <div className="font-medium">{job.client_name}</div>
            </div>

            {job.client_email && (
              <div>
                <Label>Email</Label>
                <div className="font-medium">{job.client_email}</div>
              </div>
            )}

            {job.client_company && (
              <div>
                <Label>Company</Label>
                <div className="font-medium">{job.client_company}</div>
              </div>
            )}

            {job.email_from && (
              <div>
                <Label>Email From</Label>
                <div className="font-medium">{job.email_from}</div>
              </div>
            )}

            {job.email_subject && (
              <div>
                <Label>Email Subject</Label>
                <div className="font-medium">{job.email_subject}</div>
              </div>
            )}

            {job.received_at && (
              <div>
                <Label>Received At</Label>
                <div className="font-medium">{new Date(job.received_at).toLocaleString()}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.type === 'translation' && (
              <>
                <div>
                  <Label>Source Language</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.source_lang || ''}
                      onChange={(e) => setEditForm({...editForm, source_lang: e.target.value})}
                    />
                  ) : (
                    <div className="font-medium">{job.source_lang || '-'}</div>
                  )}
                </div>

                <div>
                  <Label>Target Language</Label>
                  {isEditing ? (
                    <Input
                      value={editForm.target_lang || ''}
                      onChange={(e) => setEditForm({...editForm, target_lang: e.target.value})}
                    />
                  ) : (
                    <div className="font-medium">{job.target_lang || '-'}</div>
                  )}
                </div>

                <div>
                  <Label>Word Count</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editForm.word_count || ''}
                      onChange={(e) => setEditForm({...editForm, word_count: Number(e.target.value)})}
                    />
                  ) : (
                    <div className="font-medium">{job.word_count || '-'}</div>
                  )}
                </div>

                <div>
                  <Label>Rate per Word</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.rate_per_word || ''}
                      onChange={(e) => setEditForm({...editForm, rate_per_word: Number(e.target.value)})}
                    />
                  ) : (
                    <div className="font-medium">{job.rate_per_word ? formatCurrency(job.rate_per_word) : '-'}</div>
                  )}
                </div>
              </>
            )}

            {job.type === 'interpreting' && (
              <>
                <div>
                  <Label>Hours</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.5"
                      value={editForm.hours || ''}
                      onChange={(e) => setEditForm({...editForm, hours: Number(e.target.value)})}
                    />
                  ) : (
                    <div className="font-medium">{job.hours || '-'}</div>
                  )}
                </div>

                <div>
                  <Label>Rate per Hour</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.rate_per_hour || ''}
                      onChange={(e) => setEditForm({...editForm, rate_per_hour: Number(e.target.value)})}
                    />
                  ) : (
                    <div className="font-medium">{job.rate_per_hour ? formatCurrency(job.rate_per_hour) : '-'}</div>
                  )}
                </div>
              </>
            )}

            <div>
              <Label>Earnings</Label>
              <div className="font-medium text-lg text-green-600">
                {job.earnings ? formatCurrency(job.earnings) : '-'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description & Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Description & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Description</Label>
              {isEditing ? (
                <Textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  rows={4}
                />
              ) : (
                <div className="whitespace-pre-wrap font-medium">
                  {job.description || 'No description provided'}
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  rows={4}
                />
              ) : (
                <div className="whitespace-pre-wrap font-medium">
                  {job.notes || 'No notes added'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}