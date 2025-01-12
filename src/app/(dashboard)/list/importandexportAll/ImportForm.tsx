'use client'
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { importData } from "./actions"
import { toast } from "react-toastify"

const models = [
  "Teacher",
  "Class",
  "Section",
  "Subject",
  "Session",
  "SubCategory",
]

export default function ImportForm() {
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)

  const handleImport = async () => {
    if (!file || selectedModels.length === 0) {
      toast.error("Please select a file and at least one model")
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('models', JSON.stringify(selectedModels))

    try {
      await importData(formData)
      toast.success("Data imported successfully")
    } catch (error) {
      toast.error("Failed to import data")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Select Models to Import</h3>
        <div className="grid grid-cols-2 gap-4">
          {models.map((model) => (
            <div key={model} className="flex items-center space-x-2">
              <Checkbox
                id={model}
                checked={selectedModels.includes(model)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedModels([...selectedModels, model])
                  } else {
                    setSelectedModels(selectedModels.filter((m) => m !== model))
                  }
                }}
              />
              <label htmlFor={model}>{model}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
        />
      </div>

      <Button onClick={handleImport} disabled={!file || selectedModels.length === 0}>
        Import Data
      </Button>
    </div>
  )
}
