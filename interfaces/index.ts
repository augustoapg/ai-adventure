import { ChatCompletionRequestMessage } from 'openai';

export interface Scenario {
  desc: string;
  options: ScenarioOption[];
  optionChosen?: string;
}

export interface ScenarioOption {
  id: string;
  label: string;
}

export interface UserMessages {
  [userId: string]: ChatCompletionRequestMessage[];
}
