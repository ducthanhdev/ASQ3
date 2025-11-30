# ASQ3 Frontend

React frontend application cho hệ thống đánh giá ASQ-3, được xây dựng với Vite, React, TypeScript, Tailwind CSS, và shadcn-ui.

## Setup từ đầu

### 1. Clone repository

```bash
git clone <repository-url>
cd ASQ3/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Tạo file `.env` trong thư mục `frontend/`:

```env
VITE_API_URL=http://localhost:3000
```

**Lưu ý:** Trong Vite, các biến môi trường phải có prefix `VITE_` để được expose ra client.

### 4. Start development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

## Tech Stack

- **Vite** - Build tool và dev server
- **React 18** - UI library
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn-ui** - Re-usable components (Radix UI + Tailwind)
- **Axios** - HTTP client
- **Sonner** - Toast notifications
- **Lucide React** - Icons

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client configuration
│   │   └── client.ts     # Axios instance với interceptors
│   ├── assets/           # Static assets (images, fonts)
│   ├── components/       # React components
│   │   └── ui/          # shadcn-ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── ...
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx
│   ├── layouts/          # Layout components
│   │   └── MainLayout.tsx
│   ├── lib/              # Utility functions
│   │   └── utils.ts     # cn() helper và utilities
│   ├── pages/            # Page components
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Children.tsx
│   │   ├── ChildDetail.tsx
│   │   ├── ScanAssessment.tsx
│   │   ├── AssessmentResult.tsx
│   │   └── ...
│   ├── App.tsx           # Main App component
│   ├── routes.tsx        # Route definitions
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles với Tailwind
├── public/               # Static public assets
├── components.json       # shadcn-ui configuration
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json
```

## Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

## Features

### Authentication
- Login/Register với JWT
- Auto refresh token khi access token hết hạn
- Protected routes với role-based access
- Auto redirect to login khi unauthorized

### Pages
- **Home** - Dashboard
- **Login** - Đăng nhập/Đăng ký
- **Children** - Quản lý danh sách trẻ
- **ChildDetail** - Chi tiết trẻ và assessments
- **ScanAssessment** - Upload và OCR scan files
- **AssessmentResult** - Xem kết quả đánh giá
- **NewAssessment** - Tạo assessment mới (online)

### Components
- Reusable UI components từ shadcn-ui
- Responsive design với Tailwind CSS
- Toast notifications với Sonner
- Form validation

## Adding shadcn-ui Components

Để thêm components từ shadcn-ui:

```bash
npx shadcn-ui@latest add [component-name]
```

Ví dụ:
```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
```

## API Client

API client được cấu hình trong `src/api/client.ts`:

- Tự động thêm JWT token vào requests
- Auto refresh token khi 401
- Auto redirect to login khi refresh token hết hạn
- Sử dụng `VITE_API_URL` từ environment variables

**Usage:**
```typescript
import { api } from '@/api/client';

// GET request
const response = await api.get('/children');

// POST request
const response = await api.post('/assessments', data);
```

## Environment Variables

Tạo file `.env` trong thư mục `frontend/`:

```env
VITE_API_URL=http://localhost:3000
```

**Lưu ý:** 
- Biến môi trường phải có prefix `VITE_` để được expose
- Restart dev server sau khi thay đổi `.env`

## Path Aliases

Project sử dụng path aliases cho imports sạch hơn:

```typescript
import { Button } from '@/components/ui/button'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
```

Được cấu hình trong `tsconfig.json` và `vite.config.ts`.

## Styling

- **Tailwind CSS** - Utility-first CSS framework
- **shadcn-ui** - Component library với design system
- **CSS Variables** - Theming trong `src/index.css`

Customize theme trong `tailwind.config.ts` và `src/index.css`.

## Development

### Code Style
- TypeScript strict mode
- ESLint với React hooks rules
- Prettier formatting (nếu có)
- Functional components với hooks
- Clear component naming

### Best Practices
- Sử dụng TypeScript cho type safety
- Tách logic vào custom hooks khi cần
- Reuse components từ `components/ui/`
- Handle loading và error states
- Responsive design với Tailwind

## Build for Production

```bash
npm run build
```

Output sẽ ở trong thư mục `dist/`. Deploy thư mục này lên static hosting (Vercel, Netlify, etc.).

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173

# Or use different port
npm run dev -- --port 5174
```

### Module Not Found
```bash
# Clear cache và reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
1. Restart TypeScript server trong VS Code
2. Check `tsconfig.json` configuration
3. Ensure all dependencies are installed

### API Connection Issues
- Verify `VITE_API_URL` in `.env`
- Check backend server is running
- Check CORS settings in backend

## Learn More

- [Vite Documentation](https://vite.dev)
- [React Documentation](https://react.dev)
- [React Router Documentation](https://reactrouter.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn-ui Documentation](https://ui.shadcn.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## License

Private project
