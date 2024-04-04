import { SlashCommandNumberOption } from "discord.js";
import type { OptionBuilder } from "../types";

export class NumberOptionBuilder<
	HasDescription extends boolean = false,
	Required extends boolean = true,
> implements OptionBuilder<Required, number>
{
	declare _: { type: Required extends true ? number : number | null };
	// Enforce nominal typing
	protected declare readonly nominal: [HasDescription, Required];
	#builder = new SlashCommandNumberOption();

	setDescription(description: string): NumberOptionBuilder<true, Required> {
		this.#builder.setDescription(description);
		return this as ReturnType<typeof this.setDescription>;
	}

	setRequired<NewRequired extends boolean>(
		required: NewRequired,
	): NumberOptionBuilder<HasDescription, NewRequired> {
		this.#builder.setRequired(required);
		return this as unknown as ReturnType<typeof this.setRequired<NewRequired>>;
	}

	toSlashCommandOption() {
		return this.#builder;
	}
}
