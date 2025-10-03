"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
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
  Phone,
  MapPin,
  Briefcase,
  Edit,
  Save,
  X,
  Upload,
  Camera,
  Globe,
  Languages as LanguagesIcon,
  DollarSign
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

interface ProfileData {
  full_name: string
  email: string
  phone: string
  location: string
  bio: string
  company: string
  website: string
  avatar_url: string
  role: string
  specializations: string[]
  languages: string[]
  default_rate_per_word: number
  default_rate_per_hour: number
}

export default function Profile() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ProfileData>({
    full_name: "Professional Translator",
    email: "",
    phone: "",
    location: "",
    bio: "",
    company: "",
    website: "",
    avatar_url: "",
    role: "translator",
    specializations: [],
    languages: [],
    default_rate_per_word: 0.15,
    default_rate_per_hour: 75.00
  })

  const [editedProfile, setEditedProfile] = useState<ProfileData>(profile)
  const [certificates, setCertificates] = useState<CertificateData[]>([])

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setLoading(true)

      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("User not found")
        return
      }

      // Fetch user profile from database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        throw userError
      }

      // Build profile data
      const profileData: ProfileData = {
        full_name: userData?.name || "Professional Translator",
        email: user.email || "",
        phone: userData?.phone || "",
        location: "", // Not in users table, can add if needed
        bio: userData?.bio || "",
        company: userData?.company_name || "",
        website: "", // Not in users table, can add if needed
        avatar_url: "", // Not in users table, can add if needed
        role: userData?.role || "translator",
        specializations: userData?.specializations || [],
        languages: userData?.languages || [],
        default_rate_per_word: userData?.default_rate_per_word || 0.15,
        default_rate_per_hour: userData?.default_rate_per_hour || 75.00
      }

      setProfile(profileData)
      setEditedProfile(profileData)

      // Fetch completed training records
      const { data: records, error: recordsError } = await supabase
        .from("training_records")
        .select("*")
        .eq("status", "completed")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })

      if (recordsError) throw recordsError

      if (records && records.length > 0) {
        const courseIds = records.map(r => r.course_id).filter(Boolean)
        if (courseIds.length > 0) {
          const { data: courses, error: coursesError } = await supabase
            .from("courses")
            .select("*")
            .in("id", courseIds)

          if (coursesError) throw coursesError

          const certificatesData: CertificateData[] = records
            .map(record => ({
              record,
              course: courses?.find(c => c.id === record.course_id)!
            }))
            .filter(cert => cert.course)

          setCertificates(certificatesData)
        }
      }

    } catch (error) {
      console.error("Error fetching profile data:", error)
      toast.error("Failed to load profile data")
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB")
      return
    }

    try {
      setIsUploadingAvatar(true)

      // For now, just create a local URL for the image
      const imageUrl = URL.createObjectURL(file)
      setEditedProfile(prev => ({ ...prev, avatar_url: imageUrl }))

      toast.success("Avatar uploaded successfully!")
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast.error("Failed to upload avatar")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("User not found")
        return
      }

      // Update user profile in database
      const { error: updateError } = await supabase
        .from("users")
        .upsert({
          id: user.id,
          name: editedProfile.full_name,
          phone: editedProfile.phone,
          bio: editedProfile.bio,
          company_name: editedProfile.company,
          role: editedProfile.role,
          specializations: editedProfile.specializations,
          languages: editedProfile.languages,
          default_rate_per_word: editedProfile.default_rate_per_word,
          default_rate_per_hour: editedProfile.default_rate_per_hour
        })

      if (updateError) {
        console.error("Update error:", updateError)
        throw updateError
      }

      // Update profile state
      setProfile(editedProfile)

      toast.success("Profile updated successfully!")
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error("Failed to save profile: " + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedProfile(profile)
    setIsEditing(false)
  }

  const handleDownloadCertificate = (cert: CertificateData) => {
    const { course, record } = cert

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
            <div class="name">${profile.full_name || 'Professional Translator'}</div>
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const displayProfile = isEditing ? editedProfile : profile

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Toaster />

      {/* Header with Cover */}
      <div className="relative h-48 bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="container mx-auto px-4 h-full flex items-center">
          <div className="text-white">
            <h1 className="text-4xl font-bold mb-2">Profile</h1>
            <p className="text-blue-100">Manage your account and professional information</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="space-y-6">
          {/* Profile Header Card */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Avatar Section */}
                <div className="relative group flex-shrink-0">
                  <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={displayProfile.avatar_url} />
                    <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {getInitials(displayProfile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                {/* Profile Info */}
                <div className="flex-1 space-y-4 w-full">
                  {/* Edit Button - Mobile Top */}
                  <div className="flex justify-end md:hidden">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                  </div>

                  {/* Name and Company */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      {isEditing ? (
                        <Input
                          value={editedProfile.full_name}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, full_name: e.target.value }))}
                          className="text-2xl font-bold h-auto py-2"
                          placeholder="Your name"
                        />
                      ) : (
                        <h1 className="text-3xl font-bold break-words">{displayProfile.full_name}</h1>
                      )}
                      {isEditing ? (
                        <Input
                          value={editedProfile.company}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, company: e.target.value }))}
                          placeholder="Company name"
                          className="text-muted-foreground"
                        />
                      ) : (
                        displayProfile.company && (
                          <p className="text-lg text-muted-foreground break-words">{displayProfile.company}</p>
                        )
                      )}
                    </div>

                    {/* Edit Button - Desktop */}
                    <div className="hidden md:flex gap-2 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <Textarea
                      value={editedProfile.bio}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Write a short bio about yourself..."
                      rows={3}
                      className="resize-none"
                    />
                  ) : (
                    displayProfile.bio && (
                      <p className="text-muted-foreground">{displayProfile.bio}</p>
                    )
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{displayProfile.email}</span>
                    </div>
                    {(isEditing || displayProfile.phone) && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {isEditing ? (
                          <Input
                            value={editedProfile.phone}
                            onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Phone number"
                            className="h-7 w-40"
                          />
                        ) : (
                          <span>{displayProfile.phone}</span>
                        )}
                      </div>
                    )}
                    {(isEditing || displayProfile.location) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {isEditing ? (
                          <Input
                            value={editedProfile.location}
                            onChange={(e) => setEditedProfile(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="Location"
                            className="h-7 w-40"
                          />
                        ) : (
                          <span>{displayProfile.location}</span>
                        )}
                      </div>
                    )}
                    {(isEditing || displayProfile.website) && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {isEditing ? (
                          <Input
                            value={editedProfile.website}
                            onChange={(e) => setEditedProfile(prev => ({ ...prev, website: e.target.value }))}
                            placeholder="Website URL"
                            className="h-7 w-48"
                          />
                        ) : (
                          <a href={displayProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {displayProfile.website}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
              <CardDescription>
                Your professional details and rates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role */}
              <div className="space-y-2">
                <Label>Role</Label>
                {isEditing ? (
                  <select
                    value={editedProfile.role}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, role: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="translator">Translator</option>
                    <option value="interpreter">Interpreter</option>
                    <option value="both">Both</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {displayProfile.role}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Languages */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LanguagesIcon className="h-4 w-4" />
                  Languages
                </Label>
                {isEditing ? (
                  <Input
                    value={editedProfile.languages.join(", ")}
                    onChange={(e) => setEditedProfile(prev => ({
                      ...prev,
                      languages: e.target.value.split(",").map(l => l.trim()).filter(Boolean)
                    }))}
                    placeholder="e.g., English, Spanish, French"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {displayProfile.languages.length > 0 ? (
                      displayProfile.languages.map((lang, i) => (
                        <Badge key={i} variant="outline">{lang}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No languages specified</span>
                    )}
                  </div>
                )}
              </div>

              {/* Specializations */}
              <div className="space-y-2">
                <Label>Specializations</Label>
                {isEditing ? (
                  <Input
                    value={editedProfile.specializations.join(", ")}
                    onChange={(e) => setEditedProfile(prev => ({
                      ...prev,
                      specializations: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                    }))}
                    placeholder="e.g., Legal, Medical, Technical"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {displayProfile.specializations.length > 0 ? (
                      displayProfile.specializations.map((spec, i) => (
                        <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {spec}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No specializations specified</span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Rates */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Rate per Word (USD)
                  </Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedProfile.default_rate_per_word}
                      onChange={(e) => setEditedProfile(prev => ({
                        ...prev,
                        default_rate_per_word: parseFloat(e.target.value) || 0
                      }))}
                    />
                  ) : (
                    <div className="text-2xl font-bold">
                      ${displayProfile.default_rate_per_word.toFixed(4)}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Rate per Hour (USD)
                  </Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={editedProfile.default_rate_per_hour}
                      onChange={(e) => setEditedProfile(prev => ({
                        ...prev,
                        default_rate_per_hour: parseFloat(e.target.value) || 0
                      }))}
                    />
                  ) : (
                    <div className="text-2xl font-bold">
                      ${displayProfile.default_rate_per_hour.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certificates Earned</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{certificates.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Professional certifications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {certificates.length > 0
                    ? Math.round(certificates.reduce((sum, cert) => sum + cert.record.score, 0) / certificates.length)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all courses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Latest Certification</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {certificates.length > 0
                    ? new Date(certificates[0].record.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Most recent achievement
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Certificates Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Award className="h-6 w-6" />
                    My Certificates
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Download and share your earned certificates
                  </CardDescription>
                </div>
                {certificates.length > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    {certificates.length} {certificates.length === 1 ? 'certificate' : 'certificates'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                    <Award className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No certificates yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete training courses to earn professional certificates
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {certificates.map((cert) => (
                    <Card key={cert.record.id} className="border-2 hover:border-primary/50 hover:shadow-lg transition-all group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base leading-tight mb-2 line-clamp-2">
                              {cert.course.title}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {cert.course.category.replace("-", " ")}
                              </Badge>
                              <Badge className="bg-green-500 text-white text-xs">
                                {cert.record.score}%
                              </Badge>
                            </div>
                          </div>
                          <Award className="h-10 w-10 text-yellow-500 flex-shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(cert.record.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <Button
                          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          variant="outline"
                          onClick={() => handleDownloadCertificate(cert)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
