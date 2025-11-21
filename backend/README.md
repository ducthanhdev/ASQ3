# ASQ3 Backend API

Production-ready NestJS backend với JWT authentication (access + refresh token).

## Quick Start

```bash
# Install
npm install

# Setup database (đã làm rồi)
npx prisma db push
npm run prisma:seed

# Start
npm run start:dev
```

## Features

### Authentication
- ✅ Register/Login với JWT
- ✅ Access token (15m) + Refresh token (7d)
- ✅ Token versioning (revoke all tokens on logout)
- ✅ Rate limiting (5 requests/minute)
- ✅ Helmet security headers
- ✅ CORS với credentials
- ✅ bcrypt password hashing

### Endpoints

#### Auth
- `POST /auth/register` - Đăng ký user mới
- `POST /auth/login` - Đăng nhập
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Đăng xuất (protected)

#### Children
- `GET /children` - Danh sách trẻ
- `GET /children/:id` - Chi tiết trẻ

#### Questionnaires
- `GET /questionnaires` - Danh sách bảng câu hỏi
- `GET /questionnaires/:id` - Chi tiết bảng câu hỏi
- `GET /questionnaires/:id/version/latest` - Version mới nhất

#### Assessments
- `POST /assessments` - Tạo bài đánh giá
- `GET /assessments/:id` - Kết quả đánh giá

## Demo Accounts

Sau khi seed:
- **Parent**: `parent` / `123456`
- **Admin**: `admin` / `admin123`

## Environment Variables

```env
DATABASE_URL="mysql://user:password@host:3306/database"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
PORT=3000
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

Response:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 900,
  "user": {
    "id": 1,
    "username": "newuser",
    "email": "user@example.com",
    "role": "PARENT"
  }
}
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

### Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

### Protected Endpoint
```bash
curl http://localhost:3000/children \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Project Structure

```
src/
├── auth/                  # Authentication module
│   ├── dto/              # Login, Register, RefreshToken DTOs
│   ├── guards/           # JwtAuthGuard
│   ├── strategies/       # JWT Strategy
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
│
├── children/             # Children management
├── questionnaire/        # Questionnaires
├── assessments/          # Assessments
├── prisma/              # Prisma client service
├── app.module.ts
└── main.ts
```

## Database Schema

- **User**: id, username, email, passwordHash, role, tokenVersion, refreshToken, lastLoginAt
- **Child**: id, parentId, fullName, birthDate, prematureWeeks
- **Questionnaire**: id, code, title, minMonth, maxMonth, language
- **QuestionnaireVersion**: id, questionnaireId, version, structureJson
- **Assessment**: id, childId, questionnaireVersionId, answersJson, scoresJson, summaryResultJson
- **File**: id, uploaderId, originalName, storagePath
- **OcrResult**: id, fileId, questionnaireVersionId, parsedAnswersJson
- **OcrTemplate**: id, questionnaireId, boxesJson
- **FollowUp**: id, assessmentId, actionType, notes, status

## Scripts

```bash
npm run start:dev         # Development
npm run start:prod        # Production
npm run build             # Build
npm run prisma:generate   # Generate Prisma Client
npm run prisma:migrate    # Run migrations
npm run prisma:seed       # Seed database
npm run prisma:studio     # Open Prisma Studio
npm run lint              # Lint
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

### Token Versioning
- `tokenVersion` increments on logout
- All existing tokens become invalid
- User must login again
- Prevents token reuse after logout

## Troubleshooting

### TypeScript Errors in IDE
If you see red errors in `auth.service.ts` but code compiles:
1. Press `Ctrl+Shift+P` in VS Code
2. Type: `TypeScript: Restart TS Server`
3. Press Enter

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run start:dev
```

### Database Connection Error
- Check DATABASE_URL in `.env`
- Verify database credentials
- Test connection: `npx prisma db pull`

## Development

Code style:
- Short methods (< 20 lines)
- Clear naming
- No unnecessary abstractions
- Simple error handling (throw exceptions)
- No verbose comments
- Follow NestJS conventions

## License

Private project

