"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

export default function CourseDetails({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()

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

  useEffect(() => {
    fetchCourseData()
  }, [params.id])

  // Auto-select first lesson when data loads
  useEffect(() => {
    if (lessons.length > 0 && !selectedLesson) {
      setSelectedLesson(lessons[0])
    }
  }, [lessons])

  const fetchCourseData = async () => {
    try {
      setLoading(true)

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", params.id)
        .single()

      if (courseError) throw courseError
      setCourse(courseData)

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", params.id)
        .order("order_index")

      if (lessonsError) throw lessonsError
      setLessons(lessonsData || [])

      // Fetch quiz questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("course_id", params.id)
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
        course_id: params.id,
        status: passed ? "completed" : "failed",
        score: score,
        completed_at: passed ? new Date().toISOString() : null,
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
    <div className="space-y-6 p-6">
      <Toaster />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/training")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Training
        </Button>
      </div>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
              <CardDescription className="text-base">{course.description}</CardDescription>
            </div>
            <div className="flex flex-col gap-2">
              <Badge className="bg-green-500 text-white">{course.difficulty}</Badge>
              <Badge variant="outline">{course.category}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {course.duration_minutes} minutes
            </div>
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              {course.passing_score}% to pass
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {lessons.length} lessons
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {completedLessons.size} / {lessons.length} completed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Viewer (Full Width) */}
      {selectedLesson && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedLesson.lesson_type === "video" ? (
                    <PlayCircle className="h-5 w-5 text-blue-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-orange-500" />
                  )}
                  {selectedLesson.title}
                </CardTitle>
                <CardDescription>{selectedLesson.description}</CardDescription>
              </div>
              <Button
                onClick={() => {
                  handleLessonComplete(selectedLesson.id)
                  toast.success("Lesson marked as complete")
                }}
                disabled={completedLessons.has(selectedLesson.id)}
                variant={completedLessons.has(selectedLesson.id) ? "outline" : "default"}
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
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
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
                  className="w-full h-full"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lessons List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Course Content</CardTitle>
            <CardDescription>Complete all lessons to unlock the quiz</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lessons.map((lesson) => {
                const isCompleted = completedLessons.has(lesson.id)
                const isSelected = selectedLesson?.id === lesson.id

                return (
                  <div
                    key={lesson.id}
                    className={`flex items-start justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {lesson.lesson_type === "video" ? (
                          <PlayCircle className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-orange-500" />
                        )}
                        <p className="font-medium">{lesson.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{lesson.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {lesson.duration_minutes} min • {lesson.lesson_type.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quiz Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {allLessonsCompleted ? <Award className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              Take the Quiz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!allLessonsCompleted && (
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                  <p className="text-sm text-orange-900 dark:text-orange-100">
                    Complete all {lessons.length} lessons to unlock the quiz
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {allLessonsCompleted
                  ? "Ready to test your knowledge? Take the quiz to earn your certificate."
                  : "Progress through all lessons to unlock the final quiz."}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Questions:</span>
                  <span className="font-medium">{quizQuestions.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Passing Score:</span>
                  <span className="font-medium">{course.passing_score}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Lessons Completed:</span>
                  <span className="font-medium">{completedLessons.size} / {lessons.length}</span>
                </div>
              </div>

              <Separator />

              <Button
                className="w-full"
                onClick={handleStartQuiz}
                disabled={!allLessonsCompleted || quizQuestions.length === 0}
              >
                {allLessonsCompleted ? (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    Start Quiz
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Quiz Locked
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
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
