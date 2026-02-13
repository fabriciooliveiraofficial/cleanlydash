# Plan: Unified Billing History & Advanced Filter

The user reported that invoices created via the Hybrid Dialog are not appearing in the history and the search filter is non-functional.

## Proposed Changes

### [Component] Commerce (Vite)

#### [MODIFY] [PaymentLinkManager.tsx](file:///d:/1. Clientes/51. Cleanlydash/components/commerce/PaymentLinkManager.tsx)
- **Data Fetching**: Update `fetchInvoices` to perform a dual fetch:
    - Query `tenant_invoices` (manual/ad-hoc).
    - Query `invoices` (hybrid/booking-based).
- **Data Normalization**: Map both types into a common `UnifiedInvoice` structure.
- **Search Filtering**:
    - Add `searchTerm` state.
    - Wire the search input to `searchTerm`.
    - Create a `filteredInvoices` computed array that filters the unified list.

## Roles
- **project-planner**: Coordination and documentation.
- **frontend-specialist**: Implementation.
- **test-engineer**: Verification.

## Verification Plan
1. Create a Manual Link -> Check History.
2. Create a Hybrid Invoice -> Check History.
3. Use Search -> Check results.
