# Elimu CBE School Portal

A browser-based MVP for a Kenyan Competency-Based Education school. It includes role-specific workspaces for a headteacher, class teachers, parents and learners.

## Run it

Open `index.html` in a modern browser. No package installation or build step is required. Portal changes are saved in that browser's local storage.

## Demo sign-ins

| Role | Username / admission number | Password / registered phone |
| --- | --- | --- |
| Headteacher | `admin` | `admin123` |
| Class teacher | `teacher1` | `teacher123` |
| Parent / guardian | `CBE-2024-001` | `0712345678` |
| Learner | `CBE-2024-001` | `learn123` |

A second teacher is available as `teacher2` / `teacher123` and is assigned Grade 6. The demo has sample learners in Grades 4 and 6.

## Included workflows

- Headteacher: create or remove class-teacher accounts, assign teachers to Grades 1–9, enroll or delete learners, set class fee amounts, verify or reject parent payment submissions, publish announcements, and print class performance reports.
- Class teacher: manage learners enrolled in their assigned grade, take the daily attendance register, enter scores for the eight learning areas, and print learner report cards.
- Parent: sign in with the learner's admission number and registered guardian phone, check fee balances and announcements, submit a payment reference for headteacher verification, and print a learner report card.
- Learner: sign in with their admission number and learner password, and view their report card, fee status and school announcements.

## Important limitations before production use

This is a functional single-browser demonstration, not a production multi-user school system. Local storage is device- and browser-specific; it is not a shared database. Demo credentials and learner passwords are stored in the browser and are not secure authentication. Payment submission records a reference only: it does not initiate, receive or reconcile a real payment. The app also needs school-specific configuration, server-side authorization, audit logs, backups, privacy controls and a real payment-provider integration before handling actual student or financial data.
