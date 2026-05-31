```markdown
# dress-roomshow Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `dress-roomshow` TypeScript codebase. You'll learn how to structure files, write and organize code, follow commit conventions, and contribute effectively—especially when enhancing UI components.

## Coding Conventions

- **File Naming:**  
  Use **PascalCase** for all file names.  
  _Example:_  
  ```
  AppLayout.tsx
  SummaryCard.tsx
  ```

- **Import Style:**  
  Use **relative imports** for referencing modules within the project.  
  _Example:_  
  ```typescript
  import { SummaryCard } from '../shared/SummaryCard';
  ```

- **Export Style:**  
  Use **named exports** for all modules.  
  _Example:_  
  ```typescript
  export const AppLayout = () => { /* ... */ };
  ```

- **Commit Messages:**  
  Follow **conventional commit** style with prefixes like `feat` and `fix`.  
  _Example:_  
  ```
  feat: add accessibility support to AppLayout
  fix: correct summary card rendering on mobile
  ```

## Workflows

### UI Component Enhancement
**Trigger:** When someone wants to improve or add features to a shared or layout UI component.  
**Command:** `/enhance-ui-component`

1. **Identify the target UI component file**  
   Locate the relevant file, such as:
   - `src/components/layout/AppLayout.tsx`
   - `src/components/shared/SummaryCard.tsx`

2. **Modify the component**  
   Add or refine features (e.g., navigation, accessibility, summary cards).  
   _Example:_  
   ```typescript
   // Adding an aria-label for accessibility
   export const AppLayout = () => (
     <div aria-label="Main Application Layout">
       {/* ... */}
     </div>
   );
   ```

3. **Commit changes with a descriptive message**  
   Use the conventional commit format:
   ```
   feat: improve navigation accessibility in AppLayout
   ```

## Testing Patterns

- **Test File Naming:**  
  Test files follow the `*.test.*` pattern.  
  _Example:_  
  ```
  AppLayout.test.tsx
  SummaryCard.test.tsx
  ```

- **Testing Framework:**  
  The specific testing framework is unknown, but tests are colocated with components and named accordingly.

## Commands

| Command                | Purpose                                                      |
|------------------------|--------------------------------------------------------------|
| /enhance-ui-component  | Start the UI component enhancement workflow                  |
```
