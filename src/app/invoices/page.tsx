"use client"

import { useState, useEffect, useMemo } from "react"
import { useProgressRouter } from "@/hooks/useProgressRouter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  Eye,
  X,
  Filter,
  Download,
  Send,
  Check,
  AlertCircle,
  Clock,
  Loader2
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'

interface Invoice {
  id: string
  user_id: string
  client_id: string
  invoice_number: string
  title?: string
  description?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  currency: string
  issue_date: string
  due_date: string
  paid_date?: string
  status: InvoiceStatus
  payment_method?: string
  payment_reference?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined data
  client_name?: string
}

interface Client {
  id: string
  name: string
  contact_email?: string
  company_name?: string
  preferred_currency?: string
}

interface Job {
  id: string
  client_id: string
  type: string
  description?: string
  earnings?: number
  status: string
}

const invoiceSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  title: z.string().optional(),
  description: z.string().optional(),
  subtotal: z.number().min(0, "Subtotal must be positive"),
  tax_rate: z.number().min(0).max(1).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
})

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedClient, setSelectedClient] = useState<string>("")
  const supabase = createClient()
  const router = useProgressRouter()

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: 'USD',
      tax_rate: 0,
      subtotal: 0,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  })

  useEffect(() => {
    fetchInvoices()
    fetchClients()
    fetchJobs()
  }, [])

  const fetchInvoices = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const invoicesWithClientNames = (data || []).map(inv => ({
        ...inv,
        client_name: inv.clients?.name || 'Unknown Client'
      }))

      setInvoices(invoicesWithClientNames)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs_with_earnings')
        .select('*')
        .in('status', ['completed', 'invoiced'])

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
    setIsSubmitting(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Authentication error. Please log in.')
        return
      }

      // Generate invoice number
      const invoiceCount = invoices.length + 1
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount).padStart(4, '0')}`

      const invoiceData = {
        user_id: user.id,
        client_id: values.client_id,
        invoice_number: invoiceNumber,
        title: values.title || null,
        description: values.description || null,
        subtotal: values.subtotal,
        tax_rate: values.tax_rate || 0,
        currency: values.currency,
        issue_date: values.issue_date,
        due_date: values.due_date,
        notes: values.notes || null,
        status: 'draft' as InvoiceStatus,
        job_ids: [],
      }

      const { error } = await supabase
        .from('invoices')
        .insert([invoiceData])

      if (error) throw error

      toast.success('Invoice created successfully!')
      await fetchInvoices()
      setIsModalOpen(false)
      form.reset()
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Error creating invoice: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)

      if (error) throw error
      await fetchInvoices()
      toast.success('Invoice deleted successfully!')
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('Error deleting invoice')
    }
  }

  const updateStatus = async (invoiceId: string, newStatus: InvoiceStatus) => {
    try {
      const updateData: any = { status: newStatus }

      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)

      if (error) throw error
      await fetchInvoices()
      toast.success(`Invoice marked as ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error updating invoice status')
    }
  }

  // Filter and search
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch =
        invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [invoices, searchQuery, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // Client selection handler
  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId)
    form.setValue('client_id', clientId)

    const client = clients.find(c => c.id === clientId)
    if (client?.preferred_currency) {
      form.setValue('currency', client.preferred_currency as any)
    }

    // Calculate subtotal from completed jobs for this client
    const clientJobs = jobs.filter(j => j.client_id === clientId && j.status === 'completed')
    const total = clientJobs.reduce((sum, job) => sum + (job.earnings || 0), 0)
    form.setValue('subtotal', total)
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const getStatusColor = (status: InvoiceStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-indigo-100 text-indigo-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return colors[status]
  }

  const getStatusIcon = (status: InvoiceStatus) => {
    const icons = {
      draft: FileText,
      sent: Send,
      viewed: Eye,
      paid: Check,
      overdue: AlertCircle,
      cancelled: X
    }
    return icons[status]
  }

  // Calculate stats
  const stats = useMemo(() => {
    const outstanding = invoices
      .filter(i => ['sent', 'viewed', 'overdue'].includes(i.status))
      .reduce((sum, i) => sum + i.total_amount, 0)

    const thisMonth = invoices
      .filter(i => {
        const invoiceDate = new Date(i.issue_date)
        const now = new Date()
        return invoiceDate.getMonth() === now.getMonth() &&
               invoiceDate.getFullYear() === now.getFullYear()
      })
      .reduce((sum, i) => sum + i.total_amount, 0)

    const overdue = invoices.filter(i => i.status === 'overdue').length

    const paidThisMonth = invoices.filter(i => {
      if (!i.paid_date) return false
      const paidDate = new Date(i.paid_date)
      const now = new Date()
      return paidDate.getMonth() === now.getMonth() &&
             paidDate.getFullYear() === now.getFullYear()
    }).length

    return { outstanding, thisMonth, overdue, paidThisMonth }
  }, [invoices])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Track payments and manage your billing.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.outstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Amount pending payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Revenue generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Invoices past due
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Invoices completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold">Invoice List</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and track all your invoices
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredInvoices.length} of {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number, client, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="viewed">Viewed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || statusFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
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
              <p className="text-muted-foreground">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              {searchQuery || statusFilter !== 'all' ? (
                <>
                  <h3 className="text-lg font-medium mb-1">No invoices found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-1">No invoices yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first invoice to start billing clients.
                  </p>
                  <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Invoice
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Invoice #</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Issue Date</TableHead>
                    <TableHead className="font-semibold">Due Date</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => {
                    const StatusIcon = getStatusIcon(invoice.status)
                    return (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50 transition-all duration-200 group"
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                      >
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.client_name}</TableCell>
                        <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.total_amount, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {invoice.status}
                          </Badge>
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
                            <DropdownMenuContent align="end" className="w-[180px]">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/invoices/${invoice.id}`)
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {invoice.status === 'draft' && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateStatus(invoice.id, 'sent')
                                  }}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Mark as Sent
                                </DropdownMenuItem>
                              )}
                              {invoice.status !== 'paid' && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateStatus(invoice.id, 'paid')
                                  }}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(invoice.id)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && filteredInvoices.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
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

      {/* Create Invoice Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Client Information</h3>
              <div className="space-y-2">
                <Label htmlFor="client_id">Client *</Label>
                <Select
                  value={selectedClient}
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.company_name && `(${client.company_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.client_id && (
                  <p className="text-sm text-red-600">{form.formState.errors.client_id.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    placeholder="Professional Translation Services"
                    {...form.register('title')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={form.watch('currency')}
                    onValueChange={(value) => form.setValue('currency', value as any)}
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
                  <Label htmlFor="issue_date">Issue Date *</Label>
                  <Input
                    type="date"
                    {...form.register('issue_date')}
                  />
                  {form.formState.errors.issue_date && (
                    <p className="text-sm text-red-600">{form.formState.errors.issue_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    type="date"
                    {...form.register('due_date')}
                  />
                  {form.formState.errors.due_date && (
                    <p className="text-sm text-red-600">{form.formState.errors.due_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtotal">Subtotal *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register('subtotal', { valueAsNumber: true })}
                  />
                  {form.formState.errors.subtotal && (
                    <p className="text-sm text-red-600">{form.formState.errors.subtotal.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (e.g., 0.08 for 8%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register('tax_rate', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    placeholder="Brief description of services rendered..."
                    rows={3}
                    {...form.register('description')}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    placeholder="Additional notes or payment instructions..."
                    rows={3}
                    {...form.register('notes')}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Invoice...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false)
                  form.reset()
                  setSelectedClient('')
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" richColors />
    </div>
  )
}
