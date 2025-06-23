# Layout System Guide

## Overview
This app uses a global layout system that automatically ensures all pages fill the available space between the header and sidebar without dead zones.

## How It Works

### 1. Layout Component Structure
- **Sidebar**: Fixed 100px width (70px on mobile)
- **Header**: Fixed 80px height (70px on mobile)
- **Content Area**: Automatically fills remaining space

### 2. Page Container Classes

Two global CSS classes are available for all pages:

#### `.page-container`
- Use for pages that manage their own scrolling
- Fills 100% width and height
- No overflow (overflow: hidden)
- Perfect for complex layouts with internal scrolling areas

```jsx
<div className="my-page page-container">
  {/* Your page content */}
</div>
```

#### `.page-container-scroll`
- Use for pages that need simple vertical scrolling
- Fills 100% width and height
- Enables vertical scrolling (overflow-y: auto)
- Perfect for long-form content

```jsx
<div className="my-page page-container-scroll">
  {/* Your scrollable content */}
</div>
```

## Implementation Guide

### For New Pages

1. Always add one of the page container classes to your root element:

```jsx
// For complex layouts
return (
  <div className="my-new-page page-container">
    {/* Content */}
  </div>
);

// For simple scrollable content
return (
  <div className="my-new-page page-container-scroll">
    {/* Content */}
  </div>
);
```

2. Your page-specific CSS should only contain styling, not layout dimensions:

```css
.my-new-page {
  background: #f5f5f5;
  /* Don't add width, height, or margin here */
}
```

### For Existing Pages

Update existing pages by:
1. Adding the appropriate page container class
2. Removing any custom width/height/margin CSS
3. Ensuring the page respects the global layout

## Benefits

1. **Consistency**: All pages automatically fill available space
2. **No Dead Zones**: Eliminates empty spaces around content
3. **Responsive**: Works across all screen sizes
4. **Maintainable**: No need to manually calculate dimensions
5. **Future-Proof**: New pages automatically get correct layout

## Important Notes

- The `.content > *` CSS rule ensures all direct children of the content area fill the space
- The Layout component handles responsive behavior automatically
- Don't override the page container classes with custom dimensions
- If you need custom spacing, add it inside your page content, not on the root element