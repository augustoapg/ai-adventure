import { UserMessages } from '@/interfaces';
import { ChatCompletionRequestMessage } from 'openai';

const userMessages: UserMessages = {}; // In-memory storage (for now)

/**
 * Adds array of messages to the end of existing array of messages for the user.
 * If user still doesn't have any messages saved, it creates a new array.
 * @param userId Id of the user for which the messages are to be saved
 * @param messages Array of messages to be saved
 */
export const saveUserMessages = (
  userId: string,
  messages: ChatCompletionRequestMessage[],
) => {
  if (!userMessages[userId]) {
    userMessages[userId] = [];
  }

  userMessages[userId] = userMessages[userId].concat(messages);
};

/**
 * Gets array of messages belonging to the user, or an empty array if none.
 * @param userId Id of the user
 * @returns array of user messages
 */
export const getUserMessages = (userId: string) => {
  return userMessages[userId] || [];
};

/**
 * Removes previous messages. Used for starting a new game.
 * @param userId Id of the user
 */
export const clearUserMessages = (userId: string) => {
  userMessages[userId] = [];
};
