import { Scenario } from '@/interfaces';
import { sessionOptions } from '@/lib/session';
import { randomUUID } from 'crypto';
import { withIronSessionApiRoute } from 'iron-session/next';
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import {
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
  Configuration,
  OpenAIApi,
} from 'openai';
import { User } from './user';
import { handleAxiosError } from './utils/errors';
import {
  clearUserMessages,
  getUserMessages,
  saveUserMessages,
} from './utils/storage';

const MAX_NUMBER_OF_SCENARIOS = 10;
const MAX_WORDS_PER_DESC = 100;

const KEY_ERROR = {
  error: {
    message:
      'OpenAI API key not configured, please follow instructions in README.md',
  },
};

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Creates user session with id if new user. Also returns boolean
 * to say if user is new or not.
 * @param req NextApiRequest
 * @returns true if user is new or false if not
 */
const handleNewUser = async (req: NextApiRequest) => {
  const isNewUser = req.session.user?.id === undefined;

  if (isNewUser) {
    const user: User = { isLoggedIn: true, id: randomUUID() };
    req.session.user = user;
    await req.session.save();
  }

  return isNewUser;
};

const openai = new OpenAIApi(configuration);

const generateFirstRoundMessage = (
  theme: string, name: string, language: string
): ChatCompletionRequestMessage => {
  let content = `I'm having someone play a choose your own adventure game. 
  You will be the one providing me with the scenarios. 
  The desc of the scenario should not have more than ${MAX_WORDS_PER_DESC} words 
  and you shall also give 3 options. Your response has to be in this JSON format:
  {
    "desc": "<DESCRIPTION OF THE SCENARIO>",
    "options": [{"id": "opt1", "label": "<option 1>"}, ...]
  }

  Now give me the beginning of a short story with 3 options (in the above format), with the theme of ${theme} where the main character's name is ${name}.
  The whole story will end in ${MAX_NUMBER_OF_SCENARIOS} rounds, so create an exciting short story.`;

  if (language !== "English") {
    content += `. Please generate every response in ${language}`
  }

  return { role: 'system', content };
};

const generateNextRoundMessage = (
  optionChosen: string,
  roundNumber: number,
): ChatCompletionRequestMessage => {
  const content = `The user chose ${optionChosen}. 
  Give me the next round (which is the number ${roundNumber} out of ${MAX_NUMBER_OF_SCENARIOS}). 
  Follow same response structure as last time.`;

  return { role: 'system', content };
};

const generateLastRoundMessage = (
  optionChosen: string,
): ChatCompletionRequestMessage => {
  const content = `The user chose ${optionChosen}. 
  Give me a conclusion for this story. Follow same response structure 
  as last time but the "options" part of the response should be just an empty array.`;

  return { role: 'system', content };
};

const handler: NextApiHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<Scenario | { error: { message: string } }>,
) => {
  if (req.method === 'POST') {
    const theme = req.body.theme || "Fantasy";
    const name = req.body.name || "Liam";
    const language = req.body.language || "english";

    console.log(req.body);
    if (!configuration.apiKey) {
      res.status(500).json(KEY_ERROR);
      return;
    }
    let response;
    let newSystemMessage: ChatCompletionRequestMessage;
    let isLastRound = false;

    handleNewUser(req);

    const userId = (req.session.user as User).id;
    let previousMessages = getUserMessages(userId);

    const roundNumber =
      previousMessages.filter((msg) => msg.role === 'assistant').length + 1;

    // first prompt
    if (previousMessages.length === 0 || req.body.optionChosen === undefined) {
      newSystemMessage = generateFirstRoundMessage(theme, name, language);
    }

    // mid game rounds
    else if (roundNumber < MAX_NUMBER_OF_SCENARIOS && req.body.optionChosen) {
      newSystemMessage = generateNextRoundMessage(
        req.body.optionChosen,
        roundNumber,
      );
    }

    // last round
    else {
      newSystemMessage = generateLastRoundMessage(req.body.optionChosen);
      isLastRound = true;
    }

    const messages = [...previousMessages, newSystemMessage];

    try {
      response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.9,
      });
    } catch (error: any) {
      handleAxiosError(error);
      return;
    }

    const newAssistantMessage = response.data.choices[0]
      .message as ChatCompletionResponseMessage;

    const scenarioJSON = newAssistantMessage.content;

    if (!scenarioJSON) {
      return res
        .status(500)
        .json({ error: { message: 'scenario not generated' } });
    }

    const scenario: Scenario = JSON.parse(scenarioJSON);

    saveUserMessages(userId, [newSystemMessage, newAssistantMessage]);
    res.status(200).send(scenario);

    if (isLastRound) {
      clearUserMessages(userId);
    }
  }
};

export default withIronSessionApiRoute(handler, sessionOptions);
