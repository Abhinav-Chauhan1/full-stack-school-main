import { TDocumentDefinitions } from 'pdfmake/interfaces';

export { loadImage } from './pdfUtils';

export const generateFeeReceiptPdf = (
  receiptData: any,
  logoData: string | null
): TDocumentDefinitions => {
  const feeItems = [
    { label: 'Tuition Fee', amount: receiptData.tuitionFee },
    { label: 'ID Card', amount: receiptData.idCard },
    { label: 'Annual Fee', amount: receiptData.annualFee },
    { label: 'Diary & Calendar', amount: receiptData.diaryCalendar },
    { label: 'Smart Classes', amount: receiptData.smartClasses },
    { label: 'Exam Fee', amount: receiptData.examFee },
    { label: 'Transport Fee', amount: receiptData.transportFee },
    { label: 'Other Fees', amount: receiptData.otherFees },
  ].filter(item => item.amount > 0);

  const feeTableBody = [
    [
      { text: 'Fee Description', style: 'tableHeader', fillColor: '#e6e6e6' },
      { text: 'Amount (₹)', style: 'tableHeader', alignment: 'right', fillColor: '#e6e6e6' },
    ],
    ...feeItems.map(item => [
      { text: item.label, style: 'tableCell' },
      { text: item.amount.toFixed(2), style: 'tableCell', alignment: 'right' },
    ]),
  ];

  if (receiptData.previousDues > 0) {
    feeTableBody.push([
      { text: 'Previous Dues', style: 'tableCell', bold: true },
      { text: receiptData.previousDues.toFixed(2), style: 'tableCell', alignment: 'right', bold: true },
    ]);
  }

  if (receiptData.discount > 0) {
    feeTableBody.push([
      { text: 'Discount', style: 'tableCell', color: 'green' },
      { text: `- ${receiptData.discount.toFixed(2)}`, style: 'tableCell', alignment: 'right', color: 'green' },
    ]);
  }

  feeTableBody.push([
    { text: 'Total Amount', style: 'tableCell', bold: true, fontSize: 12, fillColor: '#f0f0f0' },
    { text: receiptData.totalAmount.toFixed(2), style: 'tableCell', alignment: 'right', bold: true, fontSize: 12, fillColor: '#f0f0f0' },
  ]);

  feeTableBody.push([
    { text: 'Amount Paid', style: 'tableCell', bold: true, fontSize: 12, fillColor: '#d4edda' },
    { text: receiptData.amountPaid.toFixed(2), style: 'tableCell', alignment: 'right', bold: true, fontSize: 12, fillColor: '#d4edda' },
  ]);

  const balance = receiptData.totalAmount - receiptData.amountPaid;
  if (balance !== 0) {
    feeTableBody.push([
      { text: balance > 0 ? 'Balance Due' : 'Excess Paid', style: 'tableCell', bold: true, color: balance > 0 ? 'red' : 'blue' },
      { text: Math.abs(balance).toFixed(2), style: 'tableCell', alignment: 'right', bold: true, color: balance > 0 ? 'red' : 'blue' },
    ]);
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      // Header
      {
        columns: [
          {
            width: 60,
            image: logoData || '',
            alignment: 'center'
          },
          {
            width: '*',
            stack: [
              { text: 'HOWARD CONVENT SCHOOL', style: 'schoolName', color: '#000080' },
              { text: 'Affiliated To C.B.S.E. New Delhi', style: 'affiliation', color: 'red' },
              { text: 'Near Garhi, Dhampur Road, Kanth (Moradabad)', style: 'address' },
              { text: 'FEE RECEIPT', style: 'receiptTitle', margin: [0, 10, 0, 0] },
            ],
            alignment: 'center'
          }
        ],
        margin: [0, 0, 0, 20]
      },

      // Receipt Details
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: `Receipt No: ${receiptData.receiptNo}`, style: 'fieldLabel', bold: true },
              { text: `Date: ${new Date(receiptData.paymentDate).toLocaleDateString()}`, style: 'fieldLabel' },
              { text: `Session: ${receiptData.session.sessioncode}`, style: 'fieldLabel' },
              receiptData.month ? { text: `Month: ${receiptData.month}`, style: 'fieldLabel' } : {},
            ]
          },
          {
            width: '50%',
            stack: [
              { text: `Student Name: ${receiptData.student.name}`, style: 'fieldLabel' },
              { text: `Admission No: ${receiptData.student.admissionno}`, style: 'fieldLabel' },
              { text: `Class: ${receiptData.student.Class?.name} - ${receiptData.student.Section?.name}`, style: 'fieldLabel' },
              { text: `Father's Name: ${receiptData.student.fathername || '-'}`, style: 'fieldLabel' },
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },

      // Fee Table
      {
        table: {
          widths: ['*', 100],
          body: feeTableBody
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#cccccc',
          vLineColor: () => '#cccccc'
        },
        margin: [0, 0, 0, 20]
      },

      // Payment Details
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: 'Payment Details', style: 'sectionHeader', colSpan: 2, fillColor: '#e6e6e6' },
              {}
            ],
            [
              { text: `Payment Mode: ${receiptData.paymentMode}`, style: 'fieldLabel' },
              receiptData.transactionId ? { text: `Transaction ID: ${receiptData.transactionId}`, style: 'fieldLabel' } : { text: '' }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20]
      },

      // Remarks
      receiptData.remarks ? {
        text: `Remarks: ${receiptData.remarks}`,
        style: 'fieldLabel',
        margin: [0, 0, 0, 20]
      } : {},

      // Footer
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: '_____________________', alignment: 'left', margin: [0, 40, 0, 0] },
              { text: 'Received By', style: 'footerLabel', alignment: 'left' }
            ]
          },
          {
            width: '*',
            stack: [
              { text: '_____________________', alignment: 'right', margin: [0, 40, 0, 0] },
              { text: 'Authorized Signature', style: 'footerLabel', alignment: 'right' }
            ]
          }
        ],
        margin: [0, 30, 0, 0]
      },

      // Note
      {
        text: 'Note: This is a computer-generated receipt and does not require a signature.',
        style: 'note',
        alignment: 'center',
        margin: [0, 20, 0, 0]
      }
    ],
    styles: {
      schoolName: {
        fontSize: 20,
        bold: true,
        alignment: 'center'
      },
      affiliation: {
        fontSize: 12,
        bold: true,
        alignment: 'center'
      },
      address: {
        fontSize: 10,
        alignment: 'center'
      },
      receiptTitle: {
        fontSize: 16,
        bold: true,
        alignment: 'center',
        decoration: 'underline'
      },
      fieldLabel: {
        fontSize: 10,
        margin: [0, 2]
      },
      tableHeader: {
        fontSize: 11,
        bold: true,
        margin: [5, 5]
      },
      tableCell: {
        fontSize: 10,
        margin: [5, 5]
      },
      sectionHeader: {
        fontSize: 11,
        bold: true,
        margin: [5, 5]
      },
      footerLabel: {
        fontSize: 10,
        margin: [0, 5]
      },
      note: {
        fontSize: 8,
        italics: true,
        color: '#666666'
      }
    }
  };
};

export const generateAndDownloadFeeReceiptPdf = async (
  receiptData: any,
  logoData: string | null,
  onClose: () => void
) => {
  try {
    const pdfMake = (await import('pdfmake/build/pdfmake')).default;
    const pdfFonts = (await import('pdfmake/build/vfs_fonts')).vfs;
    pdfMake.vfs = pdfFonts;

    const docDefinition = generateFeeReceiptPdf(receiptData, logoData);
    
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.download(`FeeReceipt_${receiptData.receiptNo}.pdf`);
    
    onClose();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
