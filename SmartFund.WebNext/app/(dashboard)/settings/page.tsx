'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field'
import { formatDateTime } from '@/lib/utils'
import api from '@/lib/apiClient'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [launchDate, setLaunchDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [lastReset, setLastReset] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
    api.get('/api/personal-finance/settings')
      .then(r => {
        if (r.data?.launchDate) {
          setLaunchDate(r.data.launchDate.slice(0, 10))
        }
      })
      .catch(() => {})
  }, [])

  const handleSaveLaunchDate = async () => {
    if (!launchDate) return
    setIsSaving(true)
    try {
      await api.put('/api/personal-finance/settings', { launchDate })
    } catch { alert('Failed to save settings.') }
    finally { setIsSaving(false) }
  }

  const handleReset = async () => {
    if (resetConfirm !== 'RESET') return
    setIsResetting(true)
    try {
      await api.post('/api/personal-finance/reset', { confirmation: 'RESET' })
      setLastReset(new Date())
    } catch { alert('Reset failed. Please try again.') }
    finally {
      setResetConfirm('')
      setIsResetting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how SmartFund looks on your device</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  {mounted && resolvedTheme === 'dark' ? (
                    <Moon className="h-5 w-5" />
                  ) : mounted ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <div className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {mounted ? (resolvedTheme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme') : 'Loading...'}
                  </p>
                </div>
              </div>
              <Switch
                checked={mounted && resolvedTheme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                disabled={!mounted}
              />
            </div>
          </CardContent>
        </Card>

        {/* Personal Finance Settings */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Personal Finance Settings</CardTitle>
            <CardDescription>Configure your finance tracking preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel>Finance Tracking Start Date</FieldLabel>
              <FieldDescription>
                Set the date from which your financial data should be tracked and analyzed
              </FieldDescription>
              <div className="flex gap-4 mt-2">
                <Input
                  type="date"
                  value={launchDate}
                  onChange={(e) => setLaunchDate(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={handleSaveLaunchDate} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions that affect your data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Reset Personal Finance Data</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will permanently delete all your transactions, budgets, goals, and connected bank accounts. This action cannot be undone.
                  </p>
                  
                  {lastReset && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Last reset: {formatDateTime(lastReset)}
                    </p>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Reset All Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all your personal finance data including transactions, budgets, goals, and bank connections. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                        <Field>
                          <FieldLabel>
                            Type <span className="font-mono text-destructive">RESET</span> to confirm
                          </FieldLabel>
                          <Input
                            value={resetConfirm}
                            onChange={(e) => setResetConfirm(e.target.value)}
                            placeholder="RESET"
                            className="max-w-xs"
                          />
                        </Field>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setResetConfirm('')}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleReset}
                          disabled={resetConfirm !== 'RESET' || isResetting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isResetting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Resetting...
                            </>
                          ) : (
                            'Reset All Data'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
