import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application preferences and business settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Default Rate per Word</label>
              <p className="text-muted-foreground">$0.15</p>
            </div>
            <div>
              <label className="text-sm font-medium">Default Rate per Hour</label>
              <p className="text-muted-foreground">$75.00</p>
            </div>
            <div>
              <label className="text-sm font-medium">Default Currency</label>
              <p className="text-muted-foreground">USD</p>
            </div>
            <div>
              <label className="text-sm font-medium">Default Payment Terms</label>
              <p className="text-muted-foreground">Net 30</p>
            </div>
            <Button variant="outline">Update Rates</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Invoice Prefix</label>
              <p className="text-muted-foreground">INV-</p>
            </div>
            <div>
              <label className="text-sm font-medium">Next Invoice Number</label>
              <p className="text-muted-foreground">1001</p>
            </div>
            <div>
              <label className="text-sm font-medium">Default Due Days</label>
              <p className="text-muted-foreground">30 days</p>
            </div>
            <Button variant="outline">Configure Invoicing</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Job Deadline Reminders</label>
                <p className="text-sm text-muted-foreground">Get notified before job deadlines</p>
              </div>
              <Button variant="outline" size="sm">Enabled</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Payment Received</label>
                <p className="text-sm text-muted-foreground">Notify when invoices are paid</p>
              </div>
              <Button variant="outline" size="sm">Enabled</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">New Client Messages</label>
                <p className="text-sm text-muted-foreground">Alert for client communications</p>
              </div>
              <Button variant="outline" size="sm">Enabled</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Change Password</label>
                <p className="text-sm text-muted-foreground">Update your account password</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Delete Account</label>
                <p className="text-sm text-muted-foreground">Permanently delete your account and data</p>
              </div>
              <Button variant="destructive" size="sm">Delete</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}