"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyNotFoundError = exports.WalletCreationError = exports.SelfTransferError = exports.WalletNotFoundError = exports.InvalidUserError = exports.InvalidAmountError = exports.InsufficientBalanceError = exports.EconomyError = void 0;
var EconomyError = /** @class */ (function (_super) {
    __extends(EconomyError, _super);
    function EconomyError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return EconomyError;
}(Error));
exports.EconomyError = EconomyError;
var InsufficientBalanceError = /** @class */ (function (_super) {
    __extends(InsufficientBalanceError, _super);
    function InsufficientBalanceError() {
        return _super.call(this, "Insufficient balance") || this;
    }
    return InsufficientBalanceError;
}(EconomyError));
exports.InsufficientBalanceError = InsufficientBalanceError;
var InvalidAmountError = /** @class */ (function (_super) {
    __extends(InvalidAmountError, _super);
    function InvalidAmountError() {
        return _super.call(this, "Invalid amount") || this;
    }
    return InvalidAmountError;
}(EconomyError));
exports.InvalidAmountError = InvalidAmountError;
var InvalidUserError = /** @class */ (function (_super) {
    __extends(InvalidUserError, _super);
    function InvalidUserError() {
        return _super.call(this, "Invalid user") || this;
    }
    return InvalidUserError;
}(EconomyError));
exports.InvalidUserError = InvalidUserError;
var WalletNotFoundError = /** @class */ (function (_super) {
    __extends(WalletNotFoundError, _super);
    function WalletNotFoundError(walletName) {
        return _super.call(this, "Wallet not found: ".concat(walletName)) || this;
    }
    return WalletNotFoundError;
}(EconomyError));
exports.WalletNotFoundError = WalletNotFoundError;
var SelfTransferError = /** @class */ (function (_super) {
    __extends(SelfTransferError, _super);
    function SelfTransferError() {
        return _super.call(this, "Cannot transfer to self") || this;
    }
    return SelfTransferError;
}(EconomyError));
exports.SelfTransferError = SelfTransferError;
var WalletCreationError = /** @class */ (function (_super) {
    __extends(WalletCreationError, _super);
    function WalletCreationError(usersWithoutWallet) {
        return _super.call(this, "Failed to create wallets for users: ".concat(usersWithoutWallet.join(", "))) || this;
    }
    return WalletCreationError;
}(EconomyError));
exports.WalletCreationError = WalletCreationError;
var CurrencyNotFoundError = /** @class */ (function (_super) {
    __extends(CurrencyNotFoundError, _super);
    function CurrencyNotFoundError() {
        return _super.call(this, "Currency not found") || this;
    }
    return CurrencyNotFoundError;
}(EconomyError));
exports.CurrencyNotFoundError = CurrencyNotFoundError;
