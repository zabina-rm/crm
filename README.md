# HomeBase CRM V4

V4 adds a daily **Today** workspace and in-app follow-up reminders on top of the V3 CRM.

## New in V4

* Today view opens by default
* Overdue and due-today client follow-ups
* Overdue and due-today tasks
* Upcoming client follow-ups for the next 7 days
* Quick actions to move a follow-up or task to tomorrow or one week later
* Mark a client follow-up as done by clearing its next follow-up date
* A badge beside Today showing how many items need attention
* Dashboard now highlights client follow-ups needing attention

## Database upgrade

No new Supabase tables or columns are required for V4. It uses the existing V3 `contacts.next\_follow\_up` and `tasks.due\_date` fields, so **do not rerun your schema** if V3 is already working.

## Upgrade from V3 on Windows

1. Extract this V4 ZIP.
2. Copy your existing V3 `.env` file into this folder, beside `package.json`.
3. Open this folder in File Explorer.
4. Click the address bar, type `cmd`, and press Enter.
5. Run:

   npm install

6. Then run:

   npm run dev

7. Open the localhost address shown by Vite.

Your existing Supabase contacts, deals, tasks, and interaction history remain unchanged.

Deployment trigger

