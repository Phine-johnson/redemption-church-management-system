u# Role-Based Access Control Implementation TODO

## Steps:

1. ✅ Update loginRoles in client/src/pages/LoginPage.jsx to: ['Member', 'AudioVisual', 'Accountant', 'Clerk', 'Super Admin']

2. ✅ Updated all routes, redirects with role homes in App.jsx and ProtectedRoute.

3. ✅ Updated AppShell.jsx for role-based navigation filtering.

4. Ensure server/src/server.js accepts new roles (already does).

5. Update ProtectedRoute redirects based on role.

6. Test logins with different roles and access enforcement.

7. Update TODO and attempt_completion.

Current progress: RBAC fully implemented with route protections, role-based redirects, nav filtering, and public Members page.

