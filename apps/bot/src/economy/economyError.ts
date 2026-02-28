export abstract class EconomyError extends Error {}

export class InsufficientBalanceError extends EconomyError {
  constructor() {
    super("Insufficient balance");
  }
}

export class InvalidAmountError extends EconomyError {
  constructor() {
    super("Invalid amount");
  }
}

export class InvalidUserError extends EconomyError {
  constructor() {
    super("Invalid user");
  }
}

export class WalletNotFoundError extends EconomyError {
  constructor(walletName: string) {
    super(`Wallet not found: ${walletName}`);
  }
}

export class SelfTransferError extends EconomyError {
  constructor() {
    super("Cannot transfer to self");
  }
}

export class WalletCreationError extends EconomyError {
  constructor(usersWithoutWallet: string[]) {
    super(`Failed to create wallets for users: ${usersWithoutWallet.join(", ")}`);
  }
}

export class CurrencyNotFoundError extends EconomyError {
  constructor() {
    super("Currency not found");
  }
}

export class ShopItemNotFoundError extends EconomyError {
  constructor() {
    super("Shop item not found");
  }
}

export class OutOfStockError extends EconomyError {
  constructor() {
    super("Item is out of stock");
  }
}

export class UserInventoryLimitExceededError extends EconomyError {
  public readonly limit: number;
  public readonly currentQuantity: number;

  constructor(limit: number, currentQuantity: number) {
    super(`Max inventory limit exceeded for this item: ${currentQuantity}/${limit}`);
    this.limit = limit;
    this.currentQuantity = currentQuantity;
  }
}

export class UserPurchaseLimitExceededError extends EconomyError {
  public readonly limit: number;
  public readonly currentQuantity: number;

  constructor(limit: number, currentQuantity: number) {
    super(`User purchase limit exceeded: ${currentQuantity}/${limit}`);
    this.limit = limit;
    this.currentQuantity = currentQuantity;
  }
}

export class InvalidStockError extends EconomyError {
  public readonly requestedStock: number;
  public readonly soldCount: number;

  constructor(requestedStock: number, soldCount: number) {
    super(
      `Cannot set global stock to ${requestedStock} when ${soldCount} items have already been sold`,
    );

    this.requestedStock = requestedStock;
    this.soldCount = soldCount;
  }
}

export class CurrencyTransferLimitExceededError extends EconomyError {
  public readonly currentReceived: number;
  public readonly limit: number;
  public readonly requestedAmount: number;

  constructor(currentReceived: number, limit: number, requestedAmount: number) {
    super(
      `Currency transfer limit exceeded: ${currentReceived}/${limit}, requested: ${requestedAmount}`,
    );

    this.currentReceived = currentReceived;
    this.limit = limit;
    this.requestedAmount = requestedAmount;
  }
}
