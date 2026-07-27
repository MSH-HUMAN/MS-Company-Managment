# MS Company Management System

A multi-tenant Enterprise HR, Recruitment, and Workforce Management System built for recruitment agencies, HR consultancies, and manpower suppliers operating in the UAE and GCC region.

---

## Overview

MS Company Management System simplifies the entire recruitment lifecycle—from candidate registration and interview scheduling to job placement, digital placement agreements, staff attendance, and payroll processing. 

Designed with strict role-based access control (RBAC) and multi-branch isolation, it allows Super Admins, Company Admins, HR Managers, and Staff members to collaborate seamlessly while maintaining complete data privacy and security.

---

## Core Features & Modules

### 1. Recruitment & Candidate Management
- **Public Candidate Portal**: Clean candidate application form (`/apply`) with tracking code generation (`TRK-YYYY-XXX`).
- **Applicant Pipeline & Details**: Complete candidate profile overview, CV slot management, document vault, and status history tracking.
- **Status Workflow**: Automates candidate transitions (`Pending`, `Shortlisted`, `Interview Scheduled`, `Selected`, `Visa Processing`, `Placed`, `Rejected`, `Returned`).

### 2. Interview & Meeting Scheduler
- **Flexible Modes**: Supports both Online (Zoom, Google Meet, Microsoft Teams, WhatsApp) and Physical interviews.
- **Permission Scoping**: Filter interviews by Company, Branch, Status, Date Range, Type, and Assigned HR.
- **Candidate Notifications**: Automatically sends email invitations and WhatsApp alerts upon scheduling or rescheduling.

### 3. Placement & Placement Agreements
- **Placement Tracking**: Record candidate placement details including client company, position, salary, and joining date.
- **Dedicated Agreement Module**: On-demand generation of official placement agreements (`/placement`).
- **Digital Signatures & PDF**: Built-in HTML5 signature canvas for applicant and consultancy authorization, printable PDF output, and agreement audit history.

### 4. Staff, Payroll & Shift Management
- **Employee Management**: Comprehensive staff records, passport/visa expiry reminders, and document slots.
- **Attendance & Shift Scheduling**: Track clock-in/out times, manage custom shifts, and process attendance corrections.
- **Payroll System**: Automated monthly payroll calculations, basic salary, housing, transport allowances, overtime rates, and approval workflows.
- **Leave Management**: Employee leave request submissions and manager approval flows.

### 5. Email & Communication System
- **Dynamic HTML Templates**: Custom branded templates using Handlebars for all system notifications (Registration, Status Changes, Interview Invitations, Offers, Placement Agreements).
- **Delivery Audit Logs**: Every outgoing email is logged in the `SentEmail` table with delivery status (`Sent` or `Failed`), timestamp, and recipient context.

### 6. Multi-Tenant Architecture & Security
- **Role-Based Access Control**: Scoped permissions across 6 roles (`Super Admin`, `Company Admin`, `Branch Admin`, `HR Manager`, `Staff`, `Employee`).
- **Data Isolation**: Multi-company and branch data filtering ensuring tenants only access authorized records.
- **JWT & Password Security**: Secure HTTP-only cookies and bcrypt password hashing.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Styling**: Tailwind CSS, Lucide Icons, Shadcn UI
- **Database & ORM**: PostgreSQL & Prisma ORM
- **State Management**: Zustand
- **Email Engine**: Nodemailer & Handlebars
- **Language**: TypeScript

---

## Getting Started

### Prerequisites

- Node.js 18.x or later
- PostgreSQL database instance

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Mujeeburahman1124/MS-Company-Managment.git
   cd MS-Company-Managment/ms-management
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root of `ms-management`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/ms_management?schema=public"
   JWT_SECRET="your-secure-jwt-secret-key"
   
   # SMTP Configuration (Optional for email sending)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="support@mshorizon.ae"
   SMTP_PASS="your-smtp-app-password"
   SMTP_FROM="\"MS Support\" <support@mshorizon.ae>"
   ```

4. **Initialize database schema**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build

To build the project for production deployment:

```bash
npm run build
npm run start
```

---

## License

Copyright © 2026 MS Horizon F.Z.E. All Rights Reserved.
