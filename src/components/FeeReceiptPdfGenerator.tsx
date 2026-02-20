'use client';

import { useEffect, useState } from 'react';
import { loadImage, generateAndDownloadFeeReceiptPdf } from '@/lib/feeReceiptPdfUtils';

interface FeeReceiptPdfGeneratorProps {
  receiptData: any;
  onClose: () => void;
}

export default function FeeReceiptPdfGenerator({ receiptData, onClose }: FeeReceiptPdfGeneratorProps) {
  const [loading, setLoading] = useState(true);
  const [logoData, setLogoData] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const logo = await loadImage('/logo.png');
      setLogoData(logo);
      setLoading(false);
    };
    init();
  }, []);

  const handleGeneratePDF = async () => {
    try {
      await generateAndDownloadFeeReceiptPdf(receiptData, logoData, onClose);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Print Fee Receipt</h2>
      <div className="flex flex-col gap-2">
        <p><strong>Receipt No:</strong> {receiptData.receiptNo}</p>
        <p><strong>Student Name:</strong> {receiptData.student.name}</p>
        <p><strong>Admission No:</strong> {receiptData.student.admissionno}</p>
        <p><strong>Class:</strong> {receiptData.student.Class?.name} - {receiptData.student.Section?.name}</p>
        <p><strong>Total Amount:</strong> ₹{receiptData.totalAmount}</p>
        <p><strong>Amount Paid:</strong> ₹{receiptData.amountPaid}</p>
        <p><strong>Payment Date:</strong> {new Date(receiptData.paymentDate).toLocaleDateString()}</p>
      </div>
      <button
        onClick={handleGeneratePDF}
        className="bg-lamaGreen text-white py-2 px-4 rounded-md border-none w-max self-center"
      >
        Download Receipt
      </button>
    </div>
  );
}
