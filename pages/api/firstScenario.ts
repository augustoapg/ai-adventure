import { Scenario } from '@/interfaces';
import { sessionOptions } from '@/lib/session';
import { randomUUID } from 'crypto';
import { withIronSessionApiRoute } from 'iron-session/next';
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { Configuration, OpenAIApi } from 'openai';
import { User } from './user';
import { handleAxiosError } from './utils/errors';
import { saveUserScenarios } from './utils/storage';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

function generatePrompt() {
  return `I'm having someone play a choose your own adventure game. 
  You will be the one providing me with the story bits, which I am calling scenarios. 
  Each scenario description is not to have more than 100 words and you shall give
  be the description of the scenario followed by 3 options in JSON format:

  {
    "desc": "<DESCRIPTION OF THE SCENARIO>",
    "options": [{"id": "", "label": "<option 1>"}, {"id": "", "label": "<option 2>"}, {"id": "", "label": "<option 3>"}]
  }

  This is the first round, so give me the beginning of a short story with 3 options, set in
  a fantasy world where the main character's name is Liam. The whole short story will end in 10 rounds
  no matter what choice the user chooses, so create an exciting short story.`;
}

const handler: NextApiHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<Scenario | { error: { message: string } }>,
) => {
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message:
          'OpenAI API key not configured, please follow instructions in README.md',
      },
    });
    return;
  }

  const userId = req.session.user?.id; // Access the session ID
  
  if (!userId) {
    const user: User = { isLoggedIn: true, id: randomUUID() };
    req.session.user = user;
    await req.session.save();
  }

  let response;

  try {
    // response = await openai.createChatCompletion({
    //   model: 'gpt-3.5-turbo',
    //   messages: [{ role: 'system', content: generatePrompt() }],
    //   temperature: 0.6,
    // });
    response = {
      data: {
        choices: [
          {
            message: {
              content: `{
                  "desc": "You are Liam, a young adventurer living in the kingdom of Eldoria. One day, while exploring the ancient forests, you stumble upon a hidden cave entrance. Curiosity takes hold of you, and you decide to venture inside. As you step into the darkness, you hear a faint whisper coming from the depths of the cave.",
                  "options": [
                    {"id": "option1", "label": "Follow the whisper"},
                    {"id": "option2", "label": "Light a torch and proceed cautiously"},
                    {"id": "option3", "label": "Leave the cave and continue exploring the forest"}
                  ]
                }`,
            },
          },
        ],
      },
    };
  } catch (error: any) {
    handleAxiosError(error);
    return;
  }

  const scenarioJSON = response.data.choices[0].message?.content;

  if (!scenarioJSON) {
    return res
      .status(500)
      .json({ error: { message: 'scenario not generated' } });
  }

  const scenario: Scenario = JSON.parse(scenarioJSON);
  scenario.options = scenario.options.map((opt) => ({
    ...opt,
    id: randomUUID(),
  }));

  saveUserScenarios(req.session.user?.id as string, scenario);
  res.status(200).send(scenario);
};

export default withIronSessionApiRoute(handler, sessionOptions);
