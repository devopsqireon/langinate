"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase-client"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  Globe,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  Users,
  Briefcase,
  Eye,
  X,
  Filter,
  ArrowUpDown,
  Upload,
  Download,
  AlertCircle,
  Loader2
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Papa from "papaparse"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

interface Client {
  id: string
  user_id: string
  name: string
  contact_email?: string
  contact_phone?: string
  company_name?: string
  company_address?: string
  company_website?: string
  billing_address?: string
  notes?: string
  preferred_payment_terms?: number
  preferred_currency?: string
  created_at: string
  updated_at: string
  // Stats from jobs
  total_jobs?: number
  active_jobs?: number
  total_revenue?: number
  last_job_date?: string
}

interface Job {
  id: string
  client_id: string
  type: string
  status: string
  deadline?: string
  description?: string
  earnings?: number
  created_at: string
}

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

type SortField = 'name' | 'company_name' | 'total_jobs' | 'total_revenue' | 'created_at'
type SortOrder = 'asc' | 'desc'

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientJobs, setClientJobs] = useState<Job[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResults, setImportResults] = useState<{success: number, errors: string[]}>({ success: 0, errors: [] })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const supabase = createClient()

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      preferred_payment_terms: 30,
      preferred_currency: 'USD',
    },
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setIsLoading(true)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name')

      if (clientsError) throw clientsError

      // Fetch job statistics for each client
      const clientsWithStats = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { data: jobs, error: jobsError } = await supabase
            .from('jobs_with_earnings')
            .select('*')
            .eq('client_id', client.id)

          if (jobsError) {
            console.error('Error fetching jobs for client:', jobsError)
            return { ...client, total_jobs: 0, active_jobs: 0, total_revenue: 0 }
          }

          const total_jobs = jobs?.length || 0
          const active_jobs = jobs?.filter(j => j.status === 'pending' || j.status === 'draft').length || 0
          const total_revenue = jobs?.reduce((sum, job) => sum + (job.earnings || 0), 0) || 0
          const last_job_date = jobs?.length > 0 ? jobs[0].created_at : null

          return {
            ...client,
            total_jobs,
            active_jobs,
            total_revenue,
            last_job_date,
          }
        })
      )

      setClients(clientsWithStats)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClientJobs = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('jobs_with_earnings')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClientJobs(data || [])
    } catch (error) {
      console.error('Error fetching client jobs:', error)
    }
  }

  const onSubmit = async (values: z.infer<typeof clientSchema>) => {
    setIsSubmitting(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Authentication error. Please log in.')
        return
      }

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

      if (editingClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)

        if (error) throw error
        toast.success('Client updated successfully!')
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert([clientData])

        if (error) throw error
        toast.success('Client created successfully!')
      }

      await fetchClients()
      setIsModalOpen(false)
      setEditingClient(null)
      form.reset()
    } catch (error) {
      console.error('Error saving client:', error)
      toast.error('Error saving client: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    form.reset({
      name: client.name,
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      company_name: client.company_name || '',
      company_address: client.company_address || '',
      company_website: client.company_website || '',
      billing_address: client.billing_address || '',
      notes: client.notes || '',
      preferred_payment_terms: client.preferred_payment_terms || 30,
      preferred_currency: (client.preferred_currency as any) || 'USD',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This will also delete all associated jobs.')) return

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error
      await fetchClients()
      alert('Client deleted successfully!')
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Error deleting client: ' + (error as Error).message)
    }
  }

  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client)
    await fetchClientJobs(client.id)
    setIsDetailModalOpen(true)
  }

  const handleAddNewClick = () => {
    setEditingClient(null)
    setUploadedFile(null)
    setImportResults({ success: 0, errors: [] })
    form.reset({
      preferred_payment_terms: 30,
      preferred_currency: 'USD',
    })
    setIsModalOpen(true)
  }

  const downloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/templates/clients-import-template.csv'
    link.download = 'clients-import-template.csv'
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
        toast.error('Please upload a CSV file.')
        event.target.value = ''
      }
    }
  }

  const processImport = async () => {
    if (!uploadedFile) {
      toast.error('Please select a file to upload.')
      return
    }

    setIsProcessing(true)
    const errors: string[] = []
    let successCount = 0

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('User not authenticated. Please log in.')
        setIsProcessing(false)
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
              if (!row['Client Name'] || row['Client Name'].trim() === '') {
                errors.push(`Row ${i + 2}: Client name is required`)
                continue
              }

              // Validate currency if provided
              const currency = row['Currency']?.toUpperCase() || 'USD'
              if (!['USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(currency)) {
                errors.push(`Row ${i + 2}: Invalid currency "${row['Currency']}". Must be USD, EUR, GBP, CAD, or AUD`)
                continue
              }

              // Validate payment terms
              const paymentTerms = row['Payment Terms (days)'] ? parseInt(row['Payment Terms (days)']) : 30
              if (isNaN(paymentTerms) || paymentTerms < 0) {
                errors.push(`Row ${i + 2}: Invalid payment terms. Must be a positive number`)
                continue
              }

              const clientData = {
                user_id: user.id,
                name: row['Client Name'].trim(),
                contact_email: row['Email']?.trim() || null,
                contact_phone: row['Phone']?.trim() || null,
                company_name: row['Company Name']?.trim() || null,
                company_address: row['Company Address']?.trim() || null,
                company_website: row['Company Website']?.trim() || null,
                billing_address: row['Billing Address']?.trim() || null,
                notes: row['Notes']?.trim() || null,
                preferred_payment_terms: paymentTerms,
                preferred_currency: currency,
              }

              const { error } = await supabase
                .from('clients')
                .insert([clientData])

              if (error) {
                errors.push(`Row ${i + 2}: ${error.message}`)
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
            await fetchClients()
          }

          if (errors.length > 0) {
            toast.warning(`Import completed with ${successCount} successful imports and ${errors.length} errors. Check the results below.`)
          } else {
            toast.success(`Successfully imported ${successCount} clients!`)
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          toast.error('Error parsing CSV file: ' + error.message)
          setIsProcessing(false)
        }
      })
    } catch (error) {
      console.error('Import error:', error)
      alert('Error during import: ' + (error as Error).message)
      setIsProcessing(false)
    }
  }

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCurrency = currencyFilter === 'all' || client.preferred_currency === currencyFilter

      return matchesSearch && matchesCurrency
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      // String comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      // Number comparison
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [clients, searchQuery, currencyFilter, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage)
  const paginatedClients = filteredAndSortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, currencyFilter])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      invoiced: 'bg-blue-100 text-blue-800',
      paid: 'bg-purple-100 text-purple-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Calculate summary stats
  const totalClients = clients.length
  const activeClients = clients.filter(c => (c.active_jobs || 0) > 0).length
  const totalRevenue = clients.reduce((sum, c) => sum + (c.total_revenue || 0), 0)
  const newThisMonth = clients.filter(c => {
    const clientDate = new Date(c.created_at)
    const now = new Date()
    return clientDate.getMonth() === now.getMonth() && clientDate.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client relationships and contact information.
          </p>
        </div>
        <Button onClick={handleAddNewClick}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Client
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {activeClients} with active projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClients}</div>
            <p className="text-xs text-muted-foreground">
              Currently working on projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From all clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Clients added this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold">Client Directory</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your client relationships and contact information
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedClients.length} of {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients by name, company, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                    <SelectItem value="AUD">AUD (A$)</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || currencyFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSearchQuery('')
                      setCurrencyFilter('all')
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
              <p className="text-muted-foreground">Loading clients...</p>
            </div>
          ) : filteredAndSortedClients.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              {searchQuery || currencyFilter !== 'all' ? (
                <>
                  <h3 className="text-lg font-medium mb-1">No clients found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setCurrencyFilter('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-1">No clients yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by adding your first client to manage projects and invoices.
                  </p>
                  <Button onClick={handleAddNewClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Client
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead
                      className="font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Client
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('company_name')}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead
                      className="font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('total_jobs')}
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Jobs
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('total_revenue')}
                    >
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Revenue
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-muted/50 transition-all duration-200 group"
                      onClick={() => handleViewDetails(client)}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{client.name}</div>
                          {client.active_jobs! > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {client.active_jobs} active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {client.company_name || (
                            <span className="text-muted-foreground italic">No company</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {client.contact_email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {client.contact_email}
                            </div>
                          )}
                          {client.contact_phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {client.contact_phone}
                            </div>
                          )}
                          {!client.contact_email && !client.contact_phone && (
                            <span className="text-muted-foreground italic">No contact</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{client.total_jobs || 0}</div>
                          <div className="text-xs text-muted-foreground">
                            {client.active_jobs || 0} active
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {formatCurrency(client.total_revenue || 0, client.preferred_currency)}
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
                                handleViewDetails(client)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(client)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(client.id)
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
          {!isLoading && filteredAndSortedClients.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedClients.length)} of {filteredAndSortedClients.length} clients
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
                      return page === 1 ||
                             page === totalPages ||
                             Math.abs(page - currentPage) <= 1
                    })
                    .map((page, index, array) => {
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

      {/* Create/Edit Client Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          {editingClient ? (
            // Edit mode - show form only
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Client Name *</Label>
                  <Input
                    placeholder="John Doe"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    {...form.register('contact_email')}
                  />
                  {form.formState.errors.contact_email && (
                    <p className="text-sm text-red-600">{form.formState.errors.contact_email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    {...form.register('contact_phone')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    placeholder="Acme Corp"
                    {...form.register('company_name')}
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
                    {...form.register('company_website')}
                  />
                  {form.formState.errors.company_website && (
                    <p className="text-sm text-red-600">{form.formState.errors.company_website.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_address">Company Address</Label>
                  <Input
                    placeholder="123 Main St, City, Country"
                    {...form.register('company_address')}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="billing_address">Billing Address</Label>
                  <Input
                    placeholder="123 Billing St, City, Country"
                    {...form.register('billing_address')}
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
                    value={form.watch('preferred_currency')}
                    onValueChange={(value) => form.setValue('preferred_currency', value as any)}
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
                    {...form.register('preferred_payment_terms', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                placeholder="Additional notes about this client..."
                rows={4}
                {...form.register('notes')}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingClient ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingClient ? 'Update Client' : 'Create Client'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingClient(null)
                  form.reset()
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
          ) : (
            // Add mode - show tabs
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="import">Import CSV</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Client Name *</Label>
                        <Input
                          placeholder="John Doe"
                          {...form.register('name')}
                        />
                        {form.formState.errors.name && (
                          <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact_email">Email</Label>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          {...form.register('contact_email')}
                        />
                        {form.formState.errors.contact_email && (
                          <p className="text-sm text-red-600">{form.formState.errors.contact_email.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact_phone">Phone</Label>
                        <Input
                          placeholder="+1 (555) 123-4567"
                          {...form.register('contact_phone')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company_name">Company Name</Label>
                        <Input
                          placeholder="Acme Corp"
                          {...form.register('company_name')}
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
                          {...form.register('company_website')}
                        />
                        {form.formState.errors.company_website && (
                          <p className="text-sm text-red-600">{form.formState.errors.company_website.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company_address">Company Address</Label>
                        <Input
                          placeholder="123 Main St, City, Country"
                          {...form.register('company_address')}
                        />
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="billing_address">Billing Address</Label>
                        <Input
                          placeholder="123 Billing St, City, Country"
                          {...form.register('billing_address')}
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
                          value={form.watch('preferred_currency')}
                          onValueChange={(value) => form.setValue('preferred_currency', value as any)}
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
                          {...form.register('preferred_payment_terms', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      placeholder="Additional notes about this client..."
                      rows={4}
                      {...form.register('notes')}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Client'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsModalOpen(false)
                        form.reset()
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
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
                          Use our CSV template to format your client data correctly before importing.
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
                              Import Clients
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
                          <span className="text-sm">Successfully imported {importResults.success} clients</span>
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
                      <li>• <strong>Client Name:</strong> Required field</li>
                      <li>• <strong>Email:</strong> Optional - must be valid email format</li>
                      <li>• <strong>Currency:</strong> Must be USD, EUR, GBP, CAD, or AUD (default: USD)</li>
                      <li>• <strong>Payment Terms:</strong> Number of days (default: 30)</li>
                      <li>• <strong>All other fields:</strong> Optional text fields</li>
                      <li>• The first row must contain column headers as shown in the template</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Client Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              {/* Client Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold">{selectedClient.name}</h2>
                  {selectedClient.company_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      {selectedClient.company_name}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailModalOpen(false)
                      handleEdit(selectedClient)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedClient.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${selectedClient.contact_email}`} className="text-blue-600 hover:underline">
                          {selectedClient.contact_email}
                        </a>
                      </div>
                    )}
                    {selectedClient.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedClient.contact_phone}`} className="hover:underline">
                          {selectedClient.contact_phone}
                        </a>
                      </div>
                    )}
                    {selectedClient.company_website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={selectedClient.company_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedClient.company_website}
                        </a>
                      </div>
                    )}
                    {!selectedClient.contact_email && !selectedClient.contact_phone && !selectedClient.company_website && (
                      <p className="text-muted-foreground italic">No contact information</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency:</span>
                      <span className="font-medium">{selectedClient.preferred_currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Terms:</span>
                      <span className="font-medium">{selectedClient.preferred_payment_terms} days</span>
                    </div>
                  </CardContent>
                </Card>

                {selectedClient.company_address && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Company Address</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      {selectedClient.company_address}
                    </CardContent>
                  </Card>
                )}

                {selectedClient.billing_address && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Billing Address</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      {selectedClient.billing_address}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedClient.total_jobs || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedClient.active_jobs || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedClient.total_revenue || 0, selectedClient.preferred_currency)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-wrap">
                    {selectedClient.notes}
                  </CardContent>
                </Card>
              )}

              {/* Jobs List */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Associated Jobs ({clientJobs.length})</h3>
                {clientJobs.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg bg-muted/50">
                    <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No jobs for this client yet.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="capitalize">{job.type}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                                {job.status}
                              </span>
                            </TableCell>
                            <TableCell>{job.description || '-'}</TableCell>
                            <TableCell>
                              {job.deadline ? new Date(job.deadline).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {job.earnings ? formatCurrency(job.earnings, selectedClient.preferred_currency) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Toaster position="top-right" richColors />
    </div>
  )
}
