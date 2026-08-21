# TeamFlow

TeamFlow is a full-stack cloud work review and delivery workspace for collaborative teams. It supports workspace roles, project-specific teams, task ownership, file/code-link submissions, owner/admin approval, change requests, delivery tracking, comments, notifications, workload insights, deadlines, audit logs, email invites, password resets, and dependency/blocker tracking.

The app starts from scratch. There is no seed data required: a user registers, gets a workspace, creates projects, invites teammates, adds project members, assigns work, submits files or code links for review, and all data is saved in MongoDB.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router |
| State/Data | TanStack Query, Zustand, Axios |
| UI | Lucide React, Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcrypt password hashing |
| Realtime | Socket.io |
| Security | Helmet, CORS, rate limiting, backend RBAC |
| Validation | Zod |
| Testing | Vitest |

## Current Features

- Register, login, logout, forgot password and reset password
- Password hashing with bcrypt
- JWT protected routes
- Workspace auto-created after registration
- Multiple workspaces per user
- Workspace roles: Owner, Admin, Member, Viewer
- Backend-enforced role restrictions
- Team & invites page
- Email invite flow for non-registered users
- Email notification when a registered user is added or role is updated
- Pending invite cancellation
- Project creation inside selected workspace
- Project-specific members
- Task assignment only to members of that project
- Task create, edit, reassign and delete
- Task title, description, status, priority, labels, due date, effort and attachment URL metadata
- Assigned task owner controls task progress movement
- Owner/Admin can edit task details and dependencies
- Task owner submits work for review with file/code links
- Owner/Admin approval flow: approve, request changes or reject
- Approved submissions automatically mark the task Done
- Review inbox inside each project
- Delivery room for approved versions and final deliverables
- Version history for submitted work
- Comments and @mention-style notifications
- Unread notification count
- Project workload page
- Dashboard summary based on the logged-in user's assigned work
- Calendar for project and assigned task deadlines
- Dependency/blocker tracking
- Circular dependency prevention
- Blocked tasks cannot move forward until dependencies are done
- Critical path and bottleneck analysis
- Audit log with filters
- Profile and member profile pages
- Account deletion flow

## App Flow

1. Register a user account.
2. TeamFlow creates the first workspace and makes the user Owner.
3. Create projects inside the selected workspace.
4. Invite people from Team & invites.
5. Add workspace members into a specific project.
6. Create tasks in that project.
7. Assign tasks to project members.
8. Assigned members submit work with file/code links.
9. Owner/Admin reviews submissions and approves, rejects or requests changes.
10. Approved submissions appear in Delivery.
11. Use comments, mentions, due dates, priorities, dependencies, Workload, Calendar, Notifications and Audit for tracking.

Important distinction:

```text
Workspace members = everyone available in the workspace/team.
Project members = only people added to a specific project.
Task owners = selected from project members only.
```

## Project Structure

```text
TeamFlow/
  client/
    src/
      components/
      hooks/
      lib/
      pages/
      store/
    package.json
  server/
    src/
      middleware/
      models/
      routes/
      services/
      utils/
    tests/
    package.json
  .env.example
  README.md
```

## MongoDB Storage

Local development uses:

```env
MONGO_URI=mongodb://127.0.0.1:27017/teamflow
```

Open MongoDB Compass with:

```text
mongodb://127.0.0.1:27017
```

Then select the `teamflow` database.

Main collections:

```text
users
workspaces
projects
tasks
comments
submissions
notifications
activitylogs
invites
tokens
```

For production, use MongoDB Atlas in `MONGO_URI`. Production data will save in Atlas instead of local MongoDB.

## Environment Setup

Copy `.env.example` to `.env`.

Windows PowerShell:

```powershell
copy .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Local `.env` example:

```env
MONGO_URI=mongodb://127.0.0.1:27017/teamflow
JWT_SECRET=change-this-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
PORT=5000
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
MAIL_FROM=TeamFlow <your-email@gmail.com>

STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=teamflow-uploads

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-teamflow-bucket
AWS_S3_PUBLIC_BASE_URL=
```

`CLIENT_URL` controls invite and reset-password links. Locally it is `http://localhost:5173`. After Vercel deployment, set it to your deployed frontend URL.

## Install And Run

Install dependencies from the root:

```bash
npm install
```

Run frontend and backend together:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5000
```

If npm workspace commands are not working on your system, run separately:

```powershell
cd "C:\Users\AKSHITA SACHDEVA\Desktop\TeamFlow"
.\node_modules\.bin\tsx.cmd watch server/src/index.ts
```

In another terminal:

```powershell
cd "C:\Users\AKSHITA SACHDEVA\Desktop\TeamFlow\client"
..\node_modules\.bin\vite.cmd
```

## Email Setup

TeamFlow sends emails for:

- Workspace invites
- Registered-user added notifications
- Role update notifications
- Password reset links

For Gmail:

1. Turn on 2-Step Verification in Google Account.
2. Create a Gmail App Password.
3. Put that app password in `SMTP_PASS`.
4. Use the same Gmail address in `SMTP_USER` and `MAIL_FROM`.

Example:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
MAIL_FROM=TeamFlow <your-email@gmail.com>
```

For production deliverability, a verified domain with SPF, DKIM and DMARC is recommended. Gmail SMTP can work for demos but may send new app emails to spam.

## Supabase Storage Upload Setup

MongoDB is the primary database. Supabase Storage is used only for uploaded files. TeamFlow stores users, workspaces, projects, tasks, submissions, reviews, comments, notifications and audit logs in MongoDB. For files, MongoDB stores metadata such as file name, URL, task, submission version and review status.

Supabase values go in backend `.env`:

```env
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=teamflow-uploads
```

Supabase setup:

1. Create a Supabase project.
2. Open Storage.
3. Create a bucket named `teamflow-uploads`.
4. For simple demos, make the bucket public so approved delivery links open directly.
5. Open Project Settings > API.
6. Copy Project URL into `SUPABASE_URL`.
7. Copy `service_role` key into `SUPABASE_SERVICE_ROLE_KEY`.

Keep `SUPABASE_SERVICE_ROLE_KEY` only on the backend. Never expose it in frontend `VITE_` variables.

Optional AWS S3 alternative:

```env
STORAGE_PROVIDER=aws
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-teamflow-bucket
AWS_S3_PUBLIC_BASE_URL=
```

For private production files, use signed download URLs. For demo/public uploads, a public Supabase bucket is the simplest setup.

## Roles

| Role | Access |
| --- | --- |
| Owner | Full workspace control, manage settings, roles, members, projects, reviews and delivery |
| Admin | Manage team/projects/task details, review submissions and approve delivery, except owner-only danger settings |
| Member | Collaborate in accessible projects, comment, update assigned progress and submit work for review |
| Viewer | Read-only access to project progress, comments, approved delivery and activity |

Progress rule:

```text
Only the assigned task owner can move normal task progress and submit work.
Owner/Admin can edit task details and assignment.
Done is set after a submission is approved, not directly from the task dropdown.
```

Dependency rule:

```text
A task with unfinished dependencies is blocked.
Blocked tasks cannot move to In Progress, In Review or Done until dependency tasks are Done.
```

## API Overview

Auth:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/logout
DELETE /api/auth/me
```

Workspaces:

```text
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:id
PATCH  /api/workspaces/:id
POST   /api/workspaces/:id/members
DELETE /api/workspaces/:id/members/:userId
GET    /api/workspaces/:id/invites
DELETE /api/workspaces/:id/invites/:inviteId
POST   /api/workspaces/invites/accept
GET    /api/workspaces/:id/members/:userId/profile
GET    /api/workspaces/:id/my-summary
GET    /api/workspaces/:id/activity
```

Projects:

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/members
DELETE /api/projects/:id/members/:userId
GET    /api/projects/:id/workload
GET    /api/projects/:id/dependency-analysis
GET    /api/projects/:id/activity
GET    /api/projects/:id/submissions
```

Tasks:

```text
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/:id/dependencies
DELETE /api/tasks/:id/dependencies/:dependencyId
GET    /api/tasks/:id/comments
POST   /api/tasks/:id/comments
GET    /api/tasks/:id/submissions
POST   /api/tasks/:id/submissions
PATCH  /api/tasks/:id/submissions/:submissionId/review
```

Notifications:

```text
GET   /api/notifications
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
GET   /api/notifications/unread-count
```

## Testing

```bash
npm test
```

Current tests cover RBAC hierarchy, dependency graph cycle validation, invite cancellation, viewer restrictions, notifications, task assignment, comments, submission review and approved delivery flow.

Manual checks before deployment:

```powershell
.\node_modules\.bin\tsc.cmd -p client\tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p server\tsconfig.json --noEmit
cd server
..\node_modules\.bin\vitest.cmd run
```

## Deployment

Recommended setup:

- Frontend: Vercel
- Backend: Render, Railway, Fly.io, or another Node host
- Database: MongoDB Atlas

Frontend environment variables:

```env
VITE_API_URL=https://your-backend-url/api
VITE_SOCKET_URL=https://your-backend-url
```

Backend environment variables:

```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=long-random-production-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-vercel-app.vercel.app
PORT=5000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
MAIL_FROM=TeamFlow <your-email@gmail.com>
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=teamflow-uploads
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-teamflow-bucket
AWS_S3_PUBLIC_BASE_URL=
```

After deployment:

- Set `CLIENT_URL` to the Vercel frontend URL.
- Set `VITE_API_URL` and `VITE_SOCKET_URL` to the deployed backend URL.
- Use MongoDB Atlas for production data.
- Restart/redeploy both frontend and backend after env changes.

## GitHub Push

```bash
git init
git add .
git commit -m "Build TeamFlow cloud delivery review workspace"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/teamflow.git
git push -u origin main
```

## Resume Bullet

Built TeamFlow, a full-stack cloud work review and delivery platform using React, TypeScript, Node.js, Express, MongoDB, Mongoose, JWT auth, bcrypt password hashing, backend RBAC, project-specific teams, submission review/approval workflows, delivery tracking, Socket.io realtime updates, SMTP email invites/password resets, workload analytics, audit logs, and graph-based task dependency validation.
