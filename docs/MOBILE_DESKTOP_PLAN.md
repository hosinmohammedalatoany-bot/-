# Mobile and Desktop Implementation Plan

The repository baseline implements the web/PWA shell and shared domain shape. The production mobile/desktop clients should be implemented in Flutter with the same rules:

## Flutter packages

- `flutter_riverpod` or `bloc` for state management.
- `drift` or `sqflite` for SQLite.
- `dio` for HTTPS API calls.
- `jwt_decoder` for token expiry handling.
- `printing` and `pdf` for invoices/contracts.
- `file_picker` for local documents.

## Local SQLite tables

Mirror the server tables needed for field work:

- cars
- customers
- leads
- reservations
- invoices
- invoice_items
- installments
- installment_payments
- expenses
- sync_queue
- conflict_logs
- file_upload_queue
- device_sessions

## Sync contract

Each queued operation must include:

- `operation_id`
- `device_id`
- `entity_type`
- `entity_id`
- `operation`
- `payload`
- `created_at`
- `schema_version`

The server returns:

- accepted operations
- rejected operations
- conflict groups
- server clock
- next sync cursor

## Windows desktop

Use Flutter Windows with SQLite and the same API client. Thermal printing should be implemented as a platform-specific adapter so invoice templates remain shared.
