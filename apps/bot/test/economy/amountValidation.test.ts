import { describe, expect, it } from "bun:test";
import { InvalidAmountError } from "../../src/economy/economyError";
import { validateNonNegativeAmount } from "../../src/economy/util";

describe("validateNonNegativeAmount", () => {
  it.each([0, 1, Number.MAX_SAFE_INTEGER])("accepts %p", (amount) => {
    expect(() => validateNonNegativeAmount(amount)).not.toThrow();
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])(
    "rejects %p",
    (amount) => {
      expect(() => validateNonNegativeAmount(amount)).toThrow(InvalidAmountError);
    },
  );
});
