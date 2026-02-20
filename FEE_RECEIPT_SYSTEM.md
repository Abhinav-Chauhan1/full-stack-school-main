# Fee Receipt Management System

## Overview
Complete fee receipt management system for generating and tracking student fee payments with customizable fee structures.

## Features

### 1. Fee Structure Management
- Tuition Fee
- ID Card Fee
- Annual Fee
- Diary & Calendar Fee
- Smart Classes Fee
- Exam Fee
- Transport Fee
- Other Fees (with description)

### 2. Fee Receipt Generation
- Automatic receipt number generation (FR-0001, FR-0002, etc.)
- Student selection by class
- Month-wise fee collection
- Multiple payment modes (Cash, Online, UPI, Cheque, Card)
- Discount support
- Previous dues tracking
- Transaction ID for online payments
- Remarks field

### 3. Fee Receipt Listing
- View all fee receipts
- Filter by session, class, and month
- Search functionality
- Print individual receipts
- Update and delete receipts (admin only)

### 4. PDF Receipt Generation
- Professional fee receipt format
- School header with logo
- Detailed fee breakdown
- Payment details
- Balance calculation
- Computer-generated receipt note

## Database Schema

### FeeStructure Model
```prisma
model FeeStructure {
  id              Int      @id @default(autoincrement())
  classId         Int
  sessionId       Int
  tuitionFee      Float
  idCard          Float
  annualFee       Float
  diaryCalendar   Float
  smartClasses    Float
  examFee         Float
  transportFee    Float
  otherFees       Float
}
```

### FeeReceipt Model
```prisma
model FeeReceipt {
  id              Int      @id @default(autoincrement())
  receiptNo       String   @unique
  studentId       String
  sessionId       Int
  paymentDate     DateTime
  month           String?
  tuitionFee      Float
  idCard          Float
  annualFee       Float
  diaryCalendar   Float
  smartClasses    Float
  examFee         Float
  transportFee    Float
  otherFees       Float
  otherFeesDesc   String?
  totalAmount     Float
  amountPaid      Float
  discount        Float
  previousDues    Float
  paymentMode     PaymentMode
  transactionId   String?
  remarks         String?
}
```

### PaymentMode Enum
- CASH
- ONLINE
- CHEQUE
- UPI
- CARD

## Files Created

### Pages
- `src/app/(dashboard)/list/feeReceipts/page.tsx` - Main fee receipts listing page
- `src/app/(dashboard)/list/feeReceipts/FeeReceiptForm.tsx` - Fee receipt form component
- `src/app/(dashboard)/list/feeReceipts/actions.ts` - Server actions for CRUD operations

### Components
- `src/components/FeeReceiptPdfGenerator.tsx` - PDF generator component

### Utilities
- `src/lib/feeReceiptPdfUtils.ts` - PDF generation utilities

### Schema
- Updated `prisma/schema.prisma` with FeeStructure and FeeReceipt models

### Menu
- Added "Fee Receipts" menu item in sidebar (admin only)

## Usage

### Creating a Fee Receipt
1. Navigate to "Fee Receipts" from sidebar
2. Click "Create" button
3. Select session, class, and student
4. Enter fee details (auto-populated from fee structure if available)
5. Add discount or previous dues if applicable
6. Select payment mode and enter transaction ID
7. Click "Generate Receipt"

### Printing a Receipt
1. Go to fee receipts list
2. Click the print icon next to any receipt
3. Review receipt details
4. Click "Download Receipt" to generate PDF

### Filtering Receipts
- Filter by session to view receipts for specific academic year
- Filter by class to view class-wise receipts
- Filter by month for monthly fee collection reports
- Use search to find specific students

## Fee Structure Setup (Future Enhancement)
To implement fee structure management:
1. Create `/list/feeStructure` page
2. Allow setting default fees per class and session
3. Auto-populate fees when generating receipts
4. Support for different fee structures per class

## Payment Tracking Features
- Total collection reports
- Outstanding dues tracking
- Month-wise collection summary
- Class-wise fee collection
- Payment mode wise reports

## Security
- Only admin users can create, update, and delete receipts
- Receipt numbers are auto-generated and unique
- All transactions are logged with timestamps
- Payment details are securely stored

## Future Enhancements
1. Fee structure management page
2. Bulk receipt generation
3. SMS/Email receipt delivery
4. Online payment gateway integration
5. Fee defaulter reports
6. Collection reports and analytics
7. Fee reminder system
8. Installment payment support
9. Fee concession management
10. Receipt templates customization

## Database Migration
Run the following command to apply schema changes:
```bash
npx prisma db push
```

Or for production:
```bash
npx prisma migrate deploy
```

## Notes
- Receipt numbers are sequential and auto-generated
- Receipts can be updated but receipt number remains same
- Deleted receipts cannot be recovered
- PDF receipts are generated client-side using pdfmake
- All amounts are stored in INR (₹)
