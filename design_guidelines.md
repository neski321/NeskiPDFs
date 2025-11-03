# Neski PDFs - Design Guidelines

## Design Approach

**Selected Approach:** Hybrid - Reference-based with Design System Foundation

**References:** Draw inspiration from modern PDF tools like Smallpdf and iLovePDF, combined with Material Design principles for productivity applications. Focus on workflow clarity and visual feedback.

**Key Principles:**
- Workflow-first: Guide users through upload → merge/edit → download seamlessly
- Visual clarity: Use thumbnails and previews as primary navigation
- Progressive disclosure: Show advanced options only when relevant
- Instant feedback: Clear visual states for all interactions

---

## Typography

**Primary Font:** Inter or Work Sans via Google Fonts
- Headlines (H1): 32px, 600 weight - App title and main action prompts
- Section Headers (H2): 24px, 600 weight - Tool sections
- Subheaders (H3): 18px, 500 weight - Instructions, file names
- Body Text: 16px, 400 weight - Descriptions, help text
- Small Text: 14px, 400 weight - Labels, metadata
- Button Text: 16px, 500 weight - CTAs and actions

---

## Layout System

**Spacing Units:** Use Tailwind units of 2, 4, 6, 8, 12, and 16 for consistent rhythm
- Component padding: p-6 to p-8
- Section gaps: gap-8 to gap-12
- Card spacing: m-4, p-6
- Button padding: px-6 py-3

**Container Strategy:**
- Main workspace: max-w-7xl mx-auto
- Tool panels: max-w-4xl for focused editing
- Upload zones: w-full with visual boundaries

**Grid System:**
- PDF thumbnails: grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4
- Tool cards: grid-cols-1 md:grid-cols-2 gap-6
- Action buttons: Flexible row with gap-4

---

## Application Structure

### 1. Header/Navigation Bar
- Logo "Neski PDFs" left-aligned with brand mark
- Navigation: "Merge PDFs" | "Edit PDF" | "Tools" dropdown
- Help icon and user account (if applicable) right-aligned
- Sticky positioning for constant access
- Subtle bottom border for definition

### 2. Main Workspace Layout

**Upload State (Initial):**
- Centered upload zone occupying 60% viewport height
- Dashed border with rounded corners (border-dashed, rounded-xl)
- Large upload icon (80px) centered above text
- Primary headline: "Upload PDFs to get started"
- Supporting text: "Drag & drop files or click to browse"
- File format support text: "Supports PDF files up to 50MB"
- Secondary action: "Or try sample files" link below

**Active Workspace:**
- Two-panel layout for editing:
  - Left sidebar (w-80): Thumbnail grid of all pages with selection checkboxes
  - Main preview area: Large preview of selected page(s)
  - Bottom toolbar: Action buttons for rotate, delete, reorder, download

**Merge Mode:**
- File list view with reorderable cards
- Each card shows: filename, page count, file size, drag handle icon
- Visual drop zones between files for insertion
- Preview panel on right showing merged page sequence

### 3. File Cards (Uploaded State)
- Thumbnail preview of first page (aspect ratio 8.5:11)
- Filename truncated with ellipsis
- Page count badge: "X pages" 
- File size display: "2.3 MB"
- Action icons: Delete (×), Edit, Download
- Drag handle indicator (⋮⋮) for reordering
- Hover state: subtle elevation (shadow-md)

### 4. Page Thumbnails
- Consistent sizing: w-32 h-40 per thumbnail
- Page number overlay at bottom
- Selection state: border highlight with checkmark
- Hover preview: slightly larger scale (scale-105)
- Drag preview: semi-transparent while dragging

### 5. Action Toolbar
- Floating at bottom with backdrop blur effect
- Primary actions: "Rotate Left" | "Rotate Right" | "Delete Selected" | "Download PDF"
- Disabled states when no selection
- Icon + text labels for clarity
- Keyboard shortcuts displayed on hover

### 6. Modal Dialogs
- Download confirmation: Custom filename input with .pdf extension
- Processing indicator: Progress bar with percentage
- Success state: Checkmark animation with "Download ready" message
- Error handling: Clear messaging with retry options

---

## Component Library

### Upload Zone
- Dashed border (border-2, border-dashed)
- Large icon (document with upload arrow)
- Drag-over state: Highlighted border, background shift
- File input hidden, triggered by zone click
- Multiple file support indicator

### PDF Thumbnail Cards
- Fixed aspect ratio containers
- Lazy loading for performance
- Page preview rendered at low resolution for speed
- Selection overlay with checkmark icon
- Context menu on right-click

### Drag-and-Drop Indicators
- Visual drop zones: Horizontal lines with + indicator
- Dragging state: Reduce opacity of source item
- Drop target highlight: Distinct visual treatment
- Smooth reordering animations (transition-all duration-200)

### Action Buttons
- Primary: Solid background with icon + text
- Secondary: Outline style for less important actions
- Danger: Red treatment for destructive actions (delete)
- Icon-only for compact toolbars with tooltips
- Backdrop blur when floating over content

### Progress & Status
- Linear progress bar for file processing
- Circular spinner for indeterminate states
- Success/error toast notifications (top-right positioning)
- File upload progress per file in list view

### Navigation Tabs
- Horizontal tab bar for tool switching
- Active state: Underline indicator
- Icon + label format
- Smooth transition on switch

---

## Interactions & Animations

**Use Sparingly:**
- Page reorder: Smooth position transitions (duration-200)
- Card hover: Subtle elevation change
- Success states: Simple checkmark fade-in
- File upload: Progress bar animation only

**Avoid:**
- Elaborate entrance animations
- Parallax effects
- Scroll-triggered animations
- Decorative motion

---

## Images

**No Hero Image Required** - This is a productivity tool, not a marketing page.

**Icon Set:** Use Heroicons (outline style) via CDN for all interface icons
- Upload: arrow-up-tray
- Delete: trash
- Rotate: arrow-path
- Download: arrow-down-tray
- Drag handle: bars-3
- Check: check-circle

**PDF Thumbnails:** Generated from actual uploaded PDFs, not placeholder images

---

## Responsive Considerations

**Desktop (lg+):** Two-panel layout with sidebar thumbnails
**Tablet (md):** Single column with thumbnail grid above preview
**Mobile:** Stack all elements vertically, thumbnail grid 2 columns, simplified toolbar with essential actions only