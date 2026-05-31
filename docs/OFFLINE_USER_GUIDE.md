# Offline User Guide

## What works offline

The web dashboard supports local operations for:

- Viewing vehicles, customers, leads, installments, invoices, reservations, expenses, audit activity, and permissions.
- Adding vehicles with duplicate VIN prevention.
- Adding customers and leads.
- Creating reservations.
- Creating invoices and marking vehicles sold.
- Recording installment payments.
- Creating expenses.
- Queueing local file attachments.
- Exporting inventory CSV and printable reports.
- Downloading local backup JSON.

## Sync indicators

The header shows:

- Online, Offline, or Syncing.
- Last sync time.
- Pending operation count.

Use **Go Offline** to simulate field work without internet. Use **Sync Now** after returning online to clear the local queue.

## Conflict behavior

VIN duplication is blocked immediately on the device. Server-side conflicts should be recorded in `conflict_logs` and routed to an approval workflow for financial records.

## Device data

Browser data is persisted to IndexedDB under `baraa-raed-offline-db`. Clearing browser site data removes local unsynced operations, so users should sync before clearing storage.
