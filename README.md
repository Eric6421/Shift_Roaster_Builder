# Shift Roaster Builder
---

### Folder structure (MVC)

```
src/
├── models/           # Types & domain shapes (no React)
│   ├── index.ts
│   └── roster.types.ts
├── controllers/      # Hooks, context, business logic
│   ├── index.ts
│   └── AppProvider.tsx
├── views/            # Presentational React components
│   ├── App.tsx
│   └── components/
│       └── AppShell.tsx
├── main.tsx          # Entry: providers + mount
└── index.css         # Tailwind directives
```
