

## Plan: Multiple UI/UX Improvements

### 1. Dark Mode Border Fix
- In `src/index.css`, update dark mode CSS variables for `--border` and `--card` to use more subtle, blended values. Remove harsh white lines by making borders transparent or very dark. Add `border-none` or `border-transparent` styles to cards in dark mode via a utility class.

### 2. Transaction Form: "Valor" → "Valor Total"
- In `src/components/TransactionFormDialog.tsx`, change the label for the amount field from `t.common.amount` to locale-specific "Valor Total" / "Total Amount" etc.

### 3. Payables/Receivables: Toast on Mark as Paid
- In `src/pages/PayablesReceivablesPage.tsx`, import `toast` from `sonner` and call `toast.success(...)` inside `markAsCompleted` to show a confirmation popup in the bottom-right.

### 4. Payables/Receivables: Overdue Items on Top in Red
- Sort the filtered items so overdue (date < today) appear first, and apply a red-tinted row style (`bg-destructive/5 text-destructive`) to overdue rows.

### 5. Cards: Last 4 Digits Optional
- In `src/pages/CardsPage.tsx`, add "(opcional)" to the label for "Últimos 4 dígitos". No validation change needed since `handleSubmit` already only requires `name` and `limit`.

### 6. Card Limit System (usedLimit computed from transactions)
- Currently `usedLimit` is a static field. Change it to be computed dynamically: sum all unpaid/paid expense transactions linked to the card in the current billing cycle. When a transaction is marked as "paid" and it was on a card, the `usedLimit` decreases accordingly. This will be computed as a `useMemo` in CardsPage from transactions, replacing the static `card.usedLimit`.

### 7. Commitments/Appointments Page
- Create `src/pages/CommitmentsPage.tsx` with a beautiful calendar view (using the existing Calendar component) showing all planned/upcoming transactions as "commitments". Display a monthly calendar with dots on days that have transactions, and a list below showing details for the selected day.
- Add route `/commitments` in `App.tsx` and sidebar entry in `AppSidebar.tsx`.

### 8. Accounts: Remove Duplicate "Nome"/"Instituição" Field
- In `src/pages/AccountsPage.tsx`, remove the separate "Instituição" field from the add/edit dialog. Use just "Nome" (which serves as the account name/institution label). Set `institution` to match `name` on save.

### 9. Accounts: Default Account
- Add `isDefault` boolean to Account interface in `DataContext.tsx`. Add `setDefaultAccount` function. In the accounts page, add a star/toggle to mark one account as default. In AIPage, use the default account when none is specified.

### 10. Dashboard: Keep AI Assistant, Remove Dedicated AI Page
- Move the AI chat into the Dashboard (already has the quick entry card with Sparkles). Enhance the quick entry to be a mini AI assistant with a title like "Assistente IA — faça um lançamento por comando". Remove the `/ai` route and sidebar entry.

### 11. Dashboard AI: Add Title
- Add a descriptive title/subtitle to the quick entry card: "Assistente IA" with subtitle "Digite um comando para lançar receitas e despesas rapidamente".

### 12. Subscription: Move Cancel Button Lower & Subtler
- Move the "Cancelar assinatura" button from the top current plan card to a separate section at the bottom of the page, styled in muted gray with smaller text.

### 13. Subscription Cancellation Dialog: Back Arrow
- Add a back arrow button (ArrowLeft icon) in each cancellation step's dialog header to go to the previous step (or close if at step 1).

### 14. Settings: Phone Field Read-Only & Gray
- Change the phone input to `disabled` with gray styling, remove the `onChange` handler. Keep it visible but non-editable.

### 15. Open Finance Page (Coming Soon)
- Create `src/pages/OpenFinancePage.tsx` — simple page with a "Em breve" / "Coming Soon" message, an icon, and a brief description of what Open Finance will offer.
- Add route `/open-finance` in `App.tsx` and sidebar entry in `AppSidebar.tsx`.

### Files to Create
- `src/pages/CommitmentsPage.tsx`
- `src/pages/OpenFinancePage.tsx`

### Files to Modify
- `src/index.css` — dark mode border variables
- `src/components/TransactionFormDialog.tsx` — "Valor Total" label
- `src/pages/PayablesReceivablesPage.tsx` — toast + overdue sorting/styling
- `src/pages/CardsPage.tsx` — optional digits label + computed usedLimit
- `src/pages/AccountsPage.tsx` — remove institution field duplicate
- `src/store/DataContext.tsx` — Account.isDefault, setDefaultAccount
- `src/pages/Dashboard.tsx` — enhanced AI quick entry with title
- `src/pages/AIPage.tsx` — remove (or keep as redirect)
- `src/pages/SubscriptionPage.tsx` — cancel button repositioned, back arrow in dialog
- `src/pages/SettingsPage.tsx` — phone disabled
- `src/App.tsx` — add new routes, remove /ai
- `src/components/layout/AppSidebar.tsx` — add new nav items, remove ai

