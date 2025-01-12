'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { importStudentsWithMarks } from './actions'
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
import { useRouter } from 'next/navigation'

interface ImportFormProps {
  classes: (Class & { sections: Section[] })[]
}

export default function ImportForm({ classes }: ImportFormProps) {
  const router = useRouter()
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [includeMarks, setIncludeMarks] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const sections = selectedClass 
    ? classes.find(c => c.id === parseInt(selectedClass))?.sections || []
    : []

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFile(file)
  }

  const handleImport = async () => {
    if (!file || !selectedClass || !selectedSection) {
      alert('Please select class, section and file')
      return
    }

    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      const result = await importStudentsWithMarks({
        students: jsonData,
        classId: parseInt(selectedClass),
        sectionId: parseInt(selectedSection),
        includeMarks
      })

      if (!result.success) throw new Error('Failed to import students')

      alert('Students imported successfully!')
      setFile(null)
      setSelectedClass('')
      setSelectedSection('')
      router.refresh()
      router.push('/list/students')
    } catch (error) {
      console.error('Import error:', error)
      alert(error instanceof Error ? error.message : 'Error importing students')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <Select
          value={selectedClass}
          onValueChange={(value) => {
            setSelectedClass(value)
            setSelectedSection('')
          }}
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Upload Excel File</label>
          <input 
            type="file" 
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="w-full border rounded p-2"
          />
        </div>

        <Button
          onClick={handleImport}
          disabled={loading || !selectedClass || !selectedSection || !file}
        >
          {loading ? 'Importing...' : 'Import Students'}
        </Button>

        <div className="mt-6 bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Excel File Format</h3>
          <div className="text-sm space-y-1">
            <p>Required columns:</p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>admissionno (unique)</li>
              <li>name</li>
              <li>Sex (Male/Female/Other)</li>
              {/* Add other required fields */}
            </ul>
            
            {includeMarks && (
              <>
                <p className="mt-2">Marks columns (if including marks):</p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>unitTest1</li>
                  <li>halfYearly</li>
                  <li>unitTest2</li>
                  <li>theory</li>
                  <li>practical</li>
                </ul>
              </>
            )}
          </div>
          <a 
            href="/sample-student-import.xlsx" 
            className="text-primary hover:underline text-sm block mt-4"
          >
            Download Sample Template
          </a>
        </div>
      </div>
    </div>
  )
}
