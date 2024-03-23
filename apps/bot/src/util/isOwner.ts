import { Team, User } from "discord.js";
import { match } from "ts-pattern";

export const isOwner = (userToMatch: User, entity: User | Team | null): boolean =>
	match(entity)
		.when(
			(ent): ent is User => ent instanceof User,
			(user) => user.id === userToMatch.id,
		)
		.when(
			(ent): ent is Team => ent instanceof Team,
			(team) => team.members.has(userToMatch.id),
		)
		.otherwise(() => false);
