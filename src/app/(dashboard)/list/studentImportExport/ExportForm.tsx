'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { exportStudentsWithMarks } from './actions'
import { Class, Section } from '@prisma/client'
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
  classes: (Class & { sections: Section[] })[]
}

export default function ExportForm({ classes }: ExportFormProps) {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [includeMarks, setIncludeMarks] = useState(false)
  const [loading, setLoading] = useState(false)

  const sections = selectedClass 
    ? classes.find(c => c.id === parseInt(selectedClass))?.sections || []
    : []

  const handleExport = async () => {
    if (!selectedClass || !selectedSection) {
      alert('Please select class and section')
      return
    }

    setLoading(true)
    try {
      const result = await exportStudentsWithMarks(
        parseInt(selectedClass),
        parseInt(selectedSection),
        includeMarks
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

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeMarks"
            checked={includeMarks}
            onCheckedChange={(checked) => setIncludeMarks(checked as boolean)}
          />
          <label htmlFor="includeMarks">Include Student Marks</label>
        </div>

        <Button
          onClick={handleExport}
          disabled={loading || !selectedClass || !selectedSection}
        >
          {loading ? 'Exporting...' : 'Export Students'}
        </Button>
      </div>
    </div>
  )
}
