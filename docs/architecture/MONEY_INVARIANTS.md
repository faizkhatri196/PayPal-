# Deterministic Financial Bounds & Money Invariants

## Principles of Mathematical Invariance

Holdfast guarantees that under NO circumstances can autonomous AI agents, prompt manipulation, or probabilistic reasoning violate financial accounting bounds.

### Invariant 1: Total Captured Ceiling
$$\sum_{i=1}^{k} \text{Amount}(\text{Milestone}_i) \le \text{TotalAuthorizedAmount}$$

- Every capture tranche is validated against the authorized hold ceiling.
- Any requested tranche where `current_settled + requested > total_hold` is rejected at Gate 1 with $0 funds moved.

### Invariant 2: Positive Non-Zero Disbursals
$$\forall i, \quad \text{Amount}(\text{Milestone}_i) > 0.00$$

- Zero-dollar captures and negative refund offsets are strictly blocked at input ingestion.

### Invariant 3: Single-Currency Homogeneity
$$\forall i, \quad \text{Currency}(\text{Milestone}_i) = \text{Currency}(\text{Contract})$$

- Cross-currency manipulation attacks are rejected before rate translation.
