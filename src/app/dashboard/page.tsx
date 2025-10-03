"use client"

import { useEffect, useState, useMemo } from "react"
import { useProgressRouter } from "@/hooks/useProgressRouter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase-client"
import {
  DollarSign,
  FileText,
  Briefcase,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Loader2
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Job {
  id: string
  title: string
  status: string
  client_id: string
  price?: number
  deadline?: string
  created_at: string
}

interface Invoice {
  id: string
  invoice_number: string
  total_amount: number
  status: string
  due_date: string
  issue_date: string
  client_id: string
  currency: string
}

interface Client {
  id: string
  name: string
}

interface DashboardStats {
  totalEarningsThisMonth: number
  pendingInvoicesCount: number
  pendingInvoicesAmount: number
  activeJobsCount: number
  completedJobsThisMonth: number
  totalClients: number
  overdueInvoices: number
}

export default function Dashboard() {
  const router = useProgressRouter()
  const supabase = createClient()

  const [jobs, setJobs] = useState<Job[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalEarningsThisMonth: 0,
    pendingInvoicesCount: 0,
    pendingInvoicesAmount: 0,
    activeJobsCount: 0,
    completedJobsThisMonth: 0,
    totalClients: 0,
    overdueInvoices: 0,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch all data in parallel
      const [jobsData, invoicesData, clientsData] = await Promise.all([
        supabase.from("jobs").select("*").order("created_at", { ascending: false }),
        supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
        supabase.from("clients").select("id, name")
      ])

      if (jobsData.data) setJobs(jobsData.data)
      if (invoicesData.data) setInvoices(invoicesData.data)
      if (clientsData.data) setClients(clientsData.data)

      // Calculate statistics
      calculateStats(jobsData.data || [], invoicesData.data || [], clientsData.data || [])

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (jobsData: Job[], invoicesData: Invoice[], clientsData: Client[]) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Active jobs (in-progress or pending)
    const activeJobs = jobsData.filter(job =>
      job.status === "in-progress" || job.status === "pending"
    )

    // Completed jobs this month
    const completedThisMonth = jobsData.filter(job => {
      const jobDate = new Date(job.created_at)
      return job.status === "completed" &&
             jobDate.getMonth() === currentMonth &&
             jobDate.getFullYear() === currentYear
    })

    // Pending invoices (sent, viewed, overdue)
    const pendingInvoices = invoicesData.filter(inv =>
      inv.status === "sent" || inv.status === "viewed" || inv.status === "overdue"
    )

    // Paid invoices this month
    const paidThisMonth = invoicesData.filter(inv => {
      const invoiceDate = new Date(inv.issue_date)
      return inv.status === "paid" &&
             invoiceDate.getMonth() === currentMonth &&
             invoiceDate.getFullYear() === currentYear
    })

    // Overdue invoices
    const overdue = invoicesData.filter(inv => inv.status === "overdue")

    // Total earnings this month (from paid invoices)
    const earningsThisMonth = paidThisMonth.reduce((sum, inv) => sum + inv.total_amount, 0)

    // Pending invoice amount
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)

    setStats({
      totalEarningsThisMonth: earningsThisMonth,
      pendingInvoicesCount: pendingInvoices.length,
      pendingInvoicesAmount: pendingAmount,
      activeJobsCount: activeJobs.length,
      completedJobsThisMonth: completedThisMonth.length,
      totalClients: clientsData.length,
      overdueInvoices: overdue.length,
    })
  }

  // Monthly earnings chart data (last 6 months)
  const monthlyChartData = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
      const year = date.getFullYear()
      const month = date.getMonth()

      // Calculate earnings for this month
      const monthEarnings = invoices
        .filter(inv => {
          const invDate = new Date(inv.issue_date)
          return inv.status === "paid" &&
                 invDate.getMonth() === month &&
                 invDate.getFullYear() === year
        })
        .reduce((sum, inv) => sum + inv.total_amount, 0)

      months.push({
        month: monthName,
        earnings: monthEarnings,
      })
    }

    return months
  }, [invoices])

  // Recent jobs (last 5)
  const recentJobs = jobs.slice(0, 5)

  // Upcoming invoice deadlines (next 5)
  const upcomingInvoices = invoices
    .filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: JSX.Element }> = {
      pending: { color: "bg-yellow-500", icon: <Clock className="h-3 w-3" /> },
      "in-progress": { color: "bg-blue-500", icon: <Loader2 className="h-3 w-3" /> },
      completed: { color: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
      draft: { color: "bg-gray-500", icon: <FileText className="h-3 w-3" /> },
      sent: { color: "bg-blue-500", icon: <FileText className="h-3 w-3" /> },
      viewed: { color: "bg-purple-500", icon: <FileText className="h-3 w-3" /> },
      paid: { color: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
      overdue: { color: "bg-red-500", icon: <AlertCircle className="h-3 w-3" /> },
    }

    const variant = variants[status] || variants["pending"]
    return (
      <Badge className={`${variant.color} text-white flex items-center gap-1`}>
        {variant.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.name || "Unknown Client"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your translation business.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/jobs")}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
          <Button variant="outline" onClick={() => router.push("/invoices")}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earnings This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalEarningsThisMonth.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.completedJobsThisMonth} jobs completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoicesCount}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.pendingInvoicesAmount.toFixed(2)} outstanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobsCount}</div>
            <p className="text-xs text-muted-foreground">
              In progress or pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueInvoices > 0 && `${stats.overdueInvoices} overdue invoices`}
              {stats.overdueInvoices === 0 && "All payments on track"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Earnings Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monthly Earnings</CardTitle>
              <CardDescription>Your earnings over the last 6 months</CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyChartData}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorEarnings)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Jobs</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/jobs")}>
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No jobs yet. Create your first job to get started.
                </p>
                <Button size="sm" onClick={() => router.push("/jobs")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/jobs/${job.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {getClientName(job.client_id)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(job.status)}
                      {job.price && (
                        <p className="text-sm font-medium">${job.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Invoice Deadlines</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/invoices")}>
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No upcoming invoice deadlines.
                </p>
                <Button size="sm" onClick={() => router.push("/invoices")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {getClientName(invoice.client_id)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(invoice.status)}
                      <p className="text-sm font-medium">
                        {invoice.currency} {invoice.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
