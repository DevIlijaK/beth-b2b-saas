
// export { tweets } from "./tweets";

export { organizations, organizationsRelations } from "./organization";

export { key, session, user, userRelations } from "./auth";

// export const userRelations = relations(user, ({ many }) => ({
//   tweets: many(tweets),
// }));

// export const tweetsRelations = relations(tweets, ({ one }) => ({
//   author: one(user, {
//     fields: [tweets.authorId],
//     references: [user.id],
//   }),
// }));
