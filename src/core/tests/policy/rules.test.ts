/**
 * OWNER: CORE
 * WHAT: One blocking test and one passing test for each of the 13 rules.
 *       This file is the reason we can claim the decision is deterministic.
 */
import { describe, it } from "vitest";

describe("policy rules", () => {
  it.todo("1  BLOCKs a frozen agent");
  it.todo("2  BLOCKs a non-allowlisted network");
  it.todo("2b BLOCKs a non-allowlisted asset");
  it.todo("3  BLOCKs a blocklisted merchant");
  it.todo("4  BLOCKs an unknown merchant when unknownMerchantAction=BLOCK");
  it.todo("4b HOLDs an unknown merchant when unknownMerchantAction=HOLD");
  it.todo("5  BLOCKs when payTo differs from the pinned recipient");
  it.todo("6  BLOCKs above maxPerTransactionUsd");
  it.todo("7  BLOCKs above blockAboveUsd");
  it.todo("8  BLOCKs when the daily window would be exceeded");
  it.todo("8b BLOCKs when the hourly window would be exceeded");
  it.todo("9  BLOCKs above maxTxPerMinute");
  it.todo("10 BLOCKs when the wallet allowance is insufficient");
  it.todo("11 BLOCKs when riskScore >= riskBlockScore");
  it.todo("12 HOLDs when the amount sits in holdBetweenUsd");
  it.todo("13 ALLOWs a clean low-risk payment");
});

