"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase-client"
import {
  BookOpen,
  Clock,
  Award,
  PlayCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  GraduationCap,
  Download
} from "lucide-react"
import NProgress from "nprogress"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

interface Course {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  duration_minutes: number
  passing_score: number
  thumbnail_url?: string
  created_at: string
}

interface TrainingRecord {
  id: string
  course_id: string
  status: string
  score?: number
  completed_at?: string
}

export default function Training() {
  const router = useRouter()
  const supabase = createClient()

  const [courses, setCourses] = useState<Course[]>([])
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  // Refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })

      if (coursesError) throw coursesError
      if (coursesData) setCourses(coursesData)

      // Fetch user's training records
      const { data: recordsData, error: recordsError } = await supabase
        .from("training_records")
        .select("*")

      if (recordsError) {
        console.error("Error fetching training records:", recordsError)
      } else if (recordsData) {
        setTrainingRecords(recordsData)
      }

    } catch (error) {
      console.error("Error fetching training data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getCourseStatus = (courseId: string) => {
    const record = trainingRecords.find(r => r.course_id === courseId)
    return record || null
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500"
      case "intermediate":
        return "bg-yellow-500"
      case "advanced":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "quality-standards":
        return <Award className="h-5 w-5" />
      case "technology":
        return <TrendingUp className="h-5 w-5" />
      case "business":
        return <GraduationCap className="h-5 w-5" />
      default:
        return <BookOpen className="h-5 w-5" />
    }
  }

  const handleStartCourse = (courseId: string) => {
    NProgress.start()
    router.push(`/training/${courseId}`)
  }

  const handleDownloadCertificate = (course: Course, status: TrainingRecord) => {
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
              <p>Completion Date: ${status.completed_at ? new Date(status.completed_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
              <p>Score: ${status.score}%</p>
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

  const completedCourses = trainingRecords.filter(r => r.status === "completed").length
  const inProgressCourses = trainingRecords.filter(r => r.status === "in_progress").length

  return (
    <div className="space-y-6 p-6">
      <Toaster />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Professional Training</h1>
        <p className="text-muted-foreground">
          Enhance your skills with professional courses and earn certificates
        </p>
      </div>

      {/* Stats Cards */}
      {trainingRecords.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Courses</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCourses}</div>
              <p className="text-xs text-muted-foreground">
                Certificates earned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <PlayCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCourses}</div>
              <p className="text-xs text-muted-foreground">
                Courses started
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
              <p className="text-xs text-muted-foreground">
                Ready to start
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Courses Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Courses</h2>
        {courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No courses available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const status = getCourseStatus(course.id)
              const isCompleted = status?.status === "completed"
              const isInProgress = status?.status === "in_progress"

              return (
                <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  {/* Course Thumbnail */}
                  {course.thumbnail_url && (
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      {isCompleted && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Completed
                        </div>
                      )}
                      {isInProgress && !isCompleted && (
                        <div className="absolute top-3 right-3 bg-blue-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-sm font-medium">
                          <PlayCircle className="h-4 w-4" />
                          In Progress
                        </div>
                      )}
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(course.category)}
                        <Badge variant="outline" className="text-xs">
                          {course.category.replace("-", " ")}
                        </Badge>
                      </div>
                      <Badge className={`${getDifficultyColor(course.difficulty)} text-white text-xs`}>
                        {course.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl leading-tight">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {course.duration_minutes} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        {course.passing_score}% to pass
                      </div>
                    </div>

                    {status?.score !== undefined && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Your Score:</span>
                          <span className={`font-bold ${status.score >= course.passing_score ? "text-green-600" : "text-red-600"}`}>
                            {status.score}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2">
                    {isCompleted ? (
                      <>
                        <Button
                          className="w-full"
                          onClick={() => handleStartCourse(course.id)}
                          variant="outline"
                        >
                          <Award className="h-4 w-4 mr-2" />
                          View Course
                        </Button>
                        <Button
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadCertificate(course, status!)
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Certificate
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleStartCourse(course.id)}
                      >
                        {isInProgress ? (
                          <>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Continue Course
                          </>
                        ) : (
                          <>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Start Course
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
