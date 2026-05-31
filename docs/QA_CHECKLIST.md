# QA Checklist

Use this checklist before production handover.

## Web and PWA

- [ ] Dashboard KPI cards update after create/update actions.
- [ ] All module navigation buttons open the correct module surface.
- [ ] Add vehicle validates required fields.
- [ ] Duplicate VIN is blocked.
- [ ] Add customer validates email and phone.
- [ ] Add lead records source, employee, and vehicle.
- [ ] Reservation marks vehicle as reserved.
- [ ] Invoice marks vehicle as sold and queues accounting sync.
- [ ] Expense appears in expense totals.
- [ ] Installment payment updates paid status.
- [ ] WhatsApp share opens with vehicle details.
- [ ] CSV export downloads.
- [ ] Printable report downloads.
- [ ] Print center opens print dialog.
- [ ] Backup JSON downloads.
- [ ] PWA manifest is valid.

## Offline and sync

- [ ] Offline toggle changes sync status.
- [ ] Local operations queue while offline.
- [ ] Sync button is disabled offline.
- [ ] Sync clears pending queue online.
- [ ] Last sync time updates.
- [ ] Conflict messages are visible.
- [ ] IndexedDB persists state after reload.

## Security

- [ ] JWT auth added to production API.
- [ ] Password hashing verified.
- [ ] Role permissions enforced server-side.
- [ ] Approval workflow enforced for high-risk actions.
- [ ] File upload validation and scanning enabled.
- [ ] Audit logs written for mutations.
- [ ] HTTPS response headers verified.

## Platform coverage

- [ ] Chrome desktop.
- [ ] Safari desktop and iPhone.
- [ ] Microsoft Edge desktop.
- [ ] Android Chrome.
- [ ] Windows PWA installation.
- [ ] Flutter iPhone build.
- [ ] Flutter Android build.
- [ ] Flutter Windows build.
