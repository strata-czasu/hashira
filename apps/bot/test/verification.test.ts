import { describe, expect, test } from "bun:test";
import { ConfirmationDialog } from "@hashira/core";

describe("verification confirmation dialog integration", () => {
  test("ConfirmationDialog is properly imported and available", () => {
    // Test that ConfirmationDialog can be instantiated with basic parameters
    const dialog = new ConfirmationDialog(
      "Test confirmation",
      "Accept",
      "Decline",
      async () => {},
      async () => {},
      () => true,
      null,
    );

    expect(dialog).toBeInstanceOf(ConfirmationDialog);
  });

  test("ConfirmationDialog constructor accepts Polish messages", () => {
    // Test with Polish messages like those used in verification rejection
    const dialog = new ConfirmationDialog(
      "Czy na pewno chcesz odrzucić weryfikację? Ta akcja spowoduje automatyczny ban tego użytkownika.",
      "Tak, zbanuj",
      "Anuluj",
      async () => {},
      async () => {},
      () => true,
      async () => {},
    );

    expect(dialog).toBeInstanceOf(ConfirmationDialog);
  });
});
