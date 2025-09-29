import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-red-600">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-center">
            There was a problem signing you in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            The authentication process could not be completed. This might be due to:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Invalid or expired authentication code</li>
            <li>Provider configuration issues</li>
            <li>Network connectivity problems</li>
          </ul>
          <div className="flex flex-col space-y-2">
            <Button asChild>
              <Link href="/login">
                Try Again
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/signup">
                Create New Account
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}