---
description: Create a UI Component with shadcn/ui integration
argument-hint: Component name | Component type (button, card, form, etc.)
---

## Context

Parse $ARGUMENTS to get the following values:
- [name]: Component name from $ARGUMENTS, converted to PascalCase
- [type]: Component type from $ARGUMENTS (button, input, card, dialog, form, table, etc.)
- [summary]: Component description from $ARGUMENTS

## Task

Make a single UI component according to [name], [type] and [summary] provided in the frontend directory following these guidelines:

- Create the component file in `frontend/src/components/ui`
- Use a functional component with the name in PascalCase
- Check if this component type has a shadcn/ui equivalent
- If shadcn equivalent exists, extend the shadcn component instead of building from scratch
- Use TypeScript with proper interface definitions
- Follow modern React patterns with hooks where needed

## shadcn/ui Integration

If the component type matches a shadcn component:
1. First check if `frontend/src/components/ui/[type].tsx` already exists
2. If not, use context 7 to automatically install the shadcn component:
   ```
   npx shadcn-ui@latest add [type] --cwd=frontend
   ```
3. Import the component from `@/components/ui/[type]`
4. Extend the shadcn component with additional props and functionality
5. Use `cn()` utility for className merging
6. Maintain shadcn's design system and accessibility features

Common shadcn mappings:
- button → @/components/ui/button
- input → @/components/ui/input
- card → @/components/ui/card
- dialog → @/components/ui/dialog
- form → @/components/ui/form
- table → @/components/ui/table

## Variants

Add the following variants for the component using Tailwind classes:
1. size: small, medium, large
2. variant: primary, secondary, outline, ghost
3. state: default, loading, disabled
4. theme: light, dark (use CSS variables)

## Output Structure

Create in `frontend/src/components/ui/[ComponentName].tsx` with:
- TypeScript interface for props
- Functional component with forwardRef if needed
- Proper exports (named and default)
- JSDoc comments for prop documentation