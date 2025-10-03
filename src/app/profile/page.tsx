"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import {
  Award,
  Download,
  Calendar,
  TrendingUp,
  Loader2,
  User,
  Mail,
  Phone
} from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  duration_minutes: number
  category: string
}

interface TrainingRecord {
  id: string
  course_id: string
  status: string
  score: number
  completed_at: string
  created_at: string
}

interface CertificateData {
  record: TrainingRecord
  course: Course
}

export default function Profile() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [certificates, setCertificates] = useState<CertificateData[]>([])

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setLoading(true)

      // Get user email
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }

      // Fetch completed training records
      const { data: records, error: recordsError } = await supabase
        .from("training_records")
        .select("*")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })

      if (recordsError) throw recordsError

      if (records && records.length > 0) {
        // Fetch course details for each record
        const courseIds = records.map(r => r.course_id)
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("*")
          .in("id", courseIds)

        if (coursesError) throw coursesError

        // Combine records with course data
        const certificatesData: CertificateData[] = records.map(record => ({
          record,
          course: courses?.find(c => c.id === record.course_id)!
        })).filter(cert => cert.course) // Filter out any missing courses

        setCertificates(certificatesData)
      }

    } catch (error) {
      console.error("Error fetching profile data:", error)
      toast.error("Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCertificate = (cert: CertificateData) => {
    const { course, record } = cert

    // Generate certificate HTML
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate - ${course.title}</title>
          <style>
            body {
              font-family: 'Georgia', serif;
              margin: 0;
              padding: 40px;
              text-align: center;
            }
            .certificate {
              border: 20px solid #2563eb;
              padding: 60px;
              max-width: 800px;
              margin: 0 auto;
              background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
            }
            .title {
              font-size: 48px;
              color: #2563eb;
              margin-bottom: 20px;
              font-weight: bold;
            }
            .subtitle {
              font-size: 24px;
              color: #666;
              margin-bottom: 40px;
            }
            .name {
              font-size: 36px;
              color: #333;
              margin: 30px 0;
              font-style: italic;
            }
            .course {
              font-size: 28px;
              color: #2563eb;
              margin: 20px 0;
              font-weight: bold;
            }
            .details {
              font-size: 16px;
              color: #666;
              margin: 30px 0;
            }
            .signature {
              margin-top: 60px;
              font-size: 18px;
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="title">CERTIFICATE OF COMPLETION</div>
            <div class="subtitle">This is to certify that</div>
            <div class="name">Professional Translator</div>
            <div class="subtitle">has successfully completed</div>
            <div class="course">${course.title}</div>
            <div class="details">
              <p>Completion Date: ${new Date(record.completed_at).toLocaleDateString()}</p>
              <p>Score: ${record.score}%</p>
              <p>Duration: ${course.duration_minutes} minutes</p>
            </div>
            <div class="signature">
              <p>___________________________</p>
              <p>Translator SaaS Platform</p>
            </div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error("Please allow popups to download certificate")
      return
    }

    printWindow.document.write(certificateHTML)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.print()
      toast.success("Certificate download initiated")
    }, 500)
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
      <Toaster />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your professional profile and certifications
        </p>
      </div>

      {/* Profile Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <p className="text-muted-foreground">Professional Translator</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-muted-foreground">{userEmail || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium">Phone</label>
                <p className="text-muted-foreground">Not set</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Training Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Certificates Earned:</span>
                <span className="text-2xl font-bold">{certificates.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Score:</span>
                <span className="text-2xl font-bold">
                  {certificates.length > 0
                    ? Math.round(certificates.reduce((sum, cert) => sum + cert.record.score, 0) / certificates.length)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Latest Certification:</span>
                <span className="text-sm font-medium">
                  {certificates.length > 0
                    ? new Date(certificates[0].record.completed_at).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificates Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                My Certificates
              </CardTitle>
              <CardDescription>
                Download and share your earned certificates
              </CardDescription>
            </div>
            {certificates.length > 0 && (
              <Badge variant="secondary">{certificates.length} certificates</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {certificates.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No certificates yet</p>
              <p className="text-sm text-muted-foreground">
                Complete training courses to earn certificates
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.map((cert) => (
                <Card key={cert.record.id} className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight mb-2">
                          {cert.course.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {cert.course.category.replace("-", " ")}
                          </Badge>
                          <Badge className="bg-green-500 text-white text-xs">
                            {cert.record.score}% Score
                          </Badge>
                        </div>
                      </div>
                      <Award className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Completed: {new Date(cert.record.completed_at).toLocaleDateString()}
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleDownloadCertificate(cert)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Certificate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
