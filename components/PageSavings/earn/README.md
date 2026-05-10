# Earn module (`components/PageSavings/earn/`)

Behavior freeze for the first refactor pass — preserve existing UX and formulas; structural refactor only.

## Earn behavior

### Collect

- Collect to wallet
- Compound into earning

### Deposit

- Wallet ZCHF only
- Current behavior preserved during refactor

### Withdraw

- Custom amount
- Withdraw all

### Wrong chain

- Show switch prompt
- No transaction form

### Inactive chain

- Funding state only
- No transaction module

## Manual checklist

```text
Collect tab with interest
Compound tab with interest
Deposit tab with wallet balance
Withdraw custom amount = 0
Withdraw custom amount = 500
Withdraw all
Wrong-chain active allocation
Inactive empty chain
Mobile width
```
