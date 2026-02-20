# Report Card Header Standardization

## Overview
Updated the report card headers for Class 9 and Class 11 to match the Class 8 format for consistency across all grade levels.

## Standard Header Format

All report cards now use the same header structure:

### School Header
- Affiliation No.: 2132869
- HOWARD CONVENT SCHOOL
- Affiliated To C.B.S.E. New Delhi
- Near Garhi, Dhampur Road, Kanth (Moradabad)

### Report Card Title
- REPORT CARD (SESSION: [Session Code])
- (Issued by School as per Directives of Central Board of Secondary Education, Delhi)

### Student Information Section
**Left Column (50% width):**
- Student's Name: [Name]
- Class: [Class] - ([Section])
- Mother's Name: [Mother Name]
- Father's Name: [Father Name]
- School Address: 3K.M, Milestone, Near Garhi, Kanth (Moradabad)

**Middle Column (30% width):**
- Date of Birth: [DOB]
- Admission No: [Admission Number]
- Address: [Address], [City], [Village]

**Right Column (20% width):**
- Student Photo (if available)

## Files Modified

### 1. Class 11 PDF Utils (`src/lib/pdfUtils11.ts`)

**Changes Made:**
- Updated `generateHeader()` function to match Class 8 format
- Updated `generateStudentInfo()` function with proper structure
- Added "REPORT CARD (SESSION: ...)" title
- Added "(Issued by School as per Directives...)" subtitle
- Added "School Address" field in student info
- Updated address format to include city and village
- Changed class format from "Class - Section" to "Class - (Section)"
- Added `subHeader` style for the subtitle
- Reduced logo width from 80 to 55 for consistency
- Reduced margins for better spacing

### 2. Class 9 PDF Utils (`src/lib/pdfUtils9.ts`)

**Status:** Already had the correct format, no changes needed.

### 3. Class 8 PDF Utils (`src/lib/pdfUtils.ts`)

**Status:** This is the reference format, no changes needed.

## Visual Improvements

1. **Consistent Branding**: All report cards now have identical headers
2. **Complete Information**: School address added to all cards
3. **Better Layout**: Optimized spacing and margins
4. **Professional Look**: Standardized formatting across all grades

## Before vs After (Class 11)

### Before:
```
Affiliation No.: 2132869
HOWARD CONVENT SCHOOL
Affiliated To C.B.S.E. New Delhi
Near Garhi, Dhampur Road, Kanth (Moradabad)

Student's Name: [Name]
Class: [Class] - [Section]
Mother's Name: [Mother]
Father's Name: [Father]

Date of Birth: [DOB]
Admission No: [Number]
Address: [Address]
```

### After:
```
Affiliation No.: 2132869
HOWARD CONVENT SCHOOL
Affiliated To C.B.S.E. New Delhi
Near Garhi, Dhampur Road, Kanth (Moradabad)

REPORT CARD (SESSION: 2025-26)
(Issued by School as per Directives of Central Board of Secondary Education, Delhi)

Student's Name: [Name]
Class: [Class] - ([Section])
Mother's Name: [Mother]
Father's Name: [Father]
School Address: 3K.M, Milestone, Near Garhi, Kanth (Moradabad)

Date of Birth: [DOB]
Admission No: [Number]
Address: [Address], [City], [Village]
```

## Testing Checklist

- [ ] Generate Class 8 report card - verify header format
- [ ] Generate Class 9 report card - verify header matches Class 8
- [ ] Generate Class 11 report card - verify header matches Class 8
- [ ] Check that all fields display correctly
- [ ] Verify student photo displays properly
- [ ] Check spacing and margins are consistent
- [ ] Verify session code displays correctly
- [ ] Test with students who have missing optional fields
