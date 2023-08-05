import { UserMessages } from '@/interfaces';
import { ChatCompletionRequestMessage } from 'openai';

const userMessages: UserMessages = {}; // In-memory storage (for now)

export const saveUserMessages = (
  userId: string,
  message: ChatCompletionRequestMessage[],
) => {
  if (!userMessages[userId]) {
    userMessages[userId] = [];
  }

  userMessages[userId] = userMessages[userId].concat(message);
};

export function getUserMessages(userId: string) {
  return userMessages[userId] || [];
}
