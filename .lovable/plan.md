

## Plan: Comprehensive Moovi Update

### 1. Account deletion — handle orphaned transactions
When an account is deleted, transactions referencing that `accountId` become orphaned. Solution: show a confirmation dialog asking the user what to do — either **delete all transactions** from that account or **move them to another account**. Add `updateAccount` to DataContext. In `AccountsPage`, add an AlertDialog before deletion with these options.

Also in accounts: remove transaction preview, add "Ver lançamentos" button (shows filtered transactions in a card below), and add an "Edit" button next to delete.

### 2. Recurrence badge translation — "monthly" label fix
In `ExpensesPage` and `IncomePage`, the recurrence badge shows raw values like `monthly`, `weekly`, `yearly`. Create a translation map per locale for recurrence labels (e.g., `monthly` -> `Mensal` in PT, `Monthly` in EN, etc.) and use it when rendering badges. Add `recurrence` translations to `translations.ts`.

### 3. Enhanced Reports page
Rebuild `ReportsPage.tsx` with multiple report views:
- **By Month** (current bar chart, improved)
- **By Category** (pie + table breakdown)
- **By Account** (spending per account)
- **Detailed Table** (all transactions with sortable headers)

Add functional **CSV export** (already works), **PDF export** (generate a simple HTML-to-print via `window.print()` on a styled hidden div), and **Excel/Spreadsheet export** (CSV with proper encoding). Add filter by category and by account in addition to period.

### 4. Dark mode
- Add dark mode CSS variables to `src/index.css` under `.dark` class
- Add a `theme` state to `I18nContext` (or a separate ThemeProvider using `next-themes` which is already installed)
- Add a Sun/Moon toggle button in `TopBar.tsx` next to the language selector
- Use `next-themes` `ThemeProvider` wrapping the app in `main.tsx`

### 5. Country flags next to language selector
Add emoji flags next to each language in `TopBar.tsx` and `SettingsPage.tsx`:
- pt: 🇧🇷, en: 🇺🇸, es: 🇪🇸, fr: 🇫🇷, de: 🇩🇪

Update `localeNames` in `translations.ts` or create a `localeFlags` map.

### 6. Subscription cancellation flow
Add a "Cancelar assinatura" button to `SubscriptionPage.tsx`. When clicked, show a multi-step cancellation flow:
1. Step 1: "Are you sure?" with benefits reminder
2. Step 2: "Why are you leaving?" with reason options + discount offer
3. Step 3: "We have a special offer for you" — offer 50% off for 3 months
4. Step 4: Final confirmation with strong warning
Each step has a "Continuar usando" button prominently displayed.

### 7. AI assistant validation
Review `AIPage.tsx` — the `parseNaturalLanguage` function works but needs minor fixes: ensure account matching by name (e.g., "no Nubank" should find the Nubank account). Add account name matching to the parser.

### Files to modify:
- `src/index.css` — add dark mode variables
- `src/main.tsx` — wrap with `ThemeProvider` from next-themes
- `src/i18n/translations.ts` — add recurrence translations, locale flags
- `src/i18n/context.tsx` — expose recurrence translation helper
- `src/store/DataContext.tsx` — add `updateAccount`, modify `deleteAccount` to optionally reassign transactions
- `src/components/layout/TopBar.tsx` — add dark mode toggle, flags on language
- `src/pages/AccountsPage.tsx` — deletion confirmation dialog, edit button, ver lançamentos button, remove preview
- `src/pages/ExpensesPage.tsx` — translate recurrence badges
- `src/pages/IncomePage.tsx` — translate recurrence badges
- `src/pages/ReportsPage.tsx` — full rebuild with multiple report types, PDF/Excel export
- `src/pages/SubscriptionPage.tsx` — add multi-step cancellation flow
- `src/pages/SettingsPage.tsx` — add flags to language selector
- `src/pages/AIPage.tsx` — add account name matching to parser

