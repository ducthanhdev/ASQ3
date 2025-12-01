# ASQ3 Backend API

NestJS backend với JWT authentication, OCR integration, và Prisma ORM.

## Setup từ đầu

### 1. Clone repository

```bash
git clone <repository-url>
cd ASQ3/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup database

Tạo file `.env` trong thư mục `backend/`:

```env
DATABASE_URL="mysql://user:password@host:3306/database"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"
JWT_REFRESH_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
PORT=3000
OCR_SERVICE_URL="http://localhost:8000"
DEFAULT_PASSWORD="123456"
```

### 4. Database migration

```bash
# Generate Prisma Client
npm run prisma:generate

# Apply schema to database
npx prisma db push

# Chạy các migration SQL thủ công (nếu cần)
# Kết nối vào database và chạy các file SQL trong thư mục prisma/migrations/
# Ví dụ:
# mysql -u user -p database < prisma/migrations/add_min_day_max_day.sql
# mysql -u user -p database < prisma/migrations/add_file_data_to_file.sql
# mysql -u user -p database < prisma/migrations/add_child_id_to_file.sql
# mysql -u user -p database < prisma/migrations/add_review_workflow.sql
# mysql -u user -p database < prisma/migrations/add_full_asq3_fields.sql

# Seed database (tạo demo accounts và data)
npm run prisma:seed
```

### 5. Start development server

```bash
npm run start:dev
```

Server chạy tại `http://localhost:3000`

## Features

### Authentication
- Register/Login với JWT
- Access token (15m) + Refresh token (7d)
- Token versioning (revoke all tokens on logout)
- Rate limiting (5 requests/minute)
- Helmet security headers
- CORS với credentials
- bcrypt password hashing

### OCR Integration
- Upload và recognize files (images/PDFs)
- Auto-parse OCR results
- Store files in database (BLOB)
- View/download scan files

### Endpoints

#### Auth
- `POST /auth/register` - Đăng ký user mới
- `POST /auth/login` - Đăng nhập
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Đăng xuất (protected)

#### Children
- `GET /children` - Danh sách trẻ (SPECIALIST, ADMIN)
- `GET /children/my` - Danh sách trẻ của parent
- `GET /children/:id` - Chi tiết trẻ
- `GET /children/:id/assessments` - Assessments của trẻ
- `POST /children` - Tạo trẻ mới
- `PUT /children/:id` - Cập nhật trẻ
- `DELETE /children/:id` - Xóa trẻ (ADMIN)

#### Questionnaires
- `GET /questionnaires` - Danh sách bảng câu hỏi
- `GET /questionnaires/:id` - Chi tiết bảng câu hỏi
- `GET /questionnaires/:id/version/latest` - Version mới nhất
- `GET /questionnaires/versions/:id` - Chi tiết version

#### Assessments
- `GET /assessments` - Danh sách assessments (SPECIALIST, ADMIN)
- `GET /assessments/my` - Assessments của parent
- `GET /assessments/:id` - Kết quả đánh giá
- `POST /assessments` - Tạo bài đánh giá
- `POST /assessments/online/submit` - Submit online assessment
- `PATCH /assessments/:id/review` - Review assessment (SPECIALIST, ADMIN)
- `PUT /assessments/:id` - Cập nhật assessment (SPECIALIST, ADMIN)
- `DELETE /assessments/:id` - Xóa assessment (ADMIN)

#### OCR
- `POST /api/ocr/recognize` - Upload và recognize file
- `POST /api/ocr/create-assessment` - Tạo assessment từ OCR result
- `GET /api/ocr/files/child/:childId` - Danh sách files của child
- `GET /api/ocr/files/assessment/:assessmentId` - Files của assessment
- `GET /api/ocr/files/:fileId` - Download/view file

#### Reports
- `GET /assessments/:id/report` - Export PDF report (SPECIALIST, ADMIN)

## Demo Accounts

Sau khi seed:
- **Parent**: `parent` / `123456`
- **Admin**: `admin` / `admin123`

## Environment Variables

```env
# Database
DATABASE_URL="mysql://user:password@host:3306/database"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
FRONTEND_URL="http://localhost:5173"
PORT=3000

# OCR Service
OCR_SERVICE_URL="http://localhost:8000"
```

## API Examples

### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "123456",
    "email": "user@example.com"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "parent",
    "password": "123456"
  }'
```

### Upload và OCR
```bash
curl -X POST http://localhost:3000/api/ocr/recognize \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@image.png" \
  -F "questionnaireVersionId=5" \
  -F "childId=1"
```

### Protected Endpoint
```bash
curl http://localhost:3000/children \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Project Structure

```
src/
├── auth/                  # Authentication module
│   ├── dto/              # Login, Register, RefreshToken DTOs
│   ├── guards/           # JwtAuthGuard, RolesGuard
│   ├── strategies/       # JWT Strategy
│   ├── decorators/       # Roles decorator
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
│
├── children/             # Children management
├── questionnaire/        # Questionnaires
├── assessments/          # Assessments
├── ocr/                  # OCR integration
│   ├── dto/             # RecognizeDto, CreateAssessmentFromOcrDto
│   ├── ocr.controller.ts
│   ├── ocr.service.ts
│   └── ocr.module.ts
├── reports/              # PDF reports
├── prisma/              # Prisma client service
├── common/              # Shared utilities
├── app.module.ts
└── main.ts
```

## Database Schema

- **User**: id, username, email, passwordHash, role, tokenVersion, refreshToken, lastLoginAt
- **Child**: id, parentId, fullName, birthDate, prematureWeeks, guardianName, guardianPhone
- **Questionnaire**: id, code, title, minMonth, minDay, maxMonth, maxDay, language
- **QuestionnaireVersion**: id, questionnaireId, version, structureJson
- **Assessment**: id, childId, questionnaireVersionId, answersJson, scoresJson, method, scanFileId
- **File**: id, uploaderId, childId, originalName, fileData (BLOB), mimeType, sizeBytes
- **OcrResult**: id, fileId, questionnaireVersionId, rawText, parsedAnswersJson, confidence, bboxJson
- **FollowUp**: id, assessmentId, actionType, notes, status

## Scripts

```bash
npm run start:dev         # Development server
npm run start:prod         # Production server
npm run build             # Build for production
npm run prisma:generate   # Generate Prisma Client
npm run prisma:migrate    # Run migrations
npm run prisma:seed       # Seed database
npm run prisma:studio     # Open Prisma Studio
npm run lint              # Lint code
npm run format            # Format code
```

## Security Notes

### Production Checklist
- [ ] Change `JWT_SECRET` to strong random string
- [ ] Change `JWT_REFRESH_SECRET` to different strong random string
- [ ] Use HTTPS in production
- [ ] Set proper `FRONTEND_URL`
- [ ] Review rate limiting settings
- [ ] Enable database SSL connection
- [ ] Set up proper CORS origins (not wildcard)
- [ ] Add request logging
- [ ] Set up error monitoring (Sentry)

### Token Flow
1. User login → Get access_token + refresh_token
2. Use access_token for API calls (valid 15m)
3. When access_token expires → Use refresh_token to get new tokens
4. Logout → Invalidates all tokens via tokenVersion increment

## Troubleshooting

### Port Already in Use
```bash
npx kill-port 3000
# Or use different port
PORT=3001 npm run start:dev
```

### Database Connection Error
- Check `DATABASE_URL` in `.env`
- Verify database credentials
- Test connection: `npx prisma db pull`

### Prisma Client Not Generated
```bash
npm run prisma:generate
```

### TypeScript Errors in IDE
1. Press `Ctrl+Shift+P` in VS Code
2. Type: `TypeScript: Restart TS Server`
3. Press Enter

## Development

Code style:
- Short methods (< 20 lines)
- Clear naming
- No unnecessary abstractions
- Simple error handling
- Follow NestJS conventions

## License

Private project
