'use client'

import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from 'next/dynamic'

const ImportForm = dynamic(() => import('@/app/(dashboard)/list/importandexportAll/ImportForm'))
const ExportForm = dynamic(() => import('@/app/(dashboard)/list/importandexportAll/ExportForm'))

export default function ImportExportPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Data Import and Export</h1>
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
        </TabsList>
        <TabsContent value="export">
          <Card className="p-6">
            <ExportForm />
          </Card>
        </TabsContent>
        <TabsContent value="import">
          <Card className="p-6">
            <ImportForm />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
