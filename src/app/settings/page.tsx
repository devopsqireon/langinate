"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import {
  DollarSign,
  FileText,
  Bell,
  Shield,
  User,
  Loader2,
  Save,
  KeyRound,
  Trash2,
  Settings as SettingsIcon,
  Globe,
  Mail
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UserSettings {
  // Business Settings
  default_currency: string
  default_rate_per_word: number
  default_rate_per_hour: number

  // Invoice Settings
  invoice_prefix: string
  next_invoice_number: number
  default_payment_terms: number

  // Notification Settings
  notify_job_deadlines: boolean
  notify_payment_received: boolean
  notify_new_messages: boolean
  notify_training_updates: boolean
}

export default function Settings() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" })
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  const [settings, setSettings] = useState<UserSettings>({
    default_currency: "USD",
    default_rate_per_word: 0.15,
    default_rate_per_hour: 75.00,
    invoice_prefix: "INV-",
    next_invoice_number: 1001,
    default_payment_terms: 30,
    notify_job_deadlines: true,
    notify_payment_received: true,
    notify_new_messages: true,
    notify_training_updates: true
  })

  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("User not found")
        return
      }

      setUserEmail(user.email || "")

      // Fetch user settings
      const { data: userSettings, error: settingsError } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError
      }

      if (userSettings) {
        setSettings({
          default_currency: userSettings.default_currency || "USD",
          default_rate_per_word: userSettings.default_rate_per_word || 0.15,
          default_rate_per_hour: userSettings.default_rate_per_hour || 75.00,
          invoice_prefix: userSettings.invoice_prefix || "INV-",
          next_invoice_number: userSettings.next_invoice_number || 1001,
          default_payment_terms: userSettings.default_payment_terms || 30,
          notify_job_deadlines: userSettings.notify_job_deadlines ?? true,
          notify_payment_received: userSettings.notify_payment_received ?? true,
          notify_new_messages: userSettings.notify_new_messages ?? true,
          notify_training_updates: userSettings.notify_training_updates ?? true
        })
      }

    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("User not found")
        return
      }

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          ...settings
        })

      if (error) throw error

      toast.success("Settings saved successfully!")
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error("New passwords don't match")
      return
    }

    if (passwordData.new.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      })

      if (error) throw error

      toast.success("Password updated successfully!")
      setShowPasswordDialog(false)
      setPasswordData({ current: "", new: "", confirm: "" })
    } catch (error) {
      console.error("Error updating password:", error)
      toast.error("Failed to update password")
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      toast.error("Please type DELETE to confirm")
      return
    }

    try {
      // Note: Account deletion should be handled server-side in production
      toast.error("Please contact support to delete your account")
      setShowDeleteDialog(false)
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to delete account")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and application settings
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="business" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="invoicing" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoicing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Default Rates & Currency
              </CardTitle>
              <CardDescription>
                Set your default billing rates and preferred currency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rate-word">Rate per Word (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input
                      id="rate-word"
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.default_rate_per_word}
                      onChange={(e) => setSettings({ ...settings, default_rate_per_word: parseFloat(e.target.value) || 0 })}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for translation jobs</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate-hour">Rate per Hour (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input
                      id="rate-hour"
                      type="number"
                      step="1"
                      min="0"
                      value={settings.default_rate_per_hour}
                      onChange={(e) => setSettings({ ...settings, default_rate_per_hour: parseFloat(e.target.value) || 0 })}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for interpretation jobs</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <select
                  id="currency"
                  value={settings.default_currency}
                  onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
                <p className="text-xs text-muted-foreground">This will be used for all invoices and quotes</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoicing Settings */}
        <TabsContent value="invoicing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Configuration
              </CardTitle>
              <CardDescription>
                Customize your invoice numbering and payment terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoice-prefix">Invoice Prefix</Label>
                  <Input
                    id="invoice-prefix"
                    value={settings.invoice_prefix}
                    onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                    placeholder="INV-"
                  />
                  <p className="text-xs text-muted-foreground">Prefix for invoice numbers (e.g., INV-1001)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next-invoice">Next Invoice Number</Label>
                  <Input
                    id="next-invoice"
                    type="number"
                    min="1"
                    value={settings.next_invoice_number}
                    onChange={(e) => setSettings({ ...settings, next_invoice_number: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground">Starting number for new invoices</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="payment-terms">Default Payment Terms (Days)</Label>
                <select
                  id="payment-terms"
                  value={settings.default_payment_terms}
                  onChange={(e) => setSettings({ ...settings, default_payment_terms: parseInt(e.target.value) })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={7}>Net 7 - Due in 7 days</option>
                  <option value={15}>Net 15 - Due in 15 days</option>
                  <option value={30}>Net 30 - Due in 30 days</option>
                  <option value={45}>Net 45 - Due in 45 days</option>
                  <option value={60}>Net 60 - Due in 60 days</option>
                  <option value={90}>Net 90 - Due in 90 days</option>
                </select>
                <p className="text-xs text-muted-foreground">How many days clients have to pay invoices</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-3">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Preview</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Next invoice: <span className="font-mono font-semibold">{settings.invoice_prefix}{settings.next_invoice_number}</span>
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Payment due: Net {settings.default_payment_terms}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-base">Job Deadline Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified 24 hours before job deadlines
                  </p>
                </div>
                <Switch
                  checked={settings.notify_job_deadlines}
                  onCheckedChange={(checked) => setSettings({ ...settings, notify_job_deadlines: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-base">Payment Received</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications when invoices are marked as paid
                  </p>
                </div>
                <Switch
                  checked={settings.notify_payment_received}
                  onCheckedChange={(checked) => setSettings({ ...settings, notify_payment_received: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-base">New Client Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts for new messages from clients
                  </p>
                </div>
                <Switch
                  checked={settings.notify_new_messages}
                  onCheckedChange={(checked) => setSettings({ ...settings, notify_new_messages: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-base">Training Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    New courses and certification opportunities
                  </p>
                </div>
                <Switch
                  checked={settings.notify_training_updates}
                  onCheckedChange={(checked) => setSettings({ ...settings, notify_training_updates: checked })}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Notifications sent to</p>
                    <p className="text-sm text-muted-foreground mt-1">{userEmail}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label className="text-base">Change Password</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Update your account password to keep it secure
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Change
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label className="text-base">Email Address</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {userEmail}
                  </p>
                </div>
                <Badge variant="secondary">Verified</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-destructive rounded-lg bg-destructive/5">
                <div className="flex-1">
                  <Label className="text-base">Delete Account</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password below. Make sure it's at least 6 characters long.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange}>
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium">Please type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
            </div>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
