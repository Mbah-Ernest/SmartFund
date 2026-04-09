'use client'

import Link from 'next/link'
import { Bot, Lightbulb, TrendingDown, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const insights = [
  {
    id: '1',
    icon: TrendingDown,
    message: 'Your food spending is 15% higher than last month. Consider meal prepping to save.',
    type: 'warning',
  },
  {
    id: '2',
    icon: Lightbulb,
    message: 'You have saved consistently for 3 months! Keep it up to reach your goal by June.',
    type: 'success',
  },
  {
    id: '3',
    icon: AlertTriangle,
    message: 'Transport budget is 14% over limit. You might want to adjust next month.',
    type: 'alert',
  },
]

export function AIInsights() {
  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/finance/ai-chat">Chat</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight) => (
            <div 
              key={insight.id} 
              className="flex gap-3 p-3 rounded-lg bg-secondary/30"
            >
              <div className="flex-shrink-0 mt-0.5">
                <insight.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.message}
              </p>
            </div>
          ))}
        </div>
        
        <Button variant="outline" className="w-full mt-4" asChild>
          <Link href="/finance/ai-chat">
            Ask AI a Question
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
