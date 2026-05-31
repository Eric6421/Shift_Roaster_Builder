# Shift Roaster Builder

A web app for managers to build and manage a weekly staff schedule for a small team: add employees, assign shifts, view a weekly grid, detect conflicts, and see hours per person.

---

### Folder structure (MVC)

```

src/
├── models/           # Types & domain shapes (no React)
│   ├── index.ts
│   └── types.ts      # Employee, Shift, SHIFT_EARLIEST/LATEST_TIME,
│                     # conflict types, WEEK_DAY_OPTIONS, ROLE_OPTIONS
├── controllers/      # Hooks, context, business logic
│   ├── index.ts
│   ├── AppProvider.tsx
│   ├── rosterExport.ts          # CSV generation & download
│   └── useRosterController.ts   # CRUD, validation, weekly hours,
│                                # unique names, shift time rules
├── views/            # Presentational React components
│   ├── App.tsx                  # Main app (tabs: roster + employees)
│   ├── EmployeeManager.tsx      # Add/edit/remove employees
│   ├── RosterGrid.tsx           # Grid, modals, drag-and-drop, Export CSV
│   ├── SummaryPanel.tsx         # Weekly hours summary per employee
│   └── components/
│       └── AppShell.tsx
├── main.tsx          # Entry: providers + mount (imports @/views/App)
└── index.css         # Tailwind directives
```

> **Note:** `src/App.tsx` also exists but is unused. The entry point mounts `@/views/App` from `main.tsx`.
