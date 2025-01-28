'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { importStudentsWithMarks } from './actions'
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
import { useRouter } from 'next/navigation'

interface ImportFormProps {
  classes: (Class & { sections: Section[] })[];
  sessions: Session[];
}

export default function ImportForm({ classes = [], sessions = [] }: ImportFormProps) {
  const router = useRouter()
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const sections = selectedClass 
    ? classes.find(c => c.id === parseInt(selectedClass))?.sections || []
    : []

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFile(file)
  }

  interface Student {
    admissionno: string;
    name: string;
    Sex: string;
    admissiondate: string;
    address: string;
    city: string;
    village: string;
    birthday: string;
    Religion: string;
    tongue: string;
    category: string;
    bloodgroup: string;
    nationality?: string;
    mothername?: string;
    mphone?: string;
    moccupation?: string;
    fathername?: string;
    fphone?: string;
    foccupation?: string;
    aadharcard?: string;
    house?: string;
    previousClass?: string;
    yearofpass?: string;
    board?: string;
    school?: string;
    grade?: string;
  }

  const handleImport = async () => {
    if (!file || !selectedClass || !selectedSection || !selectedSession) {
      alert('Please select class, section, session and file')
      return
    }

    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: Student[] = XLSX.utils.sheet_to_json(worksheet)

      // Basic validation
      for (const student of jsonData) {
        if (!student.admissiondate || !student.birthday) {
          throw new Error('Admission date and birth date are required for all students');
        }
      }

      const result = await importStudentsWithMarks({
        students: jsonData,
        classId: parseInt(selectedClass),
        sectionId: parseInt(selectedSection),
        sessionId: parseInt(selectedSession)
      })

      if (!result.success) throw new Error('Failed to import students')

      alert('Students imported successfully!')
      setFile(null)
      setSelectedClass('')
      setSelectedSection('')
      setSelectedSession('')
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
          disabled={loading || !selectedClass || !selectedSection || !selectedSession || !file}
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
              <li>admissiondate (YYYY-MM-DD)</li>
              <li>address</li>
              <li>city</li>
              <li>village</li>
              <li>birthday (YYYY-MM-DD)</li>
              <li>Religion (Hindu/Muslim/Christian/Sikh/Usmani/Raeen/MominAnsar)</li>
              <li>tongue (Hindi/English/Punjabi/Urdu/Bhojpuri/Gujarati)</li>
              <li>category (General/SC/ST/OBC/Other)</li>
              <li>bloodgroup (A_plus/A_minus/B_plus/B_minus/O_plus/O_minus/AB_plus/AB_minus)</li>
            </ul>
            
            <p className="mt-2">Optional columns:</p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>nationality</li>
              <li>mothername</li>
              <li>mphone</li>
              <li>moccupation</li>
              <li>fathername</li>
              <li>fphone</li>
              <li>foccupation</li>
              <li>aadharcard</li>
              <li>house</li>
              <li>previousClass</li>
              <li>yearofpass</li>
              <li>board</li>
              <li>school</li>
              <li>grade</li>
            </ul>
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
