// Kate Marshall's MVP test article, for previewing the popup without Chrome or
// the API (design/preview.html). Only the paragraphs the samples quote are here.
// https://katebmarshall.substack.com/p/before-you-turn-on-your-ai-agentdo
//
// Every hook is her words, copied exactly. A mood only changes which passage is
// picked and where the lines break, never a word. `drafted` is the one exception:
// it shows how the popup flags a post that isn't word for word.
const paragraphs = [
  'Every major AI company now offers a personal AI agent, and each one asks for access to your files, email, and calendar on day one. Most people will say yes to all of it before they think about what those accounts hold.',
  'Think about what is in your drive right now. Tax returns. Passwords saved in a file called “misc.” Contracts with client names. An old performance review. If you connect an agent to your whole drive, it can read all of it. Ewhhh….',
  'Most of the conversation right now is about which bot to choose. Which model is smartest. Which one connects to the most apps. Which one costs less.',
  'Those are good questions, but the answer changes every few weeks. What the agent can see and do once you connect it matters on every bot, including the ones that launch next month.',
  '1. Pick one job. The job decides what access the agent needs. “Help me with my work” is too broad to set limits on.',
  '3. Check your work AI policy. Do not connect your work email, work drive, or client files to a personal agent without approval. Many companies have rules about which AI tools can touch company data.',
  '5. Turn on multi-factor authentication. Turn it on for every account the agent connects to. If someone breaks into one of those accounts, they get the agent’s access too.',
  'Be most careful with email. An agent with full inbox access can see the password reset links for your other accounts. Start with your calendar or one folder. Add email later, only if the job needs it.',
  '7. Do a practice run with something low risk. I usually test my agents on something very low risk, like research or content creation. You can still get a sense of the features and how it will function for you without having to connect all of your data.',
];

export const SAMPLE = {
  page: {
    title: 'Before you turn on your AI agent...do this first',
    url: 'https://katebmarshall.substack.com/p/before-you-turn-on-your-ai-agentdo',
    text: paragraphs.join('\n\n'),
  },
  hooks: {
    elegant: [
      'Every major AI company now offers a personal AI agent, and each one asks for access to your files, email, and calendar on day one. Most people will say yes to all of it before they think about what those accounts hold.',
      'Most of the conversation right now is about which bot to choose. Which model is smartest. Which one connects to the most apps. Which one costs less.',
    ],
    calm: [
      'Those are good questions, but the answer changes every few weeks. What the agent can see and do once you connect it matters on every bot, including the ones that launch next month.',
      'I usually test my agents on something very low risk, like research or content creation. You can still get a sense of the features and how it will function for you without having to connect all of your data.',
    ],
    light: [
      'Think about what is in your drive right now. Tax returns. Passwords saved in a file called “misc.” Contracts with client names. An old performance review. If you connect an agent to your whole drive, it can read all of it. Ewhhh….',
      '“Help me with my work” is too broad to set limits on.',
    ],
    serious: [
      'Be most careful with email. An agent with full inbox access can see the password reset links for your other accounts.',
      'Do not connect your work email, work drive, or client files to a personal agent without approval. Many companies have rules about which AI tools can touch company data.',
    ],
    dramatic: [
      'Think about what is in your drive right now.\n\nTax returns.\nPasswords saved in a file called “misc.”\nContracts with client names.\nAn old performance review.\n\nIf you connect an agent to your whole drive, it can read all of it.',
      'If someone breaks into one of those accounts,\n\nthey get the agent’s access too.',
    ],
    beast: [
      'Every major AI company now offers a personal AI agent,\n\nand each one asks for access to your files, email, and calendar on day one.\n\nMost people will say yes to all of it.',
      'An agent with full inbox access can see the password reset links for your other accounts.',
    ],
    tiktok: [
      'Think about what is in your drive right now.\n\nIf you connect an agent to your whole drive, it can read all of it.',
      'Be most careful with email.\n\nAn agent with full inbox access can see the password reset links for your other accounts.',
    ],
  },
  drafted: 'Giving an AI agent your inbox means giving it the password reset links for your other accounts. Start with your calendar or one folder instead.',
};
