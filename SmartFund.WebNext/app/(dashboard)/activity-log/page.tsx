'use client'

import { useState, useEffect } from 'react'
import {
  Check,
  RotateCcw,
  Minus,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDateTime } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import api from '@/lib/apiClient'

interface Activity {
  id: number
  action: string
  description: string
  createdAtUtc: string
  reversesAuditEntryId: number | null
  reversedByAuditEntryId: number | null
}

type ActivityStatus = 'active' | 'reversal' | 'reversed'

function getActivityStatus(a: Activity): ActivityStatus {
  if (a.reversesAuditEntryId !== null) return 'reversal'
  if (a.reversedByAuditEntryId !== null) return 'reversed'
  return 'active'
}

function getStatusConfig(status: ActivityStatus) {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'bg-success/20 text-success border-success/30', icon: Check }
    case 'reversal':
      return { label: 'Reversal', color: 'bg-warning/20 text-warning border-warning/30', icon: RotateCcw }
    case 'reversed':
      return { label: 'Reversed', color: 'bg-muted text-muted-foreground border-muted', icon: Minus }
  }
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [pin, setPin] = useState('')
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadActivities = () => {
    setLoading(true)
    api.get('/api/audit/personal')
      .then(r => setActivities(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadActivities() }, [])

  const handleReverse = async () => {
    if (pin.length !== 4 || !selectedActivity) return
    setSubmitting(true)
    try {
      await api.post(`/api/audit/${selectedActivity.id}/reverse`, { pin })
      setReverseDialogOpen(false)
      setSelectedActivity(null)
      setPin('')
      loadActivities()
    } catch {
      alert('Reversal failed. Please check your PIN and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const openReverseDialog = (activity: Activity) => {
    setSelectedActivity(activity)
    setReverseDialogOpen(true)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">
          Track all changes and actions in your account
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

            {/* Activities */}
            <div className="space-y-6">
              {activities.map((activity) => {
                const status = getActivityStatus(activity)
                const statusConfig = getStatusConfig(status)
                const StatusIcon = statusConfig.icon
                const isHovered = hoveredId === activity.id
                const canReverse = status === 'active'

                return (
                  <div 
                    key={activity.id}
                    className="relative flex gap-4 group"
                    onMouseEnter={() => setHoveredId(activity.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background",
                      status === 'active' && "bg-primary text-primary-foreground",
                      status === 'reversal' && "bg-warning text-warning-foreground",
                      status === 'reversed' && "bg-muted text-muted-foreground"
                    )}>
                      <FileText className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className={cn(
                      "flex-1 rounded-lg border p-4 transition-colors",
                      status === 'reversed' && "opacity-60",
                      isHovered && canReverse && "border-primary/50"
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("font-medium", status === 'reversed' && "line-through")}>
                              {activity.action}
                            </span>
                            <Badge variant="outline" className={cn("gap-1 text-xs", statusConfig.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className={cn("text-sm text-muted-foreground", status === 'reversed' && "line-through")}>
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{formatDateTime(activity.createdAtUtc)}</span>
                            <span className="font-mono">#{activity.id}</span>
                          </div>
                        </div>

                        {/* Reverse Button */}
                        {canReverse && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("opacity-0 transition-opacity", isHovered && "opacity-100")}
                            onClick={() => openReverseDialog(activity)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reverse
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* PIN Confirmation Dialog */}
      <Dialog open={reverseDialogOpen} onOpenChange={(open) => {
        setReverseDialogOpen(open)
        if (!open) {
          setPin('')
          setSelectedActivity(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reversal</DialogTitle>
            <DialogDescription>
              Enter your 4-digit PIN to reverse this action. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedActivity && (
            <div className="p-4 rounded-lg bg-secondary/50 my-4">
              <p className="text-sm font-medium">{selectedActivity.action}</p>
              <p className="text-sm text-muted-foreground">{selectedActivity.description}</p>
            </div>
          )}

          <Field className="flex flex-col items-center">
            <FieldLabel>Enter PIN</FieldLabel>
            <InputOTP 
              maxLength={4} 
              value={pin} 
              onChange={setPin}
              className="mt-2"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReverse}
              disabled={pin.length !== 4 || submitting}
              variant="destructive"
            >
              {submitting ? 'Reversing...' : 'Confirm Reversal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
