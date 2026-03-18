'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Leaf, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { login, resetPassword } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showReset, setShowReset] = useState(false)

  async function handleLogin(formData: FormData) {
    setIsLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  async function handleReset(formData: FormData) {
    setIsResetting(true)
    setError(null)
    setMessage(null)
    const result = await resetPassword(formData)
    if (result?.error) {
      setError(result.error)
    }
    if (result?.success) {
      setMessage(result.success)
    }
    setIsResetting(false)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center space-y-4 pb-2">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            KasperMH <span className="text-green-600">Admin</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {showReset ? 'Nulstil din adgangskode' : 'Log ind for at fortsætte'}
        </p>
      </CardHeader>
      <CardContent>
        {!showReset ? (
          <form action={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="din@email.dk"
                required
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Adgangskode</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Log ind
            </Button>

            <button
              type="button"
              onClick={() => {
                setShowReset(true)
                setError(null)
                setMessage(null)
              }}
              className="block w-full text-center text-sm text-muted-foreground hover:text-green-600 transition-colors"
            >
              Glemt adgangskode?
            </button>
          </form>
        ) : (
          <form action={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                placeholder="din@email.dk"
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            {message && (
              <p className="text-sm text-green-600 text-center">{message}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
              disabled={isResetting}
            >
              {isResetting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Send nulstillingslink
            </Button>

            <button
              type="button"
              onClick={() => {
                setShowReset(false)
                setError(null)
                setMessage(null)
              }}
              className="block w-full text-center text-sm text-muted-foreground hover:text-green-600 transition-colors"
            >
              Tilbage til login
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
