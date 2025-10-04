"use client"

import { useState, useEffect } from "react"
import { useProgressRouter } from "@/hooks/useProgressRouter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase-client"
import { Trash2, Upload, Plus, Mail, Download, FileText, AlertCircle, Copy, Eye, Check, RefreshCw, ExternalLink, MoreHorizontal, Edit, ArrowUpDown, Calendar, DollarSign, Loader2, Search, X, Filter } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Papa from "papaparse"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { AIJobImport } from "@/components/ai-job-import"
import { Sparkles } from "lucide-react"

type JobType = 'translation' | 'interpreting'
type JobStatus = 'draft' | 'pending' | 'completed' | 'invoiced' | 'paid'

interface Job {
  id: string
  client_id: string
  type: JobType
  status: JobStatus
  source_lang?: string
  target_lang?: string
  word_count?: number
  rate_per_word?: number
  hours?: number
  rate_per_hour?: number
  deadline?: string
  description?: string
  notes?: string
  created_at: string
  client_name?: string
  client_company?: string
  earnings?: number
  // Email sync fields for draft jobs
  email_from?: string
  email_subject?: string
  email_body?: string
  received_at?: string
}

interface Client {
  id: string
  name: string
  company?: string
}

const jobSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  type: z.enum(['translation', 'interpreting']),
  deadline: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  // Translation fields
  source_lang: z.string().optional(),
  target_lang: z.string().optional(),
  word_count: z.number().optional(),
  rate_per_word: z.number().optional(),
  // Interpreting fields
  hours: z.number().optional(),
  rate_per_hour: z.number().optional(),
}).refine((data) => {
  if (data.type === 'translation') {
    return data.source_lang && data.target_lang && data.word_count && data.rate_per_word
  }
  if (data.type === 'interpreting') {
    return data.hours && data.rate_per_hour
  }
  return true
}, {
  message: "Please fill in all required fields for the selected job type"
})

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  contact_email: z.string().email("Valid email required").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_website: z.string().url("Valid URL required").optional().or(z.literal("")),
  billing_address: z.string().optional(),
  notes: z.string().optional(),
  preferred_payment_terms: z.number().min(0).optional(),
  preferred_currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).optional(),
})

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [jobType, setJobType] = useState<JobType>('translation')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResults, setImportResults] = useState<{success: number, errors: string[]}>({ success: 0, errors: [] })
  const [forwardingEmail, setForwardingEmail] = useState<string>('')
  const [draftJobs, setDraftJobs] = useState<Job[]>([])
  const [isGeneratingInbox, setIsGeneratingInbox] = useState(false)
  const [selectedDraftJob, setSelectedDraftJob] = useState<Job | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingClient, setIsSubmittingClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isAIImportOpen, setIsAIImportOpen] = useState(false)
  const supabase = createClient()
  const router = useProgressRouter()

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      type: 'translation',
    },
  })

  const clientForm = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      preferred_payment_terms: 30,
      preferred_currency: 'USD',
    },
  })

  useEffect(() => {
    fetchJobs()
    fetchClients()
    fetchForwardingEmail()
    fetchDraftJobs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs_with_earnings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      console.log('Fetching clients...')
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company')
        .order('name')

      if (error) {
        console.error('Supabase error fetching clients:', error)
        console.error('Error details:', { code: error.code, message: error.message, details: error.details })
        return
      }

      console.log('Clients fetched successfully:', data)
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const handleJobRowClick = (jobId: string) => {
    router.push(`/jobs/${jobId}`)
  }

  const onSubmit = async (values: z.infer<typeof jobSchema>) => {
    setIsSubmitting(true)
    try {
      console.log('Creating job with values:', values)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        toast.error('Authentication error: ' + authError.message)
        return
      }

      if (!user) {
        console.error('No user found')
        toast.error('User not authenticated. Please log in.')
        return
      }

      const jobData = {
        user_id: user.id,
        client_id: values.client_id,
        type: values.type,
        status: 'pending' as JobStatus,
        deadline: values.deadline || null,
        description: values.description || null,
        notes: values.notes || null,
        // Translation fields
        source_lang: values.type === 'translation' ? values.source_lang : null,
        target_lang: values.type === 'translation' ? values.target_lang : null,
        word_count: values.type === 'translation' ? values.word_count : null,
        rate_per_word: values.type === 'translation' ? values.rate_per_word : null,
        // Interpreting fields
        hours: values.type === 'interpreting' ? values.hours : null,
        rate_per_hour: values.type === 'interpreting' ? values.rate_per_hour : null,
      }

      console.log('Inserting job data:', jobData)

      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()

      if (error) {
        console.error('Supabase error:', error)
        toast.error('Database error: ' + error.message)
        return
      }

      console.log('Job created successfully:', data)
      toast.success('Job created successfully!')
      await fetchJobs()
      setIsModalOpen(false)
      form.reset()
    } catch (error) {
      console.error('Error creating job:', error)
      toast.error('Error creating job: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateJobStatus = async (jobId: string, currentStatus: JobStatus) => {
    const statusCycle: Record<JobStatus, JobStatus> = {
      draft: 'pending',
      pending: 'completed',
      completed: 'invoiced',
      invoiced: 'paid',
      paid: 'pending'
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: statusCycle[currentStatus] })
        .eq('id', jobId)

      if (error) throw error
      await fetchJobs()
    } catch (error) {
      console.error('Error updating job status:', error)
    }
  }

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)

      if (error) throw error
      await fetchJobs()
    } catch (error) {
      console.error('Error deleting job:', error)
    }
  }

  const onSubmitClient = async (values: z.infer<typeof clientSchema>) => {
    setIsSubmittingClient(true)
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        toast.error('Authentication error: ' + authError.message)
        return
      }

      if (!user) {
        console.error('No user found')
        toast.error('User not authenticated. Please log in.')
        return
      }

      console.log('Creating client for user:', user.id)
      console.log('Client data:', values)

      const clientData = {
        user_id: user.id,
        name: values.name,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        company_name: values.company_name || null,
        company_address: values.company_address || null,
        company_website: values.company_website || null,
        billing_address: values.billing_address || null,
        notes: values.notes || null,
        preferred_payment_terms: values.preferred_payment_terms || 30,
        preferred_currency: values.preferred_currency || 'USD',
      }

      console.log('Inserting client data:', clientData)

      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()

      if (error) {
        console.error('Supabase error:', error)
        toast.error('Database error: ' + error.message)
        return
      }

      console.log('Client created successfully:', data)
      await fetchClients()
      setIsClientModalOpen(false)
      clientForm.reset({
        preferred_payment_terms: 30,
        preferred_currency: 'USD',
      })
      toast.success('Client created successfully!')
    } catch (error) {
      console.error('Error creating client:', error)
      toast.error('Error creating client: ' + (error as Error).message)
    } finally {
      setIsSubmittingClient(false)
    }
  }

  const downloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/templates/jobs-import-template.csv'
    link.download = 'jobs-import-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setUploadedFile(file)
        setImportResults({ success: 0, errors: [] })
      } else {
        alert('Please upload a CSV file.')
        event.target.value = ''
      }
    }
  }

  const processImport = async () => {
    if (!uploadedFile) {
      alert('Please select a file to upload.')
      return
    }

    setIsProcessing(true)
    const errors: string[] = []
    let successCount = 0

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('User not authenticated. Please log in.')
        return
      }

      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as any[]

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            try {
              // Find or create client
              let clientId = null
              if (row['Client Name']) {
                // Check if client exists
                const { data: existingClients } = await supabase
                  .from('clients')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('name', row['Client Name'])
                  .limit(1)

                if (existingClients && existingClients.length > 0) {
                  clientId = existingClients[0].id
                } else {
                  // Create new client
                  const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert([{
                      user_id: user.id,
                      name: row['Client Name'],
                      email: row['Client Email'] || null,
                      company: row['Client Company'] || null,
                    }])
                    .select()
                    .single()

                  if (clientError) {
                    errors.push(`Row ${i + 2}: Error creating client - ${clientError.message}`)
                    continue
                  }
                  clientId = newClient.id
                }
              }

              if (!clientId) {
                errors.push(`Row ${i + 2}: Client name is required`)
                continue
              }

              // Validate job type
              const jobType = row['Type']?.toLowerCase()
              if (!jobType || !['translation', 'interpreting'].includes(jobType)) {
                errors.push(`Row ${i + 2}: Invalid job type. Must be 'translation' or 'interpreting'`)
                continue
              }

              // Prepare job data
              const jobData: any = {
                user_id: user.id,
                client_id: clientId,
                type: jobType,
                status: 'pending',
                deadline: row['Deadline'] || null,
                description: row['Description'] || null,
                notes: row['Notes'] || null,
              }

              // Add type-specific fields
              if (jobType === 'translation') {
                const wordCount = parseInt(row['Word Count'])
                const ratePerWord = parseFloat(row['Rate Per Word'])

                if (!row['Source Language'] || !row['Target Language']) {
                  errors.push(`Row ${i + 2}: Translation jobs require Source Language and Target Language`)
                  continue
                }
                if (!wordCount || !ratePerWord) {
                  errors.push(`Row ${i + 2}: Translation jobs require Word Count and Rate Per Word`)
                  continue
                }

                jobData.source_lang = row['Source Language']
                jobData.target_lang = row['Target Language']
                jobData.word_count = wordCount
                jobData.rate_per_word = ratePerWord
              } else if (jobType === 'interpreting') {
                const hours = parseFloat(row['Hours'])
                const ratePerHour = parseFloat(row['Rate Per Hour'])

                if (!hours || !ratePerHour) {
                  errors.push(`Row ${i + 2}: Interpreting jobs require Hours and Rate Per Hour`)
                  continue
                }

                jobData.hours = hours
                jobData.rate_per_hour = ratePerHour
              }

              // Insert job
              const { error: jobError } = await supabase
                .from('jobs')
                .insert([jobData])

              if (jobError) {
                errors.push(`Row ${i + 2}: Error creating job - ${jobError.message}`)
              } else {
                successCount++
              }

            } catch (error) {
              errors.push(`Row ${i + 2}: ${(error as Error).message}`)
            }
          }

          setImportResults({ success: successCount, errors })
          setIsProcessing(false)

          if (successCount > 0) {
            await fetchJobs()
            await fetchClients()
          }

          // Show results
          if (errors.length > 0) {
            alert(`Import completed with ${successCount} successful imports and ${errors.length} errors. Check the results below.`)
          } else {
            alert(`Successfully imported ${successCount} jobs!`)
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          alert('Error parsing CSV file: ' + error.message)
          setIsProcessing(false)
        }
      })
    } catch (error) {
      console.error('Import error:', error)
      alert('Error during import: ' + (error as Error).message)
      setIsProcessing(false)
    }
  }

  const fetchForwardingEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const response = await fetch(`/api/generate-inbox?userId=${user.id}`)
      const data = await response.json()

      if (data.forwardingEmail) {
        setForwardingEmail(data.forwardingEmail)
      }
    } catch (error) {
      console.error('Error fetching forwarding email:', error)
    }
  }

  const fetchDraftJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs_with_earnings')
        .select('*')
        .eq('status', 'draft')
        .order('received_at', { ascending: false })

      if (error) throw error
      setDraftJobs(data || [])
    } catch (error) {
      console.error('Error fetching draft jobs:', error)
    }
  }

  const pollEmails = async () => {
    try {
      setIsGeneratingInbox(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('User not authenticated')
        return
      }

      const response = await fetch('/api/poll-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await response.json()

      if (data.success) {
        if (data.processed > 0) {
          toast.success(`Found ${data.processed} new email(s)!`)
          await fetchDraftJobs()
        } else {
          toast.info('No new emails found')
        }
      } else {
        toast.error('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error polling emails:', error)
      toast.error('Error checking for new emails')
    } finally {
      setIsGeneratingInbox(false)
    }
  }

  const generateInbox = async () => {
    try {
      setIsGeneratingInbox(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('User not authenticated')
        return
      }

      const response = await fetch('/api/generate-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await response.json()

      if (data.success) {
        setForwardingEmail(data.forwardingEmail)
        alert('Email forwarding set up successfully!')
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error generating inbox:', error)
      alert('Error setting up email forwarding')
    } finally {
      setIsGeneratingInbox(false)
    }
  }

  const copyEmailToClipboard = async () => {
    if (forwardingEmail) {
      await navigator.clipboard.writeText(forwardingEmail)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  const reviewDraftJob = (job: Job) => {
    setSelectedDraftJob(job)

    // Pre-fill form with draft job data
    form.reset({
      client_id: job.client_id,
      type: 'translation', // Default, user can change
      description: job.email_subject || '',
      notes: `Email from: ${job.email_from}\n\n${job.email_body || ''}`,
      deadline: '',
      source_lang: '',
      target_lang: '',
      word_count: undefined,
      rate_per_word: undefined,
      hours: undefined,
      rate_per_hour: undefined,
    })

    setJobType('translation')
    setIsModalOpen(true)
  }

  const deleteDraftJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this draft job?')) return

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)

      if (error) throw error
      await fetchDraftJobs()
    } catch (error) {
      console.error('Error deleting draft job:', error)
      alert('Error deleting draft job')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status: JobStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      invoiced: 'bg-blue-100 text-blue-800',
      paid: 'bg-purple-100 text-purple-800'
    }
    return colors[status]
  }

  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1
    return acc
  }, {} as Record<JobStatus, number>)

  // Filter and search jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clients.find(c => c.id === job.client_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    const matchesType = typeFilter === 'all' || job.type === typeFilter
    const matchesClient = clientFilter === 'all' || job.client_id === clientFilter

    return matchesSearch && matchesStatus && matchesType && matchesClient
  })

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset to page 1 when filters change
  const resetPagination = () => setCurrentPage(1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Manage your translation and interpreting projects.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAIImportOpen(true)} variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Import
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Job
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Job</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="import">Import</TabsTrigger>
                <TabsTrigger value="sync">Sync</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Job Type</Label>
                      <Select
                        value={jobType}
                        onValueChange={(value: JobType) => {
                          setJobType(value)
                          form.setValue('type', value)
                        }}
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
                      <Label htmlFor="client_id">Client</Label>
                      {clients.length === 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 border rounded-md bg-muted">
                            <span className="text-sm text-muted-foreground">No clients found</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsClientModalOpen(true)}
                            >
                              Create Client
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Select onValueChange={(value) => form.setValue('client_id', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name} {client.company && `(${client.company})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsClientModalOpen(true)}
                            className="w-full"
                          >
                            + Add New Client
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {jobType === 'translation' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="source_lang">Source Language</Label>
                        <Input
                          placeholder="e.g., EN"
                          {...form.register('source_lang')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="target_lang">Target Language</Label>
                        <Input
                          placeholder="e.g., ES"
                          {...form.register('target_lang')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="word_count">Word Count</Label>
                        <Input
                          type="number"
                          {...form.register('word_count', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rate_per_word">Rate per Word ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('rate_per_word', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  )}

                  {jobType === 'interpreting' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hours">Hours</Label>
                        <Input
                          type="number"
                          step="0.5"
                          {...form.register('hours', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rate_per_hour">Rate per Hour ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('rate_per_hour', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      type="date"
                      {...form.register('deadline')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      placeholder="Brief description of the job"
                      {...form.register('description')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      placeholder="Additional notes"
                      {...form.register('notes')}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Job...
                      </>
                    ) : (
                      'Create Job'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="import" className="space-y-4">
                <div className="space-y-6">
                  {/* Template Download Section */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900">Download Template</h4>
                        <p className="text-sm text-blue-700 mb-3">
                          Use our CSV template to format your job data correctly before importing.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadTemplate}
                          className="border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download CSV Template
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* File Upload Section */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="csvFile" className="text-sm font-medium">
                        Upload CSV File
                      </Label>
                      <Input
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Only CSV files are supported. Maximum file size: 5MB
                      </p>
                    </div>

                    {uploadedFile && (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800">{uploadedFile.name}</span>
                        </div>
                        <Button
                          onClick={processImport}
                          disabled={isProcessing}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Import Jobs
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Import Results */}
                  {(importResults.success > 0 || importResults.errors.length > 0) && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Import Results</h4>

                      {importResults.success > 0 && (
                        <div className="flex items-center space-x-2 text-green-700">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm">Successfully imported {importResults.success} jobs</span>
                        </div>
                      )}

                      {importResults.errors.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-red-700">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">{importResults.errors.length} errors occurred:</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto bg-red-50 border border-red-200 rounded p-2">
                            {importResults.errors.map((error, index) => (
                              <div key={index} className="text-xs text-red-800 mb-1">
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-2">CSV Format Instructions</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Type:</strong> Must be "translation" or "interpreting"</li>
                      <li>• <strong>Client Name:</strong> Required. Will create client if doesn't exist</li>
                      <li>• <strong>Translation jobs:</strong> Require Source Language, Target Language, Word Count, Rate Per Word</li>
                      <li>• <strong>Interpreting jobs:</strong> Require Hours, Rate Per Hour</li>
                      <li>• <strong>Deadline:</strong> Use YYYY-MM-DD format (e.g., 2024-12-31)</li>
                      <li>• <strong>Rates:</strong> Use decimal numbers (e.g., 0.15 for $0.15 per word)</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sync" className="space-y-6">
                {/* Forwarding Email Setup */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Forwarding Setup</h3>

                  {forwardingEmail ? (
                    <div className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-start space-x-3">
                        <Mail className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900">Forwarding Email Active</h4>
                          <p className="text-sm text-green-700 mb-3">
                            Forward job request emails to this address. They will appear below as draft jobs.
                          </p>
                          <div className="flex items-center space-x-2 mb-2">
                            <code className="bg-white px-2 py-1 rounded text-sm border">
                              {forwardingEmail}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={copyEmailToClipboard}
                              className="h-8"
                            >
                              {copiedEmail ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-green-600">
                            {copiedEmail ? 'Copied!' : 'Click to copy email address'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <div className="flex items-start space-x-3">
                        <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900">Set Up Email Forwarding</h4>
                          <p className="text-sm text-blue-700 mb-3">
                            Generate a unique email address to receive job requests automatically.
                          </p>
                          <Button
                            onClick={generateInbox}
                            disabled={isGeneratingInbox}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isGeneratingInbox ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Setting up...
                              </>
                            ) : (
                              <>
                                <Mail className="h-4 w-4 mr-2" />
                                Generate Forwarding Email
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Draft Jobs Section */}
                {forwardingEmail && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Draft Jobs from Email</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={pollEmails}
                          disabled={isGeneratingInbox}
                        >
                          {isGeneratingInbox ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Checking...
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-2" />
                              Check for New Emails
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchDraftJobs}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                    </div>

                    {draftJobs.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg bg-gray-50">
                        <Mail className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No draft jobs from email yet.</p>
                        <p className="text-sm text-muted-foreground">
                          Email requests will appear here automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject</TableHead>
                              <TableHead>From</TableHead>
                              <TableHead>Date Received</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {draftJobs.map((job) => (
                              <TableRow key={job.id}>
                                <TableCell>
                                  <div className="font-medium">
                                    {job.email_subject || 'No Subject'}
                                  </div>
                                  {job.description && (
                                    <div className="text-sm text-muted-foreground truncate">
                                      {job.description}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{job.client_name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {job.email_from}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {job.received_at ? new Date(job.received_at).toLocaleDateString() : '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => reviewDraftJob(job)}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Review & Save
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteDraftJob(job.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}

                {/* Instructions */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-2">How Email Sync Works (Free Version - No Webhooks Needed!)</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Generate your unique forwarding email address above</li>
                    <li>Give this email to clients or use it in your email signature</li>
                    <li>When clients send job requests to this address, emails are stored in your inbox</li>
                    <li>Click "Check for New Emails" button to fetch new emails manually</li>
                    <li>Emails automatically convert to draft jobs - review and save them as proper jobs</li>
                    <li>New clients are automatically created from sender email addresses</li>
                  </ol>
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Tip:</strong> Click "Check for New Emails" whenever you expect new job requests. This works with MailSlurp's free tier (no webhook subscription needed)!
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.invoiced || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.paid || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold">Job List</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and track your translation and interpreting jobs
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredJobs.length} of {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description, notes, or client..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    resetPagination()
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value)
                    resetPagination()
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="invoiced">Invoiced</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value)
                    resetPagination()
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="translation">Translation</SelectItem>
                    <SelectItem value="interpreting">Interpreting</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={clientFilter}
                  onValueChange={(value) => {
                    setClientFilter(value)
                    resetPagination()
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || clientFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      setTypeFilter('all')
                      setClientFilter('all')
                      resetPagination()
                    }}
                    title="Clear filters"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No jobs yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first job to get started with tracking your work.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Type
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Client
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Status
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Deadline
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Earnings
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedJobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className="cursor-pointer hover:bg-muted/50 transition-all duration-200 group"
                      onClick={() => handleJobRowClick(job.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            job.type === 'translation' ? 'bg-blue-500' : 'bg-green-500'
                          }`} />
                          <span className="capitalize">{job.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{job.client_name}</div>
                          {job.client_company && (
                            <div className="text-xs text-muted-foreground">{job.client_company}</div>
                          )}
                          {job.email_from && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {job.email_from}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {job.deadline ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(job.deadline).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No deadline</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {job.earnings ? (
                            <span className="text-green-600">{formatCurrency(job.earnings)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleJobRowClick(job.id)
                              }}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                updateJobStatus(job.id, job.status)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                            {(job.status === 'completed' || (job.status !== 'invoiced' && job.status !== 'paid' && job.earnings && job.earnings > 0)) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleJobRowClick(job.id)
                                  }}
                                  className="text-green-600"
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Generate Invoice
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteJob(job.id)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && filteredJobs.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      return page === 1 ||
                             page === totalPages ||
                             Math.abs(page - currentPage) <= 1
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const showEllipsisBefore = index > 0 && page - array[index - 1] > 1
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsisBefore && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-9"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </div>
                      )
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Creation Modal */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Client Name *</Label>
                  <Input
                    placeholder="John Doe"
                    {...clientForm.register('name')}
                  />
                  {clientForm.formState.errors.name && (
                    <p className="text-sm text-red-600">{clientForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    {...clientForm.register('contact_email')}
                  />
                  {clientForm.formState.errors.contact_email && (
                    <p className="text-sm text-red-600">{clientForm.formState.errors.contact_email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    {...clientForm.register('contact_phone')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    placeholder="Acme Corp"
                    {...clientForm.register('company_name')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Company Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_website">Website</Label>
                  <Input
                    placeholder="https://example.com"
                    {...clientForm.register('company_website')}
                  />
                  {clientForm.formState.errors.company_website && (
                    <p className="text-sm text-red-600">{clientForm.formState.errors.company_website.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_address">Company Address</Label>
                  <Input
                    placeholder="123 Main St, City, Country"
                    {...clientForm.register('company_address')}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="billing_address">Billing Address</Label>
                  <Input
                    placeholder="123 Billing St, City, Country"
                    {...clientForm.register('billing_address')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Payment Preferences</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_currency">Preferred Currency</Label>
                  <Select
                    value={clientForm.watch('preferred_currency')}
                    onValueChange={(value) => clientForm.setValue('preferred_currency', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_payment_terms">Payment Terms (days)</Label>
                  <Input
                    type="number"
                    {...clientForm.register('preferred_payment_terms', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                placeholder="Additional notes about this client..."
                rows={4}
                {...clientForm.register('notes')}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={isSubmittingClient}>
                {isSubmittingClient ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Client...
                  </>
                ) : (
                  'Create Client'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsClientModalOpen(false)
                  clientForm.reset({
                    preferred_payment_terms: 30,
                    preferred_currency: 'USD',
                  })
                }}
                disabled={isSubmittingClient}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Job Import Modal */}
      <AIJobImport
        isOpen={isAIImportOpen}
        onClose={() => setIsAIImportOpen(false)}
        onSuccess={() => {
          fetchJobs()
          fetchClients()
        }}
      />

      <Toaster position="top-right" richColors />
    </div>
  )
}