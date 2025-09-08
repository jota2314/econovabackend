"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function LeadsDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads Demo</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Leads demo component placeholder
        </p>
      </CardContent>
    </Card>
  )
}