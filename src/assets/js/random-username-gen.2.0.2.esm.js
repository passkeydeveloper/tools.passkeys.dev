/**
 * Downloaded from https://esm.unpkg.com/random-username-gen@2.0.2/src/esm/index.js
 */
// unpkg-package:/src/esm/adjectives.js
var adjectives = [
  "fast",
  "smart",
  "strong",
  "brave",
  "curious",
  "fierce",
  "gentle",
  "happy",
  "lazy",
  "mysterious",
  "bold",
  "calm",
  "determined",
  "eager",
  "fearless",
  "graceful",
  "honest",
  "intelligent",
  "jovial",
  "kind",
  "lively",
  "modest",
  "noble",
  "optimistic",
  "patient",
  "quick",
  "reliable",
  "sincere",
  "talented",
  "unique",
  "valiant",
  "wise",
  "youthful",
  "zealous",
  "adventurous",
  "careful",
  "confident",
  "dynamic",
  "enthusiastic",
  "forgiving",
  "gregarious",
  "helpful",
  "imaginative",
  "joyful",
  "knowledgeable",
  "loving",
  "nurturing",
  "observant",
  "persistent",
  "quiet",
  "resourceful",
  "sensitive",
  "thoughtful",
  "vigorous",
  "warm",
  "appreciative",
  "caring",
  "considerate",
  "diligent",
  "energetic",
  "friendly",
  "hardworking",
  "humorous",
  "innovative",
  "jolly",
  "keen",
  "loyal",
  "mindful",
  "obedient",
  "polite",
  "resilient",
  "respectful",
  "supportive",
  "trustworthy",
  "versatile",
  "witty",
  "affectionate",
  "charming",
  "courageous",
  "devoted",
  "endearing",
  "fun",
  "happy-go-lucky",
  "humble",
  "inspiring",
  "jubilant",
  "kindhearted",
  "lighthearted",
  "magnanimous",
  "openhearted",
  "passionate",
  "radiant",
  "reflective",
  "sympathetic",
  "truthful",
  "vibrant",
  "wonderful",
  "ambitious",
  "cheerful",
  "creative",
  "discerning",
  "encouraging",
  "generous"
];

// unpkg-package:/src/esm/nouns.js
var nouns = [
  "tiger",
  "eagle",
  "shark",
  "lion",
  "bear",
  "wolf",
  "fox",
  "jaguar",
  "whale",
  "giraffe",
  "panther",
  "dolphin",
  "elephant",
  "rhinoceros",
  "crocodile",
  "penguin",
  "octopus",
  "falcon",
  "hippopotamus",
  "koala",
  "gorilla",
  "kangaroo",
  "zebra",
  "tortoise",
  "otter",
  "chimpanzee",
  "mongoose",
  "leopard",
  "raccoon",
  "sloth",
  "buffalo",
  "deer",
  "seahorse",
  "owl",
  "flamingo",
  "gecko",
  "iguana",
  "turtle",
  "cobra",
  "rabbit",
  "cheetah",
  "meerkat",
  "parrot",
  "platypus",
  "anteater",
  "chameleon",
  "gazelle",
  "lemur",
  "mole",
  "orangutan",
  "peacock",
  "porcupine",
  "starfish",
  "warthog",
  "albatross",
  "beaver",
  "dove",
  "hamster",
  "lizard",
  "manatee",
  "panda",
  "polar"
];

// ../src/esm/index.js
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function generateRandomUsername(userInput, options = {}) {
  const {
    length = 50,
    separator = "-",
    wordList = "default",
    ensureUnique = false
  } = options;
  let wordLists = {
    default: {
      adjectives,
      nouns
    }
  };
  if (!wordLists[wordList]) {
    throw new Error(`Invalid word list: ${wordList}`);
  }
  const { adjectives: adjectives2, nouns: nouns2 } = wordLists[wordList];
  const uniqueSuffix = ensureUnique ? Date.now().toString(36) : "";
  let username;
  do {
    const randomAdjective = getRandomElement(adjectives2);
    const randomNoun = getRandomElement(nouns2);
    const randomNumber = Math.floor(Math.random() * 1e3);
    username = `${userInput}${separator}${randomAdjective}${separator}${randomNoun}${separator}${randomNumber}${uniqueSuffix}`.substr(0, length);
  } while (ensureUnique && !isUsernameUnique(username));
  return username;
}
function isUsernameUnique(username) {
  return true;
}
var esm_default = generateRandomUsername;
export {
  esm_default as default
};
