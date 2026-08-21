# TeamFlow

TeamFlow is a project delivery governance workspace for teams that need more than a task board. It helps teams assign work, submit outputs, review changes, approve final versions, track blockers, and keep project deliverables organized.

## Problem Statement

In many teams, work is assigned in one place, files are shared somewhere else, feedback happens in chat, and final approved deliverables are hard to identify later. This creates confusion around who owns the work, which version is final, what still needs review, and what is blocked.

TeamFlow solves this by combining task ownership, project-specific teams, private cloud file submissions, review approval, delivery tracking, notifications, audit trails, workload insights, and dependency visibility in one workspace.

## Why It Stands Out

TeamFlow does not try to replace GitHub or cloud drives. GitHub manages source history, while TeamFlow manages delivery governance: who owns the work, what was submitted, who reviewed it, which version was approved, what is blocked, and what stakeholders can safely inspect.

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
- Deliverables hub with review-state buckets
- Supabase Storage upload support
- Private signed file download links
- Manual file/link fallback when cloud upload is not configured
- Versioned submissions with review notes
- Comments and teammate notifications
- In-app notifications with unread count
- Project dependency and blocker tracking
- Cross-project delivery pulse dashboard
- Blocked-task movement restrictions
- Workload and deadline views
- Calendar notes and deadlines
- Audit trail with project/date/member filters
- Viewer mode for read-only stakeholder access
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
- Comments and teammate notifications
- Realtime notification updates

### Phase 3: Delivery Workflow

- Work submissions
- File/link attachments
- Review inbox
- Approve, reject, request changes
- Deliverables hub and approved delivery room
- Submission version history

### Phase 4: Project Intelligence

- Dependency graph
- Blocker detection
- Delivery pulse analytics
- Workload view
- Dashboard summaries
- Deadlines and calendar
- Audit/activity tracking

### Phase 5: Cloud Storage

- Supabase Storage signed uploads
- Private signed download links
- MongoDB metadata persistence
- Manual link fallback

### Phase 6: Production Readiness

- RBAC tests
- Feature smoke tests
- Public README
- Deployment environment documentation
- Clean role and storage boundaries

## Tech Stack

| Layer        | Technology                                |
| ------------ | ----------------------------------------- |
| Frontend     | React, TypeScript, Vite, Tailwind CSS     |
| Routing/Data | React Router, TanStack Query, Axios       |
| State        | Zustand                                   |
| UI           | Lucide React, Recharts                    |
| Backend      | Node.js, Express.js, TypeScript           |
| Database     | MongoDB, Mongoose                         |
| File Storage | Supabase Storage                          |
| Auth         | JWT, bcrypt                               |
| Realtime     | Socket.io                                 |
| Security     | Helmet, CORS, rate limiting, backend RBAC |
| Validation   | Zod                                       |
| Testing      | Vitest, Supertest, MongoDB Memory Server  |

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

| Role   | Access                                                                         |
| ------ | ------------------------------------------------------------------------------ |
| Owner  | Full workspace control, roles, members, projects, reviews and delivery         |
| Admin  | Manage team, projects, task details and review submissions                     |
| Member | Work on accessible projects, comment, update assigned progress and submit work |
| Viewer | Read-only access to progress, comments, delivery and activity                  |

## Important Rules

- Viewers cannot create projects or tasks.
- Only project members can be assigned project tasks.
- Members can submit only their assigned work.
- Users cannot notify themselves in comments.
- Done is set after approval, not directly from the task dropdown.
- Owner/admin submissions can go directly into Delivery.
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

BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=your-verified-sender@example.com
BREVO_FROM_NAME=TeamFlow

# Optional SMTP fallback for hosts that allow outbound SMTP.
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-gmail-app-password
# MAIL_FROM=TeamFlow <your-email@gmail.com>

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
- Signed file uploads and downloads
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
BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=your-verified-sender@example.com
BREVO_FROM_NAME=TeamFlow
```

For production email, verify a sender in Brevo under **Senders & IP > Senders**, then set `BREVO_FROM_EMAIL` to that exact verified email address. SMTP is only a fallback; free Render services cannot reliably reach Gmail SMTP ports.

## Future Improvements

- Inline code diff viewer
- PDF/image preview inside the app
- Review checklist per task
- Team performance insights
- Advanced activity filters
- Drag-and-drop task movement
- Calendar export
- Production logging and monitoring
