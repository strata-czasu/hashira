import { SlashCommandUserOption, User } from "discord.js";
import type { OptionBuilder } from "../types";

export class UserOptionBuilder<
	HasDescription extends boolean = false,
	Required extends boolean = true,
> implements OptionBuilder<Required, User>
{
	declare _: { type: Required extends true ? User : User | null };
	// Enforce nominal typing
	protected declare readonly nominal: [HasDescription, Required];
	#builder = new SlashCommandUserOption();

	setDescription(description: string): UserOptionBuilder<true, Required> {
		this.#builder.setDescription(description);
		return this as ReturnType<typeof this.setDescription>;
	}

	setRequired<NewRequired extends boolean>(
		required: NewRequired,
	): UserOptionBuilder<HasDescription, NewRequired> {
		this.#builder.setRequired(required);
		return this as unknown as ReturnType<typeof this.setRequired<NewRequired>>;
	}

	toSlashCommandOption() {
		return this.#builder;
	}
}
