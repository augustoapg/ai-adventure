import { ChatCompletionRequestMessage } from 'openai';

export interface Scenario {
  desc: string;
  options: ScenarioOption[];
  optionChosen?: string;
  imgSrc?: string;
  imgAlt?: string;
  imgPrompt?: string;
}

export interface ScenarioOption {
  id: string;
  label: string;
}

export interface UserMessages {
  [userId: string]: ChatCompletionRequestMessage[];
}
