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

const MAX_NUMBER_OF_SCENARIOS = 3;
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
  and you shall also give 3 options but leave it open ended (giving the 3 choices, but the user should still be able to do whatever they want). Your response has to be in this JSON format:
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
  customOption: string,
  roundNumber: number,
  language: string,
): ChatCompletionRequestMessage => {
  let content = '';
  if (customOption && customOption.trim()) {
    content = `The user chose their own choice, deciding this: "${customOption}". If this choice doesn't 
    make any grammatical sense (just gibberish), just pick one of the previous options you created at random. Otherwise, even if it doesn't make
    much logical sense, find a way to create the next scenario based on this choice, as wild as it may be.`
  } else if (optionChosen) {
    content = `The user chose ${optionChosen}.`
  } else {
    content = `There was a problem and the user didn't decide on anything. Please just pick one of the previous options you created at random.`
  }
  
  content += ` Give me the next round (which is the number ${roundNumber} out of ${MAX_NUMBER_OF_SCENARIOS}). 
  Follow same response structure as last time and leave it open ended (giving the 3 choices, but the user 
    should still be able to do whatever they want).`;

  if (language !== "English") {
    content += `. Please generate every response in ${language}`
  }

  return { role: 'system', content };
};

const generateLastRoundMessage = (
  optionChosen: string,
  customOption: string,
  language: string,
): ChatCompletionRequestMessage => {
  let content = '';
  if (customOption && customOption.trim()) {
    content = `The user chose their own choice, deciding this: "${customOption}". If this choice doesn't 
    make any grammatical sense (just gibberish), just pick one of the previous options you created at random. Otherwise, even if it doesn't make
    much logical sense, find a way to create the next scenario based on this choice, as wild as it may be.`
  } else if (optionChosen) {
    content = `The user chose ${optionChosen}.`
  } else {
    content = `There was a problem and the user didn't decide on anything. Please just pick one of the previous options you created at random.`
  }
  
  content += ` Give me a conclusion for this story. Follow same response structure 
  as last time but the "options" part of the response has to be just an empty array.`;

  if (language !== "English") {
    content += `. Please generate every response in ${language}`
  }

  return { role: 'system', content };
};

const generateImageSrc = async (messages: ChatCompletionRequestMessage[]): Promise<{imgSrc: string; imgPrompt: string, imgAlt: string} | null> => {
  const messagesStr = messages.reduce((prev, msg) => { return `${prev + msg.content}` }, '');
  const content = `From the story contained in the messages, please pick a cool moment that would be a nice image
   and generate a prompt to generate an image using DALL-E 2 (less than 150 characters). The prompt should be "Give me a realistic image of..." and then replace
   the ... with the brief description of the moment you picked, giving enough details for a cool rich image.
    The story was created via chatgpt, so please use the following string which contains the story, but ignore any system messages that talks about 
    api format and things like that: **${messagesStr}**
    Please return the prompt text and an alt for the image JSON format like so: {imgPrompt: <prompt value>, imgAlt: <alt for the image>}.`

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{role: 'system', content}],
      temperature: 0.9,
    });

    const promptResponse = (response.data.choices[0]
    .message as ChatCompletionResponseMessage).content ?? null;
    console.log('promptResponse')
    console.log(promptResponse)

    if (!promptResponse) {
      return null;
    }


    const { imgPrompt, imgAlt } = JSON.parse(promptResponse)

    console.log(imgPrompt, imgAlt)

    if (!imgPrompt || !imgAlt) {
      return null;
    }

    const imageRes = await openai.createImage({ prompt: imgPrompt, n: 1, size: "512x512" });
    return {imgSrc: imageRes.data.data[0].url ?? '', imgPrompt, imgAlt};

  } catch (error: any) {
    handleAxiosError(error);
    return null;
  }
}

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
    let imgSrc: string = '';
    let imgPrompt: string = '';
    let imgAlt: string = '';
    let isLastRound = false;

    handleNewUser(req);

    const userId = (req.session.user as User).id;
    let previousMessages = getUserMessages(userId);

    const roundNumber =
      previousMessages.filter((msg) => msg.role === 'assistant').length + 1;

    // first prompt
    if (previousMessages.length === 0 || (req.body.optionChosen === undefined && req.body.customOption === undefined)) {
      newSystemMessage = generateFirstRoundMessage(theme, name, language);
    }

    // mid game rounds
    else if (roundNumber < MAX_NUMBER_OF_SCENARIOS && (req.body.optionChosen || req.body.customOption)) {
      newSystemMessage = generateNextRoundMessage(
        req.body.optionChosen,
        req.body.customOption,
        roundNumber,
        req.body.language
      );
    }

    // last round
    else {
      newSystemMessage = generateLastRoundMessage(req.body.optionChosen, req.body.customOption, req.body.language);
      isLastRound = true;
    }

    const messages = [...previousMessages, newSystemMessage];

    // TODO: temporarily disabling image creation because netlify will timeout after 10s. Maybe separate this into a different call
    // if (isLastRound) {
    //   const imgRes = await generateImageSrc(messages)

    //   if (imgRes !== null) {
    //     ({ imgSrc, imgPrompt, imgAlt } = imgRes);
    //   }
    // }

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
    if (imgSrc && imgSrc !== '') {
      scenario.imgSrc = imgSrc;
      scenario.imgAlt = imgAlt;
      scenario.imgPrompt = imgPrompt;
    }

    saveUserMessages(userId, [newSystemMessage, newAssistantMessage]);
    res.status(200).send(scenario);

    if (isLastRound) {
      clearUserMessages(userId);
    }
  }
};

export default withIronSessionApiRoute(handler, sessionOptions);
