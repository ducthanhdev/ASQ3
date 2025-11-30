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

## Application Workflows

### 1. Authentication Flow

```
User truy cập app
    ↓
Chưa đăng nhập? → Redirect to /login
    ↓
Login/Register
    ↓
JWT token được lưu trong localStorage
    ↓
Auto redirect to Dashboard (/)
    ↓
Mỗi API request tự động thêm JWT token
    ↓
Token hết hạn? → Auto refresh token
    ↓
Refresh token hết hạn? → Redirect to /login
```

**Routes:**
- `/login` - Đăng nhập
- `/register` - Đăng ký
- `/` - Dashboard (protected)

**Features:**
- Auto refresh token khi 401
- Role-based access control (PARENT, SPECIALIST, ADMIN)
- Protected routes với `ProtectedRoute` component

---

### 2. Child Management Flow

#### 2.1. Tạo Child Mới

```
Dashboard → My Children → "Thêm trẻ mới"
    ↓
/children/new
    ↓
Nhập thông tin: tên, ngày sinh, giới tính, tuần sinh non, người giám hộ
    ↓
Submit → POST /api/children
    ↓
Redirect to /children/:id (ChildDetail)
```

#### 2.2. Xem Danh Sách Children

```
Dashboard → "Trẻ của tôi" hoặc "Tất cả trẻ"
    ↓
/my-children (PARENT chỉ thấy trẻ của mình)
/children (SPECIALIST/ADMIN thấy tất cả)
    ↓
Hiển thị danh sách với: tên, tuổi, số lượng assessments
    ↓
Click vào child → /children/:id
```

#### 2.3. Xem Chi Tiết Child

```
/children/:id
    ↓
Hiển thị:
  - Thông tin cá nhân
  - Danh sách assessments (theo thời gian)
  - Nút "Tạo đánh giá mới"
    ↓
Click "Tạo đánh giá mới" → Chọn phương thức:
  - Online Assessment → /children/:id/new-assessment
  - Scan Assessment → /scan-assessment?childId=:id
```

#### 2.4. Chỉnh Sửa Child

```
/children/:id → "Chỉnh sửa"
    ↓
/children/:id/edit
    ↓
Cập nhật thông tin → PUT /api/children/:id
    ↓
Redirect to /children/:id
```

---

### 3. Assessment Flow

#### 3.1. Online Assessment Flow

```
Từ ChildDetail → "Tạo đánh giá mới" → Chọn "Online"
    ↓
/children/:id/new-assessment
    ↓
Auto-select questionnaire dựa trên tuổi của trẻ
    ↓
Hiển thị form với:
  - 5 domains (Communication, Gross Motor, Fine Motor, Problem Solving, Personal-Social)
  - Mỗi domain có 6 câu hỏi (Y/S/N)
  - Overall questions (8 câu)
    ↓
User điền câu trả lời
    ↓
Submit → POST /api/assessments
    ↓
Backend tự động tính điểm và kết luận
    ↓
Redirect to /assessment/:id (AssessmentResult)
```

**Features:**
- Auto-select questionnaire phù hợp với tuổi
- Real-time validation
- Tự động tính điểm và kết luận (NORMAL/MONITOR/REFER)

#### 3.2. Scan Assessment Flow

```
Từ ChildDetail → "Tạo đánh giá mới" → Chọn "Scan"
    ↓
/scan-assessment?childId=:id
    ↓
User chọn questionnaire version
    ↓
Upload file ảnh/PDF (có thể upload nhiều file)
    ↓
Click "Nhận dạng" → POST /api/ocr/recognize
    ↓
OCR Service xử lý:
  - Extract text từ ảnh/PDF
  - Lưu file vào database (fileData)
  - Tạo OcrResult record
    ↓
Sau khi nhận dạng xong → Click "Tạo đánh giá"
    ↓
POST /api/ocr/create-assessment
    ↓
Backend tự động:
  - Tìm các OCR results liên quan (trong 1 phút trước đó)
  - Parse tất cả pages từ các OCR results
  - Gọi OCR service để extract answers
  - Tính điểm và kết luận
  - Tạo Assessment với method="SCAN"
    ↓
Redirect to /assessment/:id (AssessmentResult)
```

**Features:**
- Upload nhiều ảnh/PDF cùng lúc
- Tự động tìm và parse các OCR results liên quan
- Lưu file scan vào database để xem lại sau
- Tự động extract answers từ OCR text

#### 3.3. Xem Kết Quả Assessment

```
/assessment/:id
    ↓
Hiển thị:
  - Thông tin child và questionnaire
  - Domain scores với charts
  - Final conclusion (NORMAL/MONITOR/REFER)
  - Chi tiết từng domain
  - Danh sách câu trả lời
    ↓
Nếu method="SCAN":
  - Nút "Xem lại các bản scan"
  - Modal hiển thị danh sách scan files
  - Có thể xem từng file hoặc tải tất cả
```

**Features:**
- Visual charts cho domain scores
- Color coding: NORMAL (green), MONITOR (yellow), REFER (red)
- Xem và tải scan files nếu là scan assessment
- Print-friendly layout

---

### 4. Questionnaire Management Flow (Admin Only)

#### 4.1. Tạo Questionnaire Mới

```
Admin Dashboard → Questionnaires → "Tạo mới"
    ↓
/admin/questionnaires/create
    ↓
Nhập metadata: code, title, minMonth, maxMonth, language
    ↓
Thêm 5 domains:
  - Communication
  - Gross Motor
  - Fine Motor
  - Problem Solving
  - Personal-Social
    ↓
Mỗi domain: 6 câu hỏi + cutoff score
    ↓
Thêm overall questions (8 câu)
    ↓
Submit → POST /api/questionnaires/create-manual
    ↓
Tự động tạo version v1.0
    ↓
Redirect to /admin/questionnaires/:id
```

#### 4.2. Import Questionnaire từ JSON

```
Admin Dashboard → Questionnaires → "Import JSON"
    ↓
/admin/questionnaires/import
    ↓
Upload file JSON hoặc paste JSON content
    ↓
Format được hỗ trợ:
  - { code, title, minMonth, maxMonth, language, version, structure }
  - { code, title, minMonth, maxMonth, language, version, structureJson }
  - Legacy format với metadata + domains
    ↓
Click "Import Questionnaire"
    ↓
POST /api/questionnaires/import-json
    ↓
Backend validate và tạo questionnaire + version
    ↓
Redirect to /admin/questionnaires
```

#### 4.3. Quản Lý Questionnaire

```
/admin/questionnaires
    ↓
Danh sách questionnaires
    ↓
Click vào questionnaire → /admin/questionnaires/:id
    ↓
Xem chi tiết:
  - Metadata
  - Danh sách versions
  - Structure (domains, questions, rules)
    ↓
Actions:
  - "Chỉnh sửa" → /admin/questionnaires/:id/edit
  - "Xem versions" → /admin/questionnaires/:id/versions
  - "Tạo version mới"
```

**Features:**
- Version management
- Edit questionnaire structure
- View usage statistics

---

### 5. Admin Dashboard Flow

```
/admin
    ↓
Admin Dashboard hiển thị:
  - Tổng số users, children, questionnaires, assessments
  - Recent activities
  - Quick links
    ↓
Menu:
  - Users → /admin/users (Quản lý users)
  - Children → /admin/children (Quản lý tất cả children)
  - Questionnaires → /admin/questionnaires
  - Assessments → /admin/assessments (Xem tất cả assessments)
```

**Features:**
- Role-based access (chỉ ADMIN)
- Statistics và analytics
- Bulk operations

---

### 6. User Flow Diagram

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Dashboard  │
└──────┬──────┘
       │
       ├──► My Children ──► Child Detail ──► New Assessment
       │                                              │
       │                                              ├──► Online Assessment ──► Result
       │                                              │
       │                                              └──► Scan Assessment ──► Result
       │
       ├──► All Children (SPECIALIST/ADMIN)
       │
       └──► Admin Panel (ADMIN only)
                │
                ├──► Users Management
                ├──► Children Management
                ├──► Questionnaires
                │      ├──► Create Manual
                │      ├──► Import JSON
                │      └──► Manage Versions
                └──► Assessments Management
```

---

### 7. Data Flow

#### 7.1. Assessment Creation Flow

```
Frontend Form/Scan
    ↓
POST /api/assessments hoặc /api/ocr/create-assessment
    ↓
Backend Service
    ↓
├──► Validate data
├──► Calculate scores (nếu chưa có)
├──► Classify results (NORMAL/MONITOR/REFER)
└──► Save to database
    ↓
Return assessment với scoresJson và finalConclusion
    ↓
Frontend redirect to AssessmentResult
```

#### 7.2. OCR Processing Flow

```
Frontend upload file
    ↓
POST /api/ocr/recognize
    ↓
Backend OcrService
    ↓
├──► Save file to database (fileData column)
├──► Send file to OCR Service (FastAPI)
└──► Save OcrResult to database
    ↓
OCR Service (Python/FastAPI)
    ↓
├──► Extract text từ ảnh/PDF
├──► Return pages với text và confidence
└──► Backend lưu vào OcrResult.pagesJson
    ↓
User click "Tạo đánh giá"
    ↓
POST /api/ocr/create-assessment
    ↓
Backend:
├──► Tìm related OCR results (trong 1 phút trước)
├──► Combine tất cả pages
├──► Call OCR Service /parse endpoint
├──► Extract answers từ parsed text
├──► Calculate scores
└──► Create Assessment
```

---

### 8. Key User Roles

#### PARENT
- Xem và quản lý children của mình
- Tạo assessments (online hoặc scan)
- Xem kết quả assessments
- Không thể xem children của người khác

#### SPECIALIST
- Xem tất cả children
- Xem tất cả assessments
- Tạo assessments cho bất kỳ child nào
- Không thể quản lý questionnaires

#### ADMIN
- Tất cả quyền của SPECIALIST
- Quản lý users
- Quản lý questionnaires (create, edit, import)
- Quản lý versions
- Xem statistics và reports

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
