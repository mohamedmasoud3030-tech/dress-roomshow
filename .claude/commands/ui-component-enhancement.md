---
name: ui-component-enhancement
description: Workflow command scaffold for ui-component-enhancement in dress-roomshow.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /ui-component-enhancement

Use this workflow when working on **ui-component-enhancement** in `dress-roomshow`.

## Goal

Enhancing or extending existing UI components, often for accessibility, responsiveness, or new features.

## Common Files

- `src/components/layout/AppLayout.tsx`
- `src/components/shared/SummaryCard.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Identify the target UI component file (e.g., layout or shared component).
- Modify the component to add or refine features (e.g., navigation, accessibility, summary cards).
- Commit changes with a descriptive message.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.