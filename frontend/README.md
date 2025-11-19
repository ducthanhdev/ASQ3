# ASQ3 Frontend - Vite + React + TypeScript + Tailwind CSS + shadcn-ui

Frontend application for ASQ3 Assessment System built with Vite, React, TypeScript, Tailwind CSS, and shadcn-ui.

## Tech Stack

- **Vite** - Next generation frontend tooling
- **React 18** - UI library
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn-ui** - Re-usable components built with Radix UI and Tailwind CSS
- **Axios** - HTTP client for API requests

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn or pnpm

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the result.

## Project Structure

```
frontend/
├── src/
│   ├── pages/              # Page components
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Children.tsx
│   │   └── Questionnaire.tsx
│   ├── components/         # React components
│   │   └── ui/            # shadcn-ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       └── card.tsx
│   ├── lib/               # Utility functions
│   │   ├── utils.ts       # Utility functions (cn helper)
│   │   └── api-client.ts  # Axios client configuration
│   ├── App.tsx            # Main App component with routing
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles with Tailwind
├── public/                # Static assets
├── components.json        # shadcn-ui configuration
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Adding shadcn-ui Components

To add more shadcn-ui components, use the CLI:

```bash
npx shadcn-ui@latest add [component-name]
```

For example:
```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
```

## API Client

The API client is configured in `src/lib/api-client.ts` and automatically:
- Adds authentication token from localStorage to requests
- Handles 401 errors by redirecting to login
- Uses the `VITE_API_URL` environment variable

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
```

Note: In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client.

## Styling

This project uses Tailwind CSS with shadcn-ui's design system. The theme is configured in:
- `tailwind.config.ts` - Tailwind configuration
- `src/index.css` - CSS variables for theming

## Path Aliases

The project uses path aliases for cleaner imports:

```typescript
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'
```

## Learn More

- [Vite Documentation](https://vite.dev)
- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn-ui Documentation](https://ui.shadcn.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
