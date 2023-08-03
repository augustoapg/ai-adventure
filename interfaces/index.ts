export interface Scenario {
  desc: string;
  options: ScenarioOption[];
  optionChosen?: string;
}

export interface ScenarioOption {
  id: string;
  label: string;
}

export interface UserScenarios {
  [userId: string]: Scenario[];
}
