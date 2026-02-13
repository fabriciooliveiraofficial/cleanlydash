# Plan: Professional PDF Invoice Generation

The user wants to add an option in the "Finance" page to generate detailed professional PDF invoices.

## Proposed Changes

### [Library] Core Utils (Vite)

#### [NEW] [pdf-invoice.ts](file:///d:/1. Clientes/51. Cleanlydash/lib/utils/pdf-invoice.ts)
- Implement `generateProfessionalInvoicePDF`.
- Uses `jsPDF` and `jspdf-autotable`.

### [Component] Commerce (Vite)

#### [MODIFY] [PaymentLinkManager.tsx](file:///d:/1. Clientes/51. Cleanlydash/components/commerce/PaymentLinkManager.tsx)
- Add action button for PDF.
- Implement fetching of items and tenant profile.

## Roles
- project-planner
- backend-specialist
- frontend-specialist
- test-engineer

## Verification Plan
1. Manual download and inspection of the PDF.
2. Verify data alignment (Item -> Amount).
