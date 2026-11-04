/** @jsxImportSource @hashira/jsx */
import { ButtonStyle, type ChatInputCommandInteraction, type Message } from "discord.js";

import type { Transaction } from "@hashira/db";
import {
  ActionRow,
  Button,
  Container,
  H3,
  render,
  Separator,
  StringSelectMenu,
  StringSelectOption,
  TextDisplay,
} from "@hashira/jsx";
import { type Paginator, PaginatorOrder } from "@hashira/paginate";

import { formatBalance } from "../util";
import { TransactionRow } from "./transactionRow";

export type HistoryUser = {
  id: string;
  label: string;
  balance: number;
  paginator: Paginator<Transaction>;
};

const prefix = "multi-history:";

export class MultiHistoryView {
  #index = 0;
  readonly #users: HistoryUser[];
  readonly #currencySymbol: string;

  constructor(users: HistoryUser[], currencySymbol: string) {
    if (users.length === 0 || users.length > 25) {
      throw new Error("MultiHistoryView requires between 1 and 25 users");
    }
    this.#users = users;
    this.#currencySymbol = currencySymbol;
  }

  get currentUser() {
    return this.#users[this.#index]!;
  }

  async navigate(customId: string, selectedId?: string) {
    switch (customId) {
      case `${prefix}previous-user`:
        this.#index = Math.max(0, this.#index - 1);
        break;
      case `${prefix}next-user`:
        this.#index = Math.min(this.#users.length - 1, this.#index + 1);
        break;
      case `${prefix}user`: {
        const index = this.#users.findIndex((user) => user.id === selectedId);
        if (index !== -1) this.#index = index;
        break;
      }
      case `${prefix}previous-page`:
        await this.currentUser.paginator.previous();
        break;
      case `${prefix}next-page`:
        await this.currentUser.paginator.next();
        break;
      case `${prefix}reorder`:
        await this.currentUser.paginator.reorder();
        break;
    }
  }

  component(transactions: Transaction[], disabled = false) {
    const user = this.currentUser;
    const paginator = user.paginator;
    const pages = paginator.count === 0 ? "1" : paginator.displayPages;

    return (
      <Container>
        <TextDisplay>
          <H3>Historia {user.label}</H3>
          {`\n<@${user.id}> • Saldo: ${formatBalance(user.balance, this.#currencySymbol)}`}
        </TextDisplay>
        {transactions.length === 0 ? (
          <TextDisplay content="Brak transakcji." />
        ) : (
          transactions.map((transaction) => (
            <TransactionRow transaction={transaction} currencySymbol={this.#currencySymbol} />
          ))
        )}
        <Separator />
        <TextDisplay
          content={`Użytkownik ${this.#index + 1}/${this.#users.length} • Strona ${paginator.displayCurrentPage}/${pages} (${paginator.count ?? "?"})`}
        />
        <ActionRow>
          <Button
            customId={`${prefix}previous-user`}
            label="◀ Poprzedni użytkownik"
            style={ButtonStyle.Secondary}
            disabled={disabled || this.#index === 0}
          />
          <Button
            customId={`${prefix}next-user`}
            label="Następny użytkownik ▶"
            style={ButtonStyle.Secondary}
            disabled={disabled || this.#index === this.#users.length - 1}
          />
        </ActionRow>
        <ActionRow>
          <StringSelectMenu
            customId={`${prefix}user`}
            placeholder={`${user.label} • ${this.#index + 1}/${this.#users.length}`.slice(0, 150)}
            disabled={disabled}
          >
            {this.#users.map((option) => (
              <StringSelectOption
                label={option.label.slice(0, 100)}
                value={option.id}
                description={`ID: ${option.id}`}
                default={option.id === user.id}
              />
            ))}
          </StringSelectMenu>
        </ActionRow>
        <ActionRow>
          <Button
            customId={`${prefix}previous-page`}
            label="Poprzednia strona"
            emoji="⬅️"
            style={ButtonStyle.Primary}
            disabled={disabled || !paginator.canPrevious}
          />
          <Button
            customId={`${prefix}next-page`}
            label="Następna strona"
            emoji="➡️"
            style={ButtonStyle.Primary}
            disabled={disabled || !paginator.canNext}
          />
          <Button
            customId={`${prefix}reorder`}
            label={paginator.ordering === PaginatorOrder.DESC ? "🔽" : "🔼"}
            style={ButtonStyle.Secondary}
            disabled={disabled}
          />
        </ActionRow>
      </Container>
    );
  }

  async render(interaction: ChatInputCommandInteraction) {
    const transactions = await this.currentUser.paginator.current();
    const message = await interaction.editReply({
      ...render(this.component(transactions)),
      allowedMentions: { parse: [] },
    });

    await this.#awaitInteraction(interaction, message, transactions);
  }

  async #updateMessage(message: Message, transactions: Transaction[], disabled = false) {
    await message.edit({
      ...render(this.component(transactions, disabled)),
      allowedMentions: { parse: [] },
    });
  }

  async #awaitInteraction(
    interaction: ChatInputCommandInteraction,
    message: Message,
    transactions: Transaction[],
  ): Promise<void> {
    // Wait for both buttons and the user dropdown. Only the invoking moderator
    // may change this view; each successful interaction resets the idle timeout.
    const action = await message
      .awaitMessageComponent({
        filter: (event) =>
          event.user.id === interaction.user.id && event.customId.startsWith(prefix),
        time: 300_000,
      })
      .catch((error: unknown) => {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "InteractionCollectorError"
        ) {
          return null;
        }
        throw error;
      });
    if (!action) {
      await this.#updateMessage(message, transactions, true);
      return;
    }
    await action.deferUpdate();
    await this.navigate(
      action.customId,
      action.isStringSelectMenu() ? action.values[0] : undefined,
    );
    const nextTransactions = await this.currentUser.paginator.current();
    await this.#updateMessage(message, nextTransactions);
    await this.#awaitInteraction(interaction, message, nextTransactions);
  }
}
