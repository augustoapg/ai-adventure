export const getMockFollowupResponse = (optionChosen: string) => {
  return {
    data: {
      choices: [
        {
          message: {
            content: `{
                "desc": "This is a followup from your first option, which was ${optionChosen}",
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
};

export const getMockFirstResponse = () => {
  return {
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
};
