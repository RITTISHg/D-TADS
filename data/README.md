# Transaction Datasets & Feature Schema

This directory holds dataset templates, transaction samples, and schema files representing the IEEE-CIS Fraud Detection parameters used to train and calibrate the NEXUS models.

## Dataset Structure
We utilize a compressed representation of the 18 main predictive features identified in the Kaggle IEEE-CIS Fraud Detection dataset:

| Feature Name | Type | Description |
|---|---|---|
| `TransactionAmt` | Numeric | Transaction value in USD |
| `ProductCD` | Categorical | Product code (e.g., W, H, C, S, R) |
| `card1` - `card6` | Mix | Payment card information, card category, and card type (debit/credit) |
| `addr1` - `addr2` | Numeric | Billing region and billing country |
| `dist1` | Numeric | Distance from billing address to transaction location |
| `C1` - `C14` | Numeric | Counting vectors (addresses, card frequencies, velocity) |
| `D1` - `D15` | Numeric | Timedeltas in days (such as days since card activation) |
| `M1` - `M9` | Categorical | Match fields (e.g., name match, address match, signature match) |

## Seed Data
To seed the cold start of our streaming queue, a set of transaction prototypes are maintained in `ieee_cis_sample.json`.
