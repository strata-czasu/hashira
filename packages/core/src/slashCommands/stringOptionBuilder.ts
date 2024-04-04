import { SlashCommandStringOption } from "discord.js";
import type { OptionBuilder } from "../types";

export class StringOptionBuilder<
	HasDescription extends boolean = false,
	Required extends boolean = true,
> implements OptionBuilder<Required, string>
{
	declare _: { type: Required extends true ? string : string | null };
	// Enforce nominal typing
	protected declare readonly nominal: [HasDescription, Required];
	#builder = new SlashCommandStringOption();

	setDescription(description: string): StringOptionBuilder<true, Required> {
		this.#builder.setDescription(description);
		return this as ReturnType<typeof this.setDescription>;
	}

	setRequired<NewRequired extends boolean>(
		required: NewRequired,
	): StringOptionBuilder<HasDescription, NewRequired> {
		this.#builder.setRequired(required);
		return this as unknown as ReturnType<typeof this.setRequired<NewRequired>>;
	}

	toSlashCommandOption() {
		return this.#builder;
	}
}
