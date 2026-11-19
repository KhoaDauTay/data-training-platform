// v17 I5 interview room (L144): sets and take-homes (content/general/interview.yml). Only src/content.ts imports this, with
// import(), so it is its own lazy chunk (budget `interview`); its parser rides along, never in main.
export { default as interviewYml } from '../content/general/interview.yml?raw';
export { buildInterview } from './interview';
