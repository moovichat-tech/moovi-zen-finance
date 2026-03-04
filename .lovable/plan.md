

## Plan: Multi-fix update for Moovi

### 1. Locale-aware date formatting
- Add a `formatDate` function to `I18nContext` that uses `Intl.DateTimeFormat` with the locale matching the current language (pt-BR, en-US, es-ES, fr-FR, de-DE).
- Replace all raw `tr.date` / `exp.date` / `inc.date` renders across `ExpensesPage`, `IncomePage`, `CardsPage`, `Dashboard` with `formatDate(tr.date)`.
- Map: `{ pt: 'pt-BR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' }`.

### 2. Dashboard layout: full-width evolution chart + date filter
- Change the charts grid from `grid-cols-3` (2+1) to stacked: evolution chart gets its own full-width row (`col-span-full`), pie chart + comparison move to a row below.
- Add a period filter (month selector) at the top of the dashboard, filtering the stat cards and charts by selected month.

### 3. Settings: persist profile, remove notifications & export
- Store profile (name, email, phone) in `localStorage` via `DataContext` (add `profile` state with persistence).
- Remove the Notifications card and the "Exportar meus dados" button from `SettingsPage`.

### 4. Budget integrated with categories
- In `BudgetPage`, derive budget items from `categories.expense` instead of a separate static list. Only show/allow budgets for categories that exist in `categories.expense`.
- Add `addBudget` to DataContext. When a category is deleted, auto-remove its budget. When a category is added, optionally allow creating a budget for it.
- Sync: budget list filters to only show items whose `category` exists in `categories.expense`.

### 5. Accounts: remove "digital" type
- Remove `'digital'` from the Account type union and from `typeLabels`/`typeIcons`.
- Update the default Nubank account to type `'checking'` instead of `'digital'`.

### 6. Cards: "ver lançamentos" button + period filter + refund as positive
- Add a small "Ver lançamentos" button next to Edit on each card.
- In the transactions list for a card, add a month filter dropdown.
- Display income-type transactions (refunds) on a card as positive amounts (green).

### 7. Expenses & Income: sortable table headers + period filter
- Make each `TableHead` clickable to toggle sort by that column (description alpha, category alpha, date chrono, amount numeric, status alpha).
- The period filter already exists as a month selector — ensure it works correctly (it does based on code review). Add custom date range option similar to Reports.

### 8. Expenses & Income: sync categories from DataContext
- Categories are already being read from `categories.income` / `categories.expense` in the form dialogs. Verify the `resetForm` sets category to the first available from the live list (it does via `categories.expense[0]`). This is already working.

### Files to modify:
- `src/i18n/context.tsx` — add `formatDate`, expose locale-to-dateLocale map
- `src/store/DataContext.tsx` — add `profile` state with localStorage, add `addBudget`/`deleteBudget` auto-sync, remove `'digital'` from type, update default accounts
- `src/pages/Dashboard.tsx` — full-width chart, date filter
- `src/pages/SettingsPage.tsx` — persist profile, remove notifications & export
- `src/pages/BudgetPage.tsx` — integrate with categories
- `src/pages/AccountsPage.tsx` — remove digital type
- `src/pages/CardsPage.tsx` — ver lançamentos button, period filter, refund display
- `src/pages/ExpensesPage.tsx` — sortable headers, period range filter
- `src/pages/IncomePage.tsx` — sortable headers, period range filter

