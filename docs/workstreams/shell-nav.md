# Workstream: Shell & Navigation

## Branch
`feat/wt-shell-nav`

## Ownership
- App shell layout
- Role-aware navigation
- Route guards
- Unauthorized and not-found views
- Shared profile entry point

## First Commit Goals
1. Normalize route keys and route rendering entry in `frontend/src/App.jsx`.
2. Ensure each role sees only its allowed pages.
3. Ensure blocked routes render unauthorized page.
4. Ensure unknown routes render not-found page.

## Out of Scope
- Role page business forms and CRUD details
- Backend endpoint behavior changes beyond route contract needs
