# Header Size Standardization Fix

## Issue
Class 9 report card had different header sizing compared to Class 8, causing inconsistent appearance across grade levels.

## Changes Made to Class 9 (`src/lib/pdfUtils9.ts`)

### 1. Logo Width
- **Before:** `width: 80`
- **After:** `width: 55`
- **Reason:** Match Class 8 smaller logo size

### 2. Affiliation Number Font Size
- **Before:** `fontSize: 8`
- **After:** `fontSize: 7`
- **Reason:** Match Class 8 smaller font for affiliation number

### 3. Header Stack Margin
- **Before:** `margin: [0, 10, 0, 10]`
- **After:** `margin: [0, 0, 0, 3]`
- **Reason:** Reduce spacing to match Class 8 compact header

### 4. Report Card Title Margin
- **Before:** `margin: [0, 10, 0, 5]`
- **After:** `margin: [0, 5, 0, 2]`
- **Reason:** Tighter spacing to match Class 8

### 5. Subtitle Margin
- **Before:** `margin: [0, 0, 0, 15]`
- **After:** `margin: [0, 0, 0, 5]`
- **Reason:** Reduce bottom spacing to match Class 8

### 6. Student Info Section Margin
- **Before:** `margin: [0, 0, 0, 2]`
- **After:** `margin: [0, 0, 0, 10]`
- **Reason:** Increase spacing before marks table to match Class 8

### 7. Student Image Size
- **Before:** `fit: [100, 100]`
- **After:** `fit: [80, 80]`
- **Reason:** Smaller image size to match Class 8

## Summary of Standardized Values

All three grade levels (Class 8, 9, and 11) now use:

| Element | Value |
|---------|-------|
| Logo Width | 55 |
| Affiliation Font Size | 7 |
| Header Margin | [0, 0, 0, 3] |
| Title Margin | [0, 5, 0, 2] |
| Subtitle Margin | [0, 0, 0, 5] |
| Student Info Margin | [0, 0, 0, 10] |
| Student Image Size | 80 x 80 |

## Visual Impact

The changes result in:
- More compact header with better space utilization
- Consistent appearance across all grade levels
- Professional, uniform look for all report cards
- More room for marks table and other content

## Testing

- [ ] Generate Class 8 report card
- [ ] Generate Class 9 report card
- [ ] Generate Class 11 report card
- [ ] Compare all three side-by-side
- [ ] Verify headers are identical in size and spacing
- [ ] Check that content fits properly on page
