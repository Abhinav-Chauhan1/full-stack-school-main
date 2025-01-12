import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from 'next/dynamic'
import prisma from '@/lib/prisma'

const ImportForm = dynamic(() => import('./ImportForm'))
const ExportForm = dynamic(() => import('./ExportForm'))

export default async function StudentImportExportPage() {
  const classes = await prisma.class.findMany({
    orderBy: { classNumber: 'asc' },
    include: {
      sections: true
    }
  })

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Student Data Import/Export</h1>
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export Students</TabsTrigger>
          <TabsTrigger value="import">Import Students</TabsTrigger>
        </TabsList>
        <TabsContent value="export">
          <Card className="p-6">
            <ExportForm classes={classes} />
          </Card>
        </TabsContent>
        <TabsContent value="import">
          <Card className="p-6">
            <ImportForm classes={classes} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
