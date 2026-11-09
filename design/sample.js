// Kate Marshall's MVP test article, for previewing the panel without Chrome or
// the API (design/preview.html). Only the paragraphs the samples quote are here.
// https://katebmarshall.substack.com/p/before-you-turn-on-your-ai-agentdo
//
// Pull quote is her words, copied exactly. The other lenses are sample drafts in
// the style each lens asks for, built only from what's on her page. `fit` is how
// the Worker might rate this article for each lens. `drafted` is kept for the
// flagged screen.
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
    line: [
      'Every major AI company now offers a personal AI agent, and each one asks for access to your files, email, and calendar on day one. Most people will say yes to all of it before they think about what those accounts hold.',
      'Be most careful with email. An agent with full inbox access can see the password reset links for your other accounts.',
    ],
    story: [
      'You open your drive. Tax returns. Passwords in a file called “misc.” Contracts with client names. An old performance review.\n\nThen you connect an AI agent to all of it. Ewhhh….',
    ],
    lesson: [
      'I test every new AI agent on something very low risk first, like research or content creation. You still get a feel for how it works, without connecting all of your data.',
    ],
    take: [
      'Everyone’s asking which AI agent is smartest.\n\nWrong question. That answer changes every few weeks. What the agent can see and do once you connect it matters on every bot.',
    ],
    question: [
      'What’s in your drive right now?\n\nTax returns. Passwords in a file called “misc.” Contracts with client names. Connect an AI agent to your whole drive and it can read all of it.',
    ],
    howto: [
      'Before you turn on an AI agent:\n\n1. Pick one job.\n2. Keep work files out without approval.\n3. Turn on multi-factor authentication.\n4. Start with your calendar, not your email.\n5. Practise on something low risk.',
    ],
    cliffhanger: [
      'Every AI agent asks for your files, email and calendar on day one. Most people say yes before they think about what those accounts hold.\n\nDo this first.',
    ],
    confession: [
      'I don’t hand a new AI agent my data. I test it on something very low risk first, like research or content creation.',
    ],
    scene: [
      'A drive. Tax returns. Passwords saved in a file called “misc.” An old performance review.\n\nAnd an AI agent that can read all of it.',
    ],
    behind: [
      'Everyone’s writing about which AI bot to choose. I wanted to write about what matters on every bot: what it can see once you connect it.',
    ],
    pickup: [
      'Are you my calendar? Because I’d give you access on day one, but I’m keeping my inbox to myself for now.',
      'You must be a low-risk test run, because I want to start with you before I connect everything else.',
    ],
    dialogue: [
      '“Help me with my work.”\n\nThat’s what most of us ask an AI agent. It’s too broad to set limits on. Pick one job instead.',
    ],
  },
  fit: {
    story: { level: 'thin', reason: 'There’s one moment, the drive full of tax returns, but it isn’t told as a story.' },
    lesson: { level: 'strong', reason: 'You say what you do, and why.' },
    take: { level: 'strong', reason: 'You argue the usual question, which bot to choose, is the wrong one.' },
    question: { level: 'strong', reason: 'The piece answers a question readers already have.' },
    howto: { level: 'strong', reason: 'There are seven numbered steps here to work from.' },
    cliffhanger: { level: 'strong', reason: 'There’s a clear setup, with the steps as the payoff.' },
    confession: { level: 'thin', reason: 'There’s only one small personal admission here.' },
    scene: { level: 'thin', reason: 'The drive full of tax returns is the only vivid image here.' },
    behind: { level: 'none', reason: 'This page doesn’t say why or how you wrote it.' },
    dialogue: { level: 'none', reason: 'No one speaks on this page.' },
  },
  drafted: 'Giving an AI agent your inbox means giving it the password reset links for your other accounts. Start with your calendar or one folder instead.',
  // One sample per output format beyond the X post, whatever the lens.
  formats: {
    thread: thread([
      'Every major AI company now offers a personal AI agent, and each one asks for access to your files, email, and calendar on day one.\n\nMost people say yes before they think about what those accounts hold.',
      'Think about what is in your drive right now. Tax returns. Passwords saved in a file called “misc.” Contracts with client names.\n\nConnect an agent to your whole drive and it can read all of it.',
      'Pick one job. The job decides what access the agent needs. “Help me with my work” is too broad to set limits on.',
      'Be most careful with email. An agent with full inbox access can see the password reset links for your other accounts. Start with your calendar or one folder.',
    ]),
    feed: {
      post: 'Every major AI company now offers a personal AI agent, and each one asks for access to your files, email, and calendar on day one.\n\nMost of the conversation is about which bot to choose. But that answer changes every few weeks.\n\nWhat the agent can see and do once you connect it matters on every bot, including the ones that launch next month.',
    },
    essay: {
      post: [
        'Before you turn on your AI agent',
        'Every major AI company now offers a personal AI agent, and each one asks for access to your files, email, and calendar on day one. Most people will say yes to all of it before they think about what those accounts hold.',
        'Think about what is in your drive right now. Tax returns. Passwords saved in a file called “misc.” Contracts with client names. An old performance review. If you connect an agent to your whole drive, it can read all of it.',
        'Most of the conversation right now is about which bot to choose. Which model is smartest. Which one connects to the most apps. Which one costs less. Those are good questions, but the answer changes every few weeks. What the agent can see and do once you connect it matters on every bot, including the ones that launch next month.',
        'Pick one job',
        'The job decides what access the agent needs. “Help me with my work” is too broad to set limits on.',
        'Check your work AI policy',
        'Do not connect your work email, work drive, or client files to a personal agent without approval. Many companies have rules about which AI tools can touch company data.',
        'Turn on multi-factor authentication',
        'Turn it on for every account the agent connects to. If someone breaks into one of those accounts, they get the agent’s access too.',
        'Be most careful with email',
        'An agent with full inbox access can see the password reset links for your other accounts. Start with your calendar or one folder. Add email later, only if the job needs it.',
        'Practise on something low risk',
        'I usually test my agents on something very low risk, like research or content creation. You can still get a sense of the features and how it will function for you without having to connect all of your data.',
      ].join('\n\n'),
    },
    shorts: {
      post: [
        'Every major AI company now offers a personal AI agent. And each one asks for your files, your email and your calendar on day one.',
        'Most people say yes to all of it before they think about what those accounts hold.',
        'So think about your drive right now. Tax returns. Passwords saved in a file called “misc.” Contracts with client names. An old performance review. Connect an agent to your whole drive, and it can read all of it.',
        'Everyone’s arguing about which bot to choose. Which model is smartest. Which one costs less. But that answer changes every few weeks. What the agent can see and do once you connect it matters on every bot.',
        'So before you turn one on, pick one job. The job decides what access the agent needs. “Help me with my work” is too broad to set limits on.',
        'Turn on multi-factor authentication for every account it connects to.',
        'And be most careful with email. An agent with full inbox access can see the password reset links for your other accounts. Start with your calendar or one folder.',
        'Then do a practice run with something low risk, like research.',
      ].join('\n\n'),
    },
    instagram: {
      post: 'Think about what is in your drive right now.\n\nTax returns. Passwords saved in a file called “misc.” Contracts with client names. An old performance review.\n\nIf you connect an AI agent to your whole drive, it can read all of it.\n\nSo before you turn one on, pick one job. The job decides what access the agent needs. Start with your calendar or one folder, and add email later, only if the job needs it.',
    },
  },
};

function thread(posts) {
  return { post: posts.join('\n\n'), posts };
}
