# Shift Roaster Builder

A web app for managers to build and manage a weekly staff schedule for a small team: add employees, assign shifts, view a weekly grid, detect conflicts, and see hours per person.

---

### Folder structure (MVC)

```
docs/
└── screenshots/      # UI screenshots (.gitkeep placeholder)

src/
├── models/           # Types & domain shapes (no React)
│   ├── index.ts
│   └── types.ts
├── controllers/      # Hooks, context, business logic
│   ├── index.ts
│   ├── AppProvider.tsx
│   └── useRosterController.ts
├── views/            # Presentational React components
│   ├── App.tsx
│   ├── EmployeeManager.tsx
│   ├── RosterGrid.tsx
│   └── components/
│       └── AppShell.tsx
├── assets/           # Static images / icons
│   ├── hero.png
│   ├── react.svg
│   └── vite.svg
├── main.tsx          # Entry: providers + mount
└── index.css         # Tailwind directives
```
