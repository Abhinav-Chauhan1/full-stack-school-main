import ImportForm from './ImportForm';
import prisma from '@/lib/prisma';

const ImportPage = async () => {
  // Fetch classes and sections
  const classes = await prisma.class.findMany({
    orderBy: { classNumber: 'asc' },
    include: {
      sections: true
    }
  });

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Import Students</h1>
      <ImportForm classes={classes} />
    </div>
  );
};

export default ImportPage;
