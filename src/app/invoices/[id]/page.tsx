"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  Mail,
  Loader2,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  User
} from "lucide-react"

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
  notes?: string
  payment_instructions?: string
  created_at: string
  updated_at: string
}

interface Client {
  id: string
  name: string
  contact_email?: string
  contact_phone?: string
  company_name?: string
  company_address?: string
  company_website?: string
  billing_address?: string
  preferred_payment_terms?: number
  preferred_currency?: string
}

interface Job {
  id: string
  title: string
  description?: string
  status: string
  job_type: string
  word_count?: number
  price?: number
  source_language?: string
  target_language?: string
}

export default function InvoiceDetails({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [emailMessage, setEmailMessage] = useState("")

  useEffect(() => {
    fetchInvoiceDetails()
  }, [params.id])

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true)

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", params.id)
        .single()

      if (invoiceError) throw invoiceError
      setInvoice(invoiceData)

      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", invoiceData.client_id)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Fetch associated jobs if any
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .eq("client_id", invoiceData.client_id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })

      if (jobsData) setJobs(jobsData)

    } catch (error) {
      console.error("Error fetching invoice details:", error)
      toast.error("Failed to load invoice details")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    const variants: Record<InvoiceStatus, { color: string; icon: JSX.Element }> = {
      draft: { color: "bg-gray-500", icon: <FileText className="h-3 w-3" /> },
      sent: { color: "bg-blue-500", icon: <Send className="h-3 w-3" /> },
      viewed: { color: "bg-purple-500", icon: <Mail className="h-3 w-3" /> },
      paid: { color: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
      overdue: { color: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
      cancelled: { color: "bg-gray-400", icon: <XCircle className="h-3 w-3" /> },
    }

    const variant = variants[status]
    return (
      <Badge className={`${variant.color} text-white flex items-center gap-1`}>
        {variant.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleDownloadPDF = async () => {
    if (!invoice || !client) return

    setIsDownloading(true)
    try {
      // Generate PDF using browser's print functionality
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error("Please allow popups to download PDF")
        return
      }

      const invoiceHTML = generateInvoiceHTML(invoice, client, jobs)
      printWindow.document.write(invoiceHTML)
      printWindow.document.close()

      // Wait for content to load then trigger print
      setTimeout(() => {
        printWindow.print()
        toast.success("PDF download initiated")
      }, 500)

    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setIsDownloading(false)
    }
  }

  const generateInvoiceHTML = (invoice: Invoice, client: Client, jobs: Job[]) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              color: #333;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
            }
            .company-info {
              font-size: 14px;
            }
            .invoice-info {
              text-align: right;
            }
            .invoice-number {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            .section {
              margin-bottom: 30px;
            }
            .section-title {
              font-weight: bold;
              font-size: 12px;
              color: #666;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #f3f4f6;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            .totals {
              margin-top: 20px;
              float: right;
              width: 300px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }
            .totals-row.total {
              font-weight: bold;
              font-size: 18px;
              border-top: 2px solid #333;
              padding-top: 12px;
            }
            .notes {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>INVOICE</h1>
              <p>Your Company Name</p>
              <p>Your Address</p>
              <p>Email: your@email.com</p>
            </div>
            <div class="invoice-info">
              <div class="invoice-number">${invoice.invoice_number}</div>
              <p><strong>Issue Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Bill To</div>
            <p><strong>${client.name}</strong></p>
            ${client.company_name ? `<p>${client.company_name}</p>` : ''}
            ${client.billing_address ? `<p>${client.billing_address}</p>` : ''}
            ${client.contact_email ? `<p>Email: ${client.contact_email}</p>` : ''}
            ${client.contact_phone ? `<p>Phone: ${client.contact_phone}</p>` : ''}
          </div>

          ${invoice.title || invoice.description ? `
          <div class="section">
            <div class="section-title">Description</div>
            ${invoice.title ? `<p><strong>${invoice.title}</strong></p>` : ''}
            ${invoice.description ? `<p>${invoice.description}</p>` : ''}
          </div>
          ` : ''}

          ${jobs.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Type</th>
                <th>Languages</th>
                <th>Word Count</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${jobs.map(job => `
                <tr>
                  <td>${job.title}</td>
                  <td>${job.job_type}</td>
                  <td>${job.source_language || '-'} → ${job.target_language || '-'}</td>
                  <td>${job.word_count || '-'}</td>
                  <td>${invoice.currency} ${(job.price || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${invoice.currency} ${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>Tax (${invoice.tax_rate}%):</span>
              <span>${invoice.currency} ${invoice.tax_amount.toFixed(2)}</span>
            </div>
            <div class="totals-row total">
              <span>Total:</span>
              <span>${invoice.currency} ${invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>

          <div style="clear: both;"></div>

          ${invoice.notes || invoice.payment_instructions ? `
          <div class="notes">
            ${invoice.notes ? `
              <div class="section-title">Notes</div>
              <p>${invoice.notes}</p>
            ` : ''}
            ${invoice.payment_instructions ? `
              <div class="section-title" style="margin-top: 20px;">Payment Instructions</div>
              <p>${invoice.payment_instructions}</p>
            ` : ''}
          </div>
          ` : ''}
        </body>
      </html>
    `
  }

  const handleSendInvoice = async () => {
    if (!invoice || !client) return

    setIsSending(true)
    try {
      // Update invoice status to 'sent'
      const { error } = await supabase
        .from("invoices")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .eq("id", invoice.id)

      if (error) throw error

      // In a real app, you would send email here
      // For now, we'll just simulate it
      toast.success(`Invoice sent to ${client.contact_email || client.name}`)

      setShowSendDialog(false)
      setEmailMessage("")
      fetchInvoiceDetails()

    } catch (error) {
      console.error("Error sending invoice:", error)
      toast.error("Failed to send invoice")
    } finally {
      setIsSending(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!invoice) return

    setIsUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", invoice.id)

      if (error) throw error

      toast.success("Invoice marked as paid")
      fetchInvoiceDetails()

    } catch (error) {
      console.error("Error updating invoice:", error)
      toast.error("Failed to update invoice status")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleCancelInvoice = async () => {
    if (!invoice) return

    setIsUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", invoice.id)

      if (error) throw error

      toast.success("Invoice cancelled")
      fetchInvoiceDetails()

    } catch (error) {
      console.error("Error cancelling invoice:", error)
      toast.error("Failed to cancel invoice")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!invoice || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button onClick={() => router.push("/invoices")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Toaster />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>

          {invoice.status === "draft" && (
            <Button onClick={() => setShowSendDialog(true)} disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invoice
            </Button>
          )}

          {(invoice.status === "sent" || invoice.status === "viewed" || invoice.status === "overdue") && (
            <Button onClick={handleMarkAsPaid} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Mark as Paid
            </Button>
          )}

          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Button
              variant="destructive"
              onClick={handleCancelInvoice}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl mb-2">{invoice.invoice_number}</CardTitle>
              <CardDescription>
                {invoice.title || "Invoice"}
              </CardDescription>
            </div>
            {getStatusBadge(invoice.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Issue Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(invoice.issue_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Due Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold">
                  {invoice.currency} {invoice.total_amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Bill To
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold text-lg">{client.name}</p>
                {client.company_name && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {client.company_name}
                  </p>
                )}
                {client.billing_address && (
                  <p className="text-sm text-muted-foreground">{client.billing_address}</p>
                )}
                {client.contact_email && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {client.contact_email}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoice.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">{invoice.description}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    {invoice.currency} {invoice.subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
                  <span className="font-medium">
                    {invoice.currency} {invoice.tax_amount.toFixed(2)}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">
                    {invoice.currency} {invoice.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {invoice.paid_date && (
                <>
                  <Separator />
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Paid on {new Date(invoice.paid_date).toLocaleDateString()}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Associated Jobs */}
          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Associated Jobs</CardTitle>
                <CardDescription>
                  Completed jobs for this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.source_language} → {job.target_language} • {job.word_count} words
                        </p>
                      </div>
                      {job.price && (
                        <p className="font-medium">
                          {invoice.currency} {job.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Payment Instructions */}
          {invoice.payment_instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.payment_instructions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Invoice Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{new Date(invoice.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{invoice.currency}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Invoice Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
            <DialogDescription>
              Send this invoice to {client.contact_email || client.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-message">Email Message (Optional)</Label>
              <Textarea
                id="email-message"
                placeholder="Add a personal message to include with the invoice..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvoice} disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
