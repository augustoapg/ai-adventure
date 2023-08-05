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
import { getUserMessages, saveUserMessages } from './utils/storage';

const MAX_NUMBER_OF_SCENARIOS = 10;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const generateFirstRoundMessage = (): ChatCompletionRequestMessage => {
  const content = `I'm having someone play a choose your own adventure game. 
  You will be the one providing me with the story bits, which I am calling scenarios. 
  Each scenario description is not to have more than 100 words and you shall give
  be the description of the scenario followed by 3 options in JSON format:

  {
    "desc": "<DESCRIPTION OF THE SCENARIO>",
    "options": [{"id": "opt1", "label": "<option 1>"}, {"id": "opt2", "label": "<option 2>"}, {"id": "opt3", "label": "<option 3>"}]
  }

  This is the first round, so give me the beginning of a short story with 3 options, set in
  a fantasy world where the main character's name is Liam. The whole short story will end in ${MAX_NUMBER_OF_SCENARIOS} rounds
  no matter what choice the user chooses, so create an exciting short story. For the next requests I will just tell you the option chosen
  and you will give me the same format with the continuation of the story.`;

  return { role: 'system', content };
};

const generateNextRoundMessage = (
  optionChosen: string,
  roundNumber: number,
): ChatCompletionRequestMessage => {
  const content = `The user chose ${optionChosen}. Give me the next round (which is the number ${roundNumber} out of ${MAX_NUMBER_OF_SCENARIOS}). Follow same response structure as last time.`;

  return { role: 'system', content };
};

const generateLastRoundMessage = (
  optionChosen: string,
): ChatCompletionRequestMessage => {
  const content = `The user chose ${optionChosen}. Give me a conclusion for this story. Follow same response structure as last time but the "options" part of the response should be just an empty array.`;

  return { role: 'system', content };
};

const handler: NextApiHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<Scenario | { error: { message: string } }>,
) => {
  if (req.method === 'POST') {
    if (!configuration.apiKey) {
      res.status(500).json({
        error: {
          message:
            'OpenAI API key not configured, please follow instructions in README.md',
        },
      });
      return;
    }

    const isNewUser = req.session.user?.id === undefined;

    if (isNewUser) {
      const user: User = { isLoggedIn: true, id: randomUUID() };
      req.session.user = user;
      await req.session.save();
    }

    const userId = (req.session.user as User).id;
    let previousMessages = getUserMessages(userId);
    const roundNumber =
      previousMessages.filter((msg) => msg.role === 'assistant').length + 1;

    let response;

    if (
      previousMessages.length > 0 &&
      roundNumber < MAX_NUMBER_OF_SCENARIOS &&
      req.body.optionChosen
    ) {
      const newSystemMessage = generateNextRoundMessage(
        req.body.optionChosen,
        roundNumber,
      );
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

      saveUserMessages(req.session.user?.id as string, [
        ...messages,
        newAssistantMessage,
      ]);
      res.status(200).send(scenario);
    }

    // first prompt
    else if (previousMessages.length === 0) {
      const firstRoundMessage = generateFirstRoundMessage();
      try {
        response = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [firstRoundMessage],
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

      saveUserMessages(req.session.user?.id as string, [
        firstRoundMessage,
        newAssistantMessage,
      ]);
      res.status(200).send(scenario);
    }

    // last round
    else {
      const newSystemMessage = generateLastRoundMessage(req.body.optionChosen);
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

      saveUserMessages(req.session.user?.id as string, [
        ...messages,
        newSystemMessage,
      ]);
      res.status(200).send(scenario);
    }
  }
};

export default withIronSessionApiRoute(handler, sessionOptions);
