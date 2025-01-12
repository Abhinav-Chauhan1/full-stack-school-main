'use server'

import prisma from "@/lib/prisma"
import * as XLSX from 'xlsx'

// Order of models for import (based on dependencies)
const MODEL_IMPORT_ORDER = [
  'Class',        // No foreign keys
  'Section',      // Depends on Class
  'Subject',      // No foreign keys
  'Session',      // No foreign keys
  'SubCategory',  // No foreign keys
  'Teacher',      // No foreign keys
] as const

// Map frontend model names to Prisma model names
const modelMap = {
  'Teacher': 'teacher',
  'Class': 'class',
  'Section': 'section',
  'Subject': 'subject',
  'Session': 'session',
  'SubCategory': 'subCategory'
} as const

// Convert Excel date number to JavaScript Date object
function excelDateToJSDate(excelDate: number) {
  return new Date(Math.round((excelDate - 25569) * 86400 * 1000))
}

// Date fields for each model that need conversion
const dateFields: { [key: string]: string[] } = {
  teacher: ['birthday', 'joiningdate', 'createdAt', 'updatedAt'],
  class: ['createdAt', 'updatedAt'],
  section: ['createdAt', 'updatedAt'],
  subject: ['createdAt', 'updatedAt'],
  session: ['sessionfrom', 'sessionto', 'createdAt', 'updatedAt'],
  subCategory: ['createdAt', 'updatedAt']
}

export async function exportData(models: string[]) {
  const workbook = XLSX.utils.book_new()

  for (const model of models) {
    try {
      const modelName = modelMap[model as keyof typeof modelMap]
      if (!modelName || !prisma[modelName]) {
        console.error(`Model ${model} not found in Prisma client`)
        continue
      }
      
      // @ts-ignore - Prisma types are not properly inferred here
      const data = await prisma[modelName].findMany()
      const worksheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, worksheet, model)
    } catch (error) {
      console.error(`Error exporting model ${model}:`, error)
    }
  }

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
  // Convert buffer to base64 string for transmission
  return Buffer.from(buffer).toString('base64')
}

export async function importData(formData: FormData) {
  const file = formData.get('file') as File
  const selectedModels = new Set(JSON.parse(formData.get('models') as string))
  
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer)

  // Import models in the correct order
  for (const model of MODEL_IMPORT_ORDER) {
    if (!selectedModels.has(model)) continue;

    try {
      const modelName = modelMap[model as keyof typeof modelMap]
      if (!modelName || !prisma[modelName]) {
        console.error(`Model ${model} not found in Prisma client`)
        continue
      }

      const worksheet = workbook.Sheets[model]
      if (worksheet) {
        let data = XLSX.utils.sheet_to_json(worksheet)
        
        // Convert date fields
        data = data.map(item => {
          const convertedItem = { ...(item as Record<string, unknown>) }
          const modelDateFields = dateFields[modelName]
          
          if (modelDateFields) {
            modelDateFields.forEach(field => {
              if (typeof convertedItem[field] === 'number') {
                convertedItem[field] = excelDateToJSDate(convertedItem[field])
              }
            })
          }

          
          return convertedItem
        })

        // @ts-ignore - Prisma types are not properly inferred here
        await prisma[modelName].createMany({
          data,
          skipDuplicates: true,
        })
        
        console.log(`Imported ${data.length} ${model} records`)
      }
    } catch (error) {
      console.error(`Error importing model ${model}:`, error)
      throw error
    }
  }
}
