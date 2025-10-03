"use client"

import { useEffect, useState } from "react"
import { useProgressRouter } from "@/hooks/useProgressRouter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import {
  ArrowLeft,
  PlayCircle,
  FileText,
  CheckCircle2,
  Award,
  Clock,
  Download,
  Loader2,
  ChevronRight,
  Lock
} from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  duration_minutes: number
  passing_score: number
  difficulty: string
  category: string
}

interface Lesson {
  id: string
  title: string
  description: string
  lesson_type: string
  content_url: string
  duration_minutes: number
  order_index: number
}

interface QuizQuestion {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  order_index: number
}

interface QuizAnswer {
  question_id: string
  selected_answer: string
  is_correct: boolean
}

export default function CourseDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useProgressRouter()
  const supabase = createClient()

  const [courseId, setCourseId] = useState<string | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)

  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Lesson viewer state
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())

  // Unwrap params
  useEffect(() => {
    params.then(p => setCourseId(p.id))
  }, [params])

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
    }
  }, [courseId])

  // Auto-select first lesson when data loads
  useEffect(() => {
    if (lessons.length > 0 && !selectedLesson) {
      setSelectedLesson(lessons[0])
    }
  }, [lessons])

  const fetchCourseData = async () => {
    try {
      setLoading(true)

      if (!courseId) return

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single()

      if (courseError) throw courseError
      setCourse(courseData)

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index")

      if (lessonsError) throw lessonsError
      setLessons(lessonsData || [])

      // Fetch quiz questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index")

      if (questionsError) throw questionsError
      setQuizQuestions(questionsData || [])

    } catch (error) {
      console.error("Error fetching course data:", error)
      toast.error("Failed to load course data")
    } finally {
      setLoading(false)
    }
  }

  const handleLessonComplete = (lessonId: string) => {
    setCompletedLessons(prev => new Set([...prev, lessonId]))
  }

  const allLessonsCompleted = lessons.length > 0 && lessons.every(lesson => completedLessons.has(lesson.id))

  const handleStartQuiz = () => {
    if (!allLessonsCompleted) {
      toast.error("Please complete all lessons before taking the quiz")
      return
    }
    setShowQuiz(true)
    setCurrentQuestionIndex(0)
    setQuizAnswers([])
    setSelectedAnswer("")
    setShowResults(false)
  }

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer)
  }

  const handleNextQuestion = () => {
    if (!selectedAnswer) {
      toast.error("Please select an answer")
      return
    }

    const currentQuestion = quizQuestions[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.correct_answer

    const newAnswer: QuizAnswer = {
      question_id: currentQuestion.id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect
    }

    const updatedAnswers = [...quizAnswers, newAnswer]
    setQuizAnswers(updatedAnswers)

    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer("")
    } else {
      submitQuiz(updatedAnswers)
    }
  }

  const submitQuiz = async (answers: QuizAnswer[]) => {
    setIsSubmitting(true)

    try {
      const correctAnswers = answers.filter(a => a.is_correct).length
      const score = Math.round((correctAnswers / quizQuestions.length) * 100)
      const passed = score >= (course?.passing_score || 70)

      console.log("Quiz results:", { score, passed, correctAnswers, total: quizQuestions.length })

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      console.log("User data:", user)

      if (userError || !user) {
        console.error("Auth error:", userError)
        toast.error("You must be signed in to save your progress. Your score: " + score + "%")
        setShowResults(true)
        return
      }

      const recordData = {
        user_id: user.id,
        course_id: courseId,
        course_name: course?.title || 'Unknown Course',
        status: passed ? "completed" : "failed",
        score: score,
        completion_date: passed ? new Date().toISOString().split('T')[0] : null,
        ...(passed && { completed_at: new Date().toISOString() }),
        quiz_answers: answers
      }

      console.log("Attempting to save record:", recordData)

      // Create or update training record
      const { data: savedData, error: recordError } = await supabase
        .from("training_records")
        .upsert(recordData, {
          onConflict: 'user_id,course_id'
        })
        .select()

      console.log("Save result:", { savedData, recordError })

      if (recordError) {
        console.error("Record error details:", recordError)
        toast.error("Failed to save quiz results: " + recordError.message)
      } else {
        console.log("Record saved successfully!")
        if (passed) {
          toast.success(`Congratulations! You passed with ${score}% - Record saved!`)
        } else {
          toast.error(`You scored ${score}%. You need ${course?.passing_score}% to pass.`)
        }
      }

      setShowResults(true)

    } catch (error) {
      console.error("Error submitting quiz:", error)
      toast.error("Failed to submit quiz: " + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadCertificate = () => {
    if (!course) return

    const score = quizAnswers.filter(a => a.is_correct).length / quizQuestions.length * 100

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
              <p>Completion Date: ${new Date().toLocaleDateString()}</p>
              <p>Score: ${Math.round(score)}%</p>
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

  const getEmbedUrl = (url: string, type: string) => {
    if (type === 'video') {
      // Convert YouTube watch URL to embed URL
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1]?.split('&')[0]
        return `https://www.youtube.com/embed/${videoId}`
      }
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0]
        return `https://www.youtube.com/embed/${videoId}`
      }
      return url
    }
    // For PDFs, use Google Docs viewer for better embedding
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Course not found</p>
        <Button onClick={() => router.push("/training")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Training
        </Button>
      </div>
    )
  }

  const currentQuestion = quizQuestions[currentQuestionIndex]
  const quizProgress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100
  const correctAnswers = quizAnswers.filter(a => a.is_correct).length
  const finalScore = quizAnswers.length > 0 ? Math.round((correctAnswers / quizQuestions.length) * 100) : 0
  const passed = finalScore >= course.passing_score

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      {/* Fixed Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push("/training")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Training
            </Button>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{completedLessons.size}/{lessons.length} Complete</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{course.duration_minutes} min</span>
                </div>
              </div>
              <Button
                onClick={handleStartQuiz}
                disabled={!allLessonsCompleted || quizQuestions.length === 0}
                size="sm"
              >
                {allLessonsCompleted ? (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    Take Quiz
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Quiz Locked
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Course Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{course.title}</h1>
              <p className="text-lg text-muted-foreground">{course.description}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-sm">{course.category.replace("-", " ")}</Badge>
              <Badge className="bg-blue-500 text-white text-sm">{course.difficulty}</Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Course Progress</span>
              <span className="font-medium">{Math.round((completedLessons.size / lessons.length) * 100)}%</span>
            </div>
            <Progress value={(completedLessons.size / lessons.length) * 100} className="h-2" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Sidebar - Lessons List */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Content</CardTitle>
                <CardDescription>{lessons.length} lessons</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {lessons.map((lesson, index) => {
                    const isCompleted = completedLessons.has(lesson.id)
                    const isSelected = selectedLesson?.id === lesson.id

                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-start gap-3 p-4 border-b cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/5 border-l-4 border-l-primary"
                            : "hover:bg-muted border-l-4 border-l-transparent"
                        }`}
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 mt-0.5 ${
                          isCompleted
                            ? 'bg-green-500 border-green-500 text-white'
                            : isSelected
                            ? 'border-primary text-primary'
                            : 'border-muted-foreground/30 text-muted-foreground'
                        }`}>
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {lesson.lesson_type === "video" ? (
                              <PlayCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                            )}
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : ''}`}>
                              {lesson.title}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lesson.duration_minutes} min
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Lesson Viewer */}
          <div className="space-y-6">
            {selectedLesson ? (
              <>
                {/* Lesson Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedLesson.lesson_type === "video" ? (
                        <PlayCircle className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-orange-500" />
                      )}
                      <h2 className="text-2xl font-bold">{selectedLesson.title}</h2>
                    </div>
                    <p className="text-muted-foreground">{selectedLesson.description}</p>
                  </div>
                  <Button
                    onClick={() => {
                      handleLessonComplete(selectedLesson.id)
                      toast.success("Lesson marked as complete!")

                      // Auto-advance to next lesson
                      const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id)
                      if (currentIndex < lessons.length - 1) {
                        setTimeout(() => {
                          setSelectedLesson(lessons[currentIndex + 1])
                        }, 500)
                      }
                    }}
                    disabled={completedLessons.has(selectedLesson.id)}
                    variant={completedLessons.has(selectedLesson.id) ? "outline" : "default"}
                    size="lg"
                  >
                    {completedLessons.has(selectedLesson.id) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Completed
                      </>
                    ) : (
                      "Mark as Complete"
                    )}
                  </Button>
                </div>

                {/* Video/Content Viewer */}
                <Card className="overflow-hidden">
                  <div className="aspect-video bg-black">
                    {selectedLesson.lesson_type === "video" ? (
                      <iframe
                        src={getEmbedUrl(selectedLesson.content_url, 'video')}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : (
                      <iframe
                        src={getEmbedUrl(selectedLesson.content_url, 'pdf')}
                        className="w-full h-full bg-white"
                      />
                    )}
                  </div>
                </Card>

                {/* Lesson Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id)
                      if (currentIndex > 0) {
                        setSelectedLesson(lessons[currentIndex - 1])
                      }
                    }}
                    disabled={lessons.findIndex(l => l.id === selectedLesson.id) === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous Lesson
                  </Button>
                  <Button
                    onClick={() => {
                      const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id)
                      if (currentIndex < lessons.length - 1) {
                        setSelectedLesson(lessons[currentIndex + 1])
                      } else if (allLessonsCompleted) {
                        handleStartQuiz()
                      }
                    }}
                    disabled={lessons.findIndex(l => l.id === selectedLesson.id) === lessons.length - 1 && !allLessonsCompleted}
                  >
                    {lessons.findIndex(l => l.id === selectedLesson.id) === lessons.length - 1 ? (
                      allLessonsCompleted ? (
                        <>
                          <Award className="h-4 w-4 mr-2" />
                          Take Quiz
                        </>
                      ) : (
                        "Complete All Lessons"
                      )
                    ) : (
                      <>
                        Next Lesson
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a lesson from the sidebar to begin</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
        <DialogContent className="max-w-2xl">
          {!showResults ? (
            <>
              <DialogHeader>
                <DialogTitle>Quiz - Question {currentQuestionIndex + 1} of {quizQuestions.length}</DialogTitle>
                <DialogDescription>
                  Select the best answer
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Progress value={quizProgress} />

                {currentQuestion && (
                  <div className="space-y-4">
                    <p className="text-lg font-medium">{currentQuestion.question_text}</p>

                    <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect}>
                      <div className="space-y-3">
                        {["A", "B", "C", "D"].map((option) => (
                          <div
                            key={option}
                            className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedAnswer === option ? "bg-primary/10 border-primary" : "hover:bg-muted"
                            }`}
                            onClick={() => handleAnswerSelect(option)}
                          >
                            <RadioGroupItem value={option} id={option} />
                            <Label htmlFor={option} className="flex-1 cursor-pointer">
                              {currentQuestion[`option_${option.toLowerCase()}` as keyof QuizQuestion] as string}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={handleNextQuestion} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : currentQuestionIndex < quizQuestions.length - 1 ? (
                    "Next Question"
                  ) : (
                    "Submit Quiz"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Quiz Results</DialogTitle>
                <DialogDescription>
                  {passed ? "Congratulations! You passed the quiz." : "You did not pass this time. Try again!"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className={`text-6xl font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
                    {finalScore}%
                  </div>
                  <p className="text-muted-foreground mt-2">
                    {correctAnswers} out of {quizQuestions.length} correct
                  </p>
                </div>

                {passed ? (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                    <Award className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-900 dark:text-green-100">
                      You've earned a certificate!
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center">
                    <p className="text-orange-900 dark:text-orange-100">
                      You need {course.passing_score}% to pass. Keep studying and try again!
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQuiz(false)
                    setShowResults(false)
                  }}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                {passed && (
                  <Button onClick={handleDownloadCertificate} className="w-full sm:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Download Certificate
                  </Button>
                )}
                {!passed && (
                  <Button onClick={handleStartQuiz} className="w-full sm:w-auto">
                    Retake Quiz
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
