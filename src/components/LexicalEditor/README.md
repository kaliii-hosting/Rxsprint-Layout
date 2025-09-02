# Lexical Editor Component

A professional rich text editor component for RxSprint built on Meta's Lexical framework, designed to replace TipTap with enhanced table support, Excel paste functionality, and clean UI.

## Features

- **Rich Text Formatting**: Bold, italic, underline, strikethrough, code
- **Document Structure**: Headings (H1-H3), paragraphs, quotes, lists
- **Tables**: Professional table support with proper scrolling
- **Excel Integration**: Direct paste from Excel with preserved formatting
- **Images**: Image upload and paste support
- **Responsive**: Optimized for both desktop and mobile
- **Professional UI**: Clean, modern interface matching RxSprint design
- **Banner Compatibility**: Preserves existing banner system

## Installation

The required packages have already been installed:

```bash
npm install lexical @lexical/react @lexical/table @lexical/rich-text @lexical/list @lexical/link @lexical/code @lexical/markdown @lexical/clipboard @lexical/selection @lexical/utils @lexical/html
```

## Basic Usage

### Replacing TipTap with Lexical

```jsx
// Before (TipTap)
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor';

// After (Lexical)
import LexicalEditor from '../../components/LexicalEditor/LexicalEditor';

// Usage remains the same
<LexicalEditor
  value={content}
  onChange={handleContentChange}
  placeholder="Start typing..."
  onImageUpload={handleImageUpload}
  readOnly={false}
  hideToolbar={false}
/>
```

### Integration in Notes Page

To integrate with the existing Notes page while preserving banners:

```jsx
import React, { useState, useRef } from 'react';
import LexicalEditor from '../../components/LexicalEditor/LexicalEditor';

const NotesPage = () => {
  const [content, setContent] = useState('');
  const editorRef = useRef();

  const handleContentChange = (html) => {
    setContent(html);
  };

  const handleImageUpload = async (file, isPaste = false) => {
    // Your existing image upload logic
    try {
      const url = await uploadToFirebase(file);
      return url;
    } catch (error) {
      console.error('Image upload failed:', error);
      return null;
    }
  };

  return (
    <div className="notes-container">
      {/* Existing banner system remains unchanged */}
      <div className="banner-section">
        {/* Your existing banner components */}
      </div>

      {/* Replace TipTap with Lexical */}
      <div className="editor-section">
        <LexicalEditor
          ref={editorRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your note..."
          onImageUpload={handleImageUpload}
          className="notes-editor"
        />
      </div>
    </div>
  );
};
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | HTML content of the editor |
| `onChange` | `function` | `undefined` | Callback when content changes `(html: string) => void` |
| `placeholder` | `string` | `'Start typing...'` | Placeholder text |
| `readOnly` | `boolean` | `false` | Whether editor is read-only |
| `onImageUpload` | `function` | `undefined` | Image upload handler `(file: File, isPaste: boolean) => Promise<string>` |
| `className` | `string` | `''` | Additional CSS classes |
| `hideToolbar` | `boolean` | `false` | Hide the formatting toolbar |

## Features in Detail

### Table Support

The editor provides excellent table functionality:

- **Excel Paste**: Direct paste from Excel with preserved structure
- **Tab-separated Data**: Converts tab-separated text to tables
- **Scrollable Tables**: Large tables scroll properly without breaking layout
- **Professional Styling**: Clean table styling matching the app design

### Image Handling

- **File Upload**: Click image button to select files
- **Paste Support**: Paste images directly from clipboard
- **Error Handling**: Graceful handling of upload failures
- **CORS Friendly**: Handles development CORS issues

### Mobile Optimization

- **Responsive Toolbar**: Simplified toolbar on mobile devices
- **Touch Friendly**: Properly sized touch targets
- **iOS Optimized**: Prevents zoom on focus (16px font size)

## Styling

The editor uses CSS custom properties and can be themed:

```css
.lexical-editor-container {
  --primary-color: #FF6900;
  --border-color: #e0e0e0;
  --background-color: #ffffff;
  --text-color: #333;
}
```

### Custom Styling

You can override specific parts:

```css
.notes-editor .lexical-content-editable {
  font-family: 'Your Custom Font';
  font-size: 16px;
  line-height: 1.8;
}

.notes-editor .lexical-table {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## Migration from TipTap

### Step 1: Update Imports

```jsx
// Replace this
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor';

// With this
import LexicalEditor from '../../components/LexicalEditor/LexicalEditor';
```

### Step 2: Update Component Usage

The API is designed to be compatible with the existing TipTap integration:

```jsx
// This works with both editors
<LexicalEditor
  value={formData.content}
  onChange={(html) => setFormData({...formData, content: html})}
  placeholder="Start writing..."
  onImageUpload={handleImageUpload}
  readOnly={viewMode}
/>
```

### Step 3: Update CSS (Optional)

If you have TipTap-specific styles, you may want to update them:

```css
/* Replace .ProseMirror styles with .lexical-content-editable */
.lexical-content-editable {
  /* Your custom styles */
}
```

## Advanced Usage

### Accessing Editor Instance

```jsx
const editorRef = useRef();

// Access editor methods (advanced)
const focusEditor = () => {
  if (editorRef.current?.editor) {
    editorRef.current.editor.focus();
  }
};

<LexicalEditor ref={editorRef} />
```

### Custom Image Upload

```jsx
const handleImageUpload = async (file, isPaste = false) => {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

## Benefits over TipTap

1. **Better Table Support**: More reliable table editing and scrolling
2. **Enhanced Excel Integration**: Superior paste functionality from spreadsheets
3. **Modern Architecture**: Built on Lexical's robust foundation
4. **Better Performance**: More efficient rendering and updates
5. **Future-Proof**: Actively maintained by Meta
6. **Professional Styling**: Cleaner, more consistent UI

## Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## Troubleshooting

### Content Not Loading

Ensure the `value` prop contains valid HTML:

```jsx
// Good
<LexicalEditor value="<p>Hello world</p>" />

// Also works
<LexicalEditor value="Plain text content" />

// Avoid
<LexicalEditor value={undefined} />
```

### Images Not Uploading

Check your `onImageUpload` function returns a promise:

```jsx
const handleImageUpload = async (file) => {
  // Must return URL string
  return await uploadToServer(file);
};
```

### Tables Not Pasting

Ensure you're copying from Excel with table structure. The editor supports:
- HTML table format (from Excel/Google Sheets)
- Tab-separated values
- CSV-like formats

## Future Enhancements

- Custom image nodes with captions
- Advanced table editing (merge cells, etc.)
- Collaborative editing support
- Plugin architecture for custom extensions