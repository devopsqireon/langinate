import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Training() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training & Certification</h1>
          <p className="text-muted-foreground">
            Track your professional development and certifications.
          </p>
        </div>
        <Button>Add Training Record</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completed Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-sm text-muted-foreground">
              Training programs finished
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Certifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-sm text-muted-foreground">
              Valid professional certifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">0</div>
            <p className="text-sm text-muted-foreground">
              Certifications need renewal
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Available Training</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">ISO 17100 Translation Quality</h3>
                <p className="text-sm text-muted-foreground">
                  Learn international standards for translation quality assurance.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Enroll Now
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Medical Translation Basics</h3>
                <p className="text-sm text-muted-foreground">
                  Specialized training for medical document translation.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Enroll Now
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Legal Interpretation Ethics</h3>
                <p className="text-sm text-muted-foreground">
                  Professional ethics and standards for legal interpreters.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Enroll Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">No training records yet.</p>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Track your professional development by adding completed courses and certifications.
                </p>
                <Button variant="outline">Add Training Record</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}