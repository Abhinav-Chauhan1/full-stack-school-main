'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { exportStudentsWithMarks } from './actions'
import { Class, Section, Session } from '@prisma/client'
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface ExportFormProps {
  classes: (Class & { sections: Section[] })[];
  sessions: Session[];
}

export default function ExportForm({ classes = [], sessions = [] }: ExportFormProps) {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [loading, setLoading] = useState(false)

  const sections = selectedClass 
    ? classes.find(c => c.id === parseInt(selectedClass))?.sections || []
    : []

  const handleExport = async () => {
    if (!selectedClass || !selectedSection || !selectedSession) {
      alert('Please select class, section and session')
      return
    }

    setLoading(true)
    try {
      const result = await exportStudentsWithMarks(
        parseInt(selectedClass),
        parseInt(selectedSection),
        parseInt(selectedSession)
      )

      if (!result.success || !result.data) throw new Error(result.error || 'No data available')

      const worksheet = XLSX.utils.json_to_sheet(result.data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')
      XLSX.writeFile(workbook, `students_export_${Date.now()}.xlsx`)
    } catch (error) {
      console.error('Export error:', error)
      alert(error instanceof Error ? error.message : 'Error exporting students')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <Select
          value={selectedSession}
          onValueChange={setSelectedSession}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Session" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(sessions) && sessions.length > 0 ? (
              sessions.map((session) => (
                <SelectItem key={session.id} value={session.id.toString()}>
                  {session.sessioncode}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="" disabled>
                No sessions available
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <Select
          value={selectedClass}
          onValueChange={setSelectedClass}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id.toString()}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSection}
          onValueChange={setSelectedSection}
          disabled={!selectedClass}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id.toString()}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleExport}
          disabled={loading || !selectedClass || !selectedSection || !selectedSession}
        >
          {loading ? 'Exporting...' : 'Export Students'}
        </Button>
      </div>
    </div>
  )
}
