# ResponsivePageSettings Component

A responsive dropdown menu system that consolidates page toolbar buttons into a clean, mobile-friendly interface.

## Features

- Automatically activates on screens smaller than 968px or when browser is zoomed
- Smooth animations and transitions
- Supports tabs, dividers, and action buttons
- Clean, modern design with proper icons and badges
- Dark theme support
- Accessible with ARIA attributes
- Touch-friendly interface

## Usage

### Basic Implementation

```jsx
import EnterpriseHeader from '../../components/EnterpriseHeader/EnterpriseHeader';
import { TabGroup, TabButton, HeaderDivider, ActionGroup, ActionButton } from '../../components/EnterpriseHeader/EnterpriseHeader';

<EnterpriseHeader 
  responsive={true}
  responsiveBreakpoint={968}
  settingsPosition="bottom-right"
>
  <TabGroup>
    <TabButton active icon={FileText}>Overview</TabButton>
    <TabButton icon={Settings} badge="3">Details</TabButton>
  </TabGroup>
  
  <HeaderDivider />
  
  <ActionGroup>
    <ActionButton icon={Save} primary>Save</ActionButton>
    <ActionButton icon={Download}>Download</ActionButton>
  </ActionGroup>
</EnterpriseHeader>
```

### Props

#### EnterpriseHeader Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `responsive` | boolean | `true` | Enable responsive dropdown mode |
| `responsiveBreakpoint` | number | `968` | Screen width breakpoint for responsive mode |
| `settingsPosition` | string | `'bottom-right'` | Position of dropdown: 'bottom-left', 'bottom-right', 'top-left', 'top-right' |
| `className` | string | `''` | Additional CSS classes |

#### ResponsivePageSettings Props (Advanced)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `buttonText` | string | `'Page Settings'` | Text displayed on trigger button |
| `showIcon` | boolean | `true` | Show settings icon on trigger button |
| `buttonVariant` | string | `'default'` | Button style: 'default', 'compact', 'icon-only' |
| `alwaysShowLabels` | boolean | `true` | Always show menu item labels |
| `position` | string | `'bottom-right'` | Dropdown position |

## Responsive Behavior

The component automatically switches to dropdown mode when:

1. Screen width is less than the `responsiveBreakpoint` (default 968px)
2. Browser zoom level exceeds 125%
3. Device pixel ratio indicates a high-DPI display

## Styling

The component uses CSS variables for theming:

```css
--card-background: Background color
--text-primary: Primary text color
--text-secondary: Secondary text color
--border-color: Border color
--hover-background: Hover state background
--hover-border: Hover state border
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- ARIA attributes for screen readers
- Keyboard navigation support
- Focus management
- Touch-friendly tap targets (minimum 44x44px)