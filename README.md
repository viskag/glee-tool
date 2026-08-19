# GLEE Study Builder

A proof-of-concept questionnaire builder for serious game evaluation using the GLEE framework.

## Run locally

```bash
npm install
npm run dev
```

The current MVP is a client-side study builder and participant preview. It models Background, one reusable Knowledge test, and Game UX sections. During participant preview, the test is shown before the game and reused after the game with randomized question and answer order; responses are keyed by phase while preserving the same question IDs for pre/post scoring. Questions also support learning objectives, Bloom taxonomy, answer keys, and optional GLEE constructs. The next product step is to move this model behind a database/API and add participant response persistence.
