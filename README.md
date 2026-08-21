# TeamFlow

TeamFlow is a cloud work review and delivery platform for teams that need more than a task board. It helps teams assign work, submit files, review changes, approve deliverables, track blockers, and keep final project delivery organized.

## Problem Statement

In many teams, work is assigned in one place, files are shared somewhere else, feedback happens in chat, and final approved deliverables are hard to identify later. This creates confusion around who owns the work, which version is final, what still needs review, and what is blocked.

TeamFlow solves this by combining task ownership, project-specific teams, cloud file submissions, review approval, delivery tracking, notifications, workload insights, and dependency visibility in one workspace.

## Core Use Case

1. A workspace owner creates a project.
2. Owner/admin adds the right project members.
3. Tasks are assigned to project members.
4. The assigned member submits work with files or links.
5. Owner/admin reviews the submission.
6. The reviewer approves, rejects, or requests changes.
7. Approved submissions become project deliverables.

MongoDB remains the primary database. Supabase Storage is used only for uploaded files.

## Key Features

- JWT authentication and bcrypt password hashing
- Forgot password and reset password flow
- Multiple workspaces per user
- Workspace roles: Owner, Admin, Member, Viewer
- Project-specific teams
- Backend-enforced role permissions
- Task creation, assignment, reassignment, editing and soft deletion
- Submit-for-review workflow
- Approval, rejection and change-request decisions
- Delivery room for approved submissions
- Supabase Storage upload support
- Manual file/link fallback when cloud upload is not configured
- Versioned submissions with review notes
- Comments and mentions
- In-app notifications with unread count
- Project dependency and blocker tracking
- Blocked-task movement restrictions
- Workload and deadline views
- Calendar notes and deadlines
- Audit activity views
- Responsive dashboard, profile and project flows

## Project Phases

### Phase 1: Foundation

- Register, login, logout
- MongoDB models for users, workspaces, projects and tasks
- Workspace creation after signup
- Protected routes and backend validation

### Phase 2: Collaboration

- Workspace roles
- Team invites
- Project-specific members
- Task assignment
- Comments and mentions
- Notifications

### Phase 3: Delivery Workflow

- Work submissions
- File/link attachments
- Review inbox
- Approve, reject, request changes
- Approved delivery room
- Submission version history

### Phase 4: Intelligence

- Dependency graph
- Blocker detection
- Workload view
- Dashboard summaries
- Deadlines and calendar
- Audit/activity tracking

### Phase 5: Cloud Storage

- Supabase Storage signed uploads
- MongoDB metadata persistence
- Manual link fallback

### Phase 6: Production Readiness

- RBAC tests
- Feature smoke tests
- Public README
- Deployment environment documentation
- Clean role and storage boundaries

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Routing/Data | React Router, TanStack Query, Axios |
| State | Zustand |
| UI | Lucide React, Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| File Storage | Supabase Storage |
| Auth | JWT, bcrypt |
| Realtime | Socket.io |
| Security | Helmet, CORS, rate limiting, backend RBAC |
| Validation | Zod |
| Testing | Vitest, Supertest, MongoDB Memory Server |

## Architecture

```text
React Client
  |
  | Axios + Socket.io
  v
Express API
  |
  | Mongoose
  v
MongoDB

Browser uploads files to Supabase Storage using signed upload URLs.
MongoDB stores file metadata, task relation, submission version and review state.
```

## Data Ownership

MongoDB stores:

```text
users
workspaces
projects
tasks
submissions
comments
notifications
activitylogs
invites
tokens
```

Supabase Storage stores:

```text
uploaded submission files only
```

## Roles

| Role | Access |
| --- | --- |
| Owner | Full workspace control, roles, members, projects, reviews and delivery |
| Admin | Manage team/projects/task details and review submissions |
| Member | Work on accessible projects, comment, update assigned progress and submit work |
| Viewer | Read-only access to progress, comments, delivery and activity |

## Important Rules

- Viewers cannot create projects or tasks.
- Only project members can be assigned project tasks.
- Members can submit only their assigned work.
- Done is set after approval, not directly from the task dropdown.
- Blocked tasks cannot move forward until dependencies are completed.
- Owner/admin can edit details and review submissions.

## Environment Variables

Create `.env` in the project root.

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
```

## Supabase Storage Setup

1. Create a Supabase project.
2. Open Storage.
3. Create a bucket named `teamflow-uploads`.
4. Keep the bucket private. TeamFlow opens files through short-lived signed links after checking project access.
5. Open Project Settings > API.
6. Copy Project URL to `SUPABASE_URL`.
7. Copy the `service_role` key to `SUPABASE_SERVICE_ROLE_KEY`.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend variables.

## Local Setup

Install dependencies:

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

## Main API Areas

- Auth and password reset
- Workspaces, roles and invites
- Projects and project-specific members
- Tasks, dependencies and comments
- Submissions and review decisions
- Signed file uploads
- Notifications and activity

## Testing

```bash
npm test
```

Tests cover RBAC hierarchy, dependency cycle validation, invite cancellation, viewer restrictions, notifications, task assignment, comments, submission review and approved delivery flow.

## Deployment

Recommended:

- Frontend: Vercel
- Backend: Render, Railway, Fly.io or similar Node host
- Database: MongoDB Atlas
- File storage: Supabase Storage

Frontend environment:

```env
VITE_API_URL=https://your-backend-url/api
VITE_SOCKET_URL=https://your-backend-url
```

Backend environment:

```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=long-random-production-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend-url.vercel.app
PORT=5000
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=teamflow-uploads
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
MAIL_FROM=TeamFlow <your-email@gmail.com>
```

## Future Improvements

- Inline code diff viewer
- PDF/image preview inside the app
- Review checklist per task
- Team performance insights
- Advanced activity filters
- Drag-and-drop task movement
- Calendar export
- Production logging and monitoring
