# Report Card Session Filter Fix

## Problem
After promoting students to a new session, the report card pages were showing old marks from the previous session instead of empty data for the new session. The marks entry pages correctly showed empty data, but the results/report card pages did not.

## Root Cause
The issue had two parts:

1. **Student List Not Filtered by Session**: The results pages were not filtering students by the selected session. They only filtered marks by session, so promoted students still appeared in the list but with marks from a different session.

2. **FormContainer Using Wrong Session Filter**: When generating PDFs, the `FormContainer` component was hardcoded to fetch marks where `session.isActive = true` instead of using the selected session from the results page.

## Solution

### 1. Updated Results Pages
**Files Modified:**
- `src/app/(dashboard)/list/results/page.tsx`
- `src/app/(dashboard)/list/results9/page.tsx`
- `src/app/(dashboard)/list/results11/page.tsx`

**Changes:**
- Added `sessionId` filter to the student query
- Now students are filtered by: class, section, AND session
- Passed `sessionId` to FormContainer when printing results

```typescript
// Before
const query: any = {};
if (classId) query.classId = parseInt(classId);
if (sectionId) query.sectionId = parseInt(sectionId);

// After
const query: any = {};
if (classId) query.classId = parseInt(classId);
if (sectionId) query.sectionId = parseInt(sectionId);
if (sessionId) query.sessionId = parseInt(sessionId); // NEW
```

### 2. Updated FormContainer
**File Modified:** `src/components/FormContainer.tsx`

**Changes:**
- Modified `result`, `result9`, and `result11` cases
- Now uses `data.sessionId` if provided, otherwise falls back to `isActive: true`
- Fetches the correct session info for the PDF

```typescript
// Before
where: {
  session: { isActive: true }
}

// After
const sessionFilter = data?.sessionId 
  ? { sessionId: data.sessionId }
  : { session: { isActive: true } };

where: sessionFilter
```

### 3. Updated Print Button Calls
**Changes:**
- All result pages now pass sessionId to FormContainer
- This ensures the PDF generator uses the correct session

```typescript
<FormContainer
  table="result"
  type="print"
  id={student.id}
  data={{ sessionId: sessionId ? parseInt(sessionId) : undefined }}
/>
```

## Behavior After Fix

### When Session is Selected:
- Only students in that specific session are shown
- Report cards show marks for that specific session only
- If no marks exist for that session, the report card shows empty/zero marks

### When No Session is Selected:
- Falls back to showing students in the active session
- Report cards show marks from the active session

### After Promotion:
1. Promote students from Session A to Session B
2. Select Session B in results page
3. Students appear in the list (because they're now in Session B)
4. Report cards show empty marks (because no marks entered yet for Session B)
5. Select Session A in results page
6. Students no longer appear (because they're not in Session A anymore)

## Testing Checklist
- [ ] Promote students to a new session
- [ ] Select the new session in results page
- [ ] Verify students appear in the list
- [ ] Generate report card - should show empty/zero marks
- [ ] Enter marks for the new session
- [ ] Generate report card again - should show the new marks
- [ ] Switch back to old session - students should not appear
