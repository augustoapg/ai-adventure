import { Scenario, UserScenarios } from '@/interfaces';

const userScenarios: UserScenarios = {}; // In-memory storage (for now)

export const saveUserScenarios = (userId: string, scenario: Scenario) => {
  if (!userScenarios[userId]) {
    userScenarios[userId] = [];
  }

  userScenarios[userId].push(scenario);
};

export function getUserScenarios(userId: string) {
  return userScenarios[userId] || [];
}
