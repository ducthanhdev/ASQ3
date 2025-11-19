# ASQ3 Frontend - Next.js + TypeScript + Tailwind CSS + shadcn-ui

Frontend application for ASQ3 Assessment System built with Next.js 14, TypeScript, Tailwind CSS, and shadcn-ui.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
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

2. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles with Tailwind
│   ├── login/             # Login page
│   ├── children/          # Children management page
│   └── questionnaire/     # Questionnaire page
├── components/            # React components
│   └── ui/               # shadcn-ui components
│       ├── button.tsx
│       ├── input.tsx
│       └── card.tsx
├── lib/                  # Utility functions
│   ├── utils.ts          # Utility functions (cn helper)
│   └── api-client.ts     # Axios client configuration
├── public/               # Static assets
└── components.json       # shadcn-ui configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
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

The API client is configured in `lib/api-client.ts` and automatically:
- Adds authentication token from localStorage to requests
- Handles 401 errors by redirecting to login
- Uses the `NEXT_PUBLIC_API_URL` environment variable

## Styling

This project uses Tailwind CSS with shadcn-ui's design system. The theme is configured in:
- `tailwind.config.ts` - Tailwind configuration
- `app/globals.css` - CSS variables for theming

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn-ui Documentation](https://ui.shadcn.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
