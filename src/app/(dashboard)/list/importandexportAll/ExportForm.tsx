'use client'
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { exportData } from "./actions"
import { toast } from "react-toastify"

const models = [
  "Teacher",
  "Class",
  "Section",
  "Subject",
  "Session",
  "SubCategory",
]

function ExportForm() {
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  const handleExport = async () => {
    if (selectedModels.length === 0) {
      toast.error("Please select at least one model")
      return
    }

    try {
      const base64Data = await exportData(selectedModels)
      const binaryString = window.atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'school-data-export.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Data exported successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to export data")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Select Models to Export</h3>
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
      <Button onClick={handleExport} disabled={selectedModels.length === 0}>
        Export Data
      </Button>
    </div>
  )
}

export default ExportForm
