// Spell Fixer — Auto-correct Map (~200 common typos)
// Exposed as window.AUTOCORRECT_MAP
window.AUTOCORRECT_MAP = {
  // ── Keyboard transpositions ──
  "teh":"the",       "hte":"the",        "tthe":"the",
  "adn":"and",       "nad":"and",        "andd":"and",
  "taht":"that",     "thta":"that",
  "waht":"what",     "whta":"what",
  "wnat":"want",     "iwth":"with",      "wiht":"with",
  "amke":"make",     "mkae":"make",
  "ahve":"have",     "hvae":"have",
  "jsut":"just",     "yuo":"you",        "yuor":"your",
  "btu":"but",       "tiem":"time",      "smae":"same",
  "shoudl":"should", "coudl":"could",    "woudl":"would",
  "alwasy":"always", "od":"do",
  "peocple":"people","peopl":"people",   "thier":"their",
  "strenght":"strength",                 "sytax":"syntax",

  // ── Common misspellings ──
  "becuase":"because",       "becasue":"because",
  "recieve":"receive",       "recieved":"received",
  "beleive":"believe",       "beleived":"believed",
  "seperate":"separate",     "seperated":"separated",
  "definately":"definitely", "definatly":"definitely",
  "occured":"occurred",      "occuring":"occurring",
  "untill":"until",
  "wich":"which",
  "freind":"friend",         "freinds":"friends",
  "goverment":"government",
  "tommorrow":"tomorrow",    "tomorow":"tomorrow",
  "wierd":"weird",
  "neccessary":"necessary",  "neccesary":"necessary",  "necesary":"necessary",
  "begining":"beginning",
  "calender":"calendar",
  "catagory":"category",
  "cemetary":"cemetery",
  "committment":"commitment",
  "compitition":"competition",
  "concious":"conscious",
  "dissapear":"disappear",   "disapear":"disappear",
  "embarass":"embarrass",    "embarrased":"embarrassed",
  "enviroment":"environment",
  "equiptment":"equipment",
  "existance":"existence",
  "foriegn":"foreign",
  "fourty":"forty",
  "gaurd":"guard",
  "grammer":"grammar",
  "harrass":"harass",
  "hieght":"height",
  "immediatley":"immediately","imediately":"immediately",
  "independance":"independence","independant":"independent",
  "intresting":"interesting",
  "knowlege":"knowledge",
  "libary":"library",
  "lisence":"license",
  "maintainance":"maintenance",
  "millenium":"millennium",
  "miniscule":"minuscule",
  "mischievious":"mischievous",
  "noticable":"noticeable",
  "occassion":"occasion",    "ocassion":"occasion",
  "occurance":"occurrence",
  "perseverence":"perseverance",
  "privelege":"privilege",   "priviledge":"privilege",
  "questionaire":"questionnaire",
  "reccomend":"recommend",   "recomend":"recommend",
  "relevent":"relevant",
  "rythm":"rhythm",
  "seige":"siege",
  "suprise":"surprise",      "suprised":"surprised",
  "tendancy":"tendency",
  "tounge":"tongue",
  "truely":"truly",
  "vaccum":"vacuum",
  "wether":"whether",
  "writting":"writing",
  "arguement":"argument",
  "acheive":"achieve",       "acheived":"achieved",
  "accomodate":"accommodate","acommodate":"accommodate",
  "accross":"across",
  "adress":"address",
  "aggresive":"aggressive",  "agressive":"aggressive",
  "apparantly":"apparently",
  "appearence":"appearance",
  "basicaly":"basically",    "basicly":"basically",
  "buisness":"business",
  "changable":"changeable",
  "colleage":"colleague",
  "comming":"coming",
  "commited":"committed",
  "completly":"completely",
  "convinient":"convenient", "convienient":"convenient",
  "desparate":"desperate",
  "differant":"different",
  "excercise":"exercise",
  "experiance":"experience", "expereince":"experience",
  "familier":"familiar",
  "finaly":"finally",
  "greatful":"grateful",
  "guarentee":"guarantee",   "guarenteed":"guaranteed",
  "happend":"happened",
  "humerous":"humorous",
  "imaginery":"imaginary",
  "incidently":"incidentally",
  "innoculate":"inoculate",
  "inteligence":"intelligence",
  "irresistable":"irresistible",
  "jewelery":"jewelry",
  "langauge":"language",     "langugage":"language",
  "liesure":"leisure",
  "lightening":"lightning",
  "mathmatics":"mathematics",
  "memeber":"member",
  "neice":"niece",
  "nieghbor":"neighbor",
  "ommit":"omit",            "ommited":"omitted",
  "openning":"opening",
  "oppurtunity":"opportunity","opportunty":"opportunity",
  "outragous":"outrageous",
  "paralel":"parallel",      "paralell":"parallel",
  "parliment":"parliament",
  "passtime":"pastime",
  "peice":"piece",
  "percieve":"perceive",
  "permenant":"permanent",
  "persistance":"persistence",
  "posession":"possession",
  "potatos":"potatoes",
  "prefered":"preferred",
  "presance":"presence",
  "professer":"professor",
  "prominant":"prominent",
  "pronounciation":"pronunciation",
  "propoganda":"propaganda",
  "publically":"publicly",
  "realy":"really",
  "receit":"receipt",
  "refering":"referring",
  "religous":"religious",
  "remeber":"remember",
  "repitition":"repetition",
  "resistence":"resistance",
  "resteraunt":"restaurant", "resturant":"restaurant",
  "retrive":"retrieve",
  "sandwhich":"sandwich",
  "scedule":"schedule",
  "scisors":"scissors",
  "similer":"similar",
  "speach":"speech",
  "specificaly":"specifically",
  "studing":"studying",
  "succesful":"successful",  "successfull":"successful",
  "sucess":"success",
  "sufficiant":"sufficient",
  "symtom":"symptom",
  "tecnology":"technology",
  "temperment":"temperament",
  "terroist":"terrorist",
  "threshhold":"threshold",
  "tomatos":"tomatoes",
  "tradgedy":"tragedy",
  "tyrany":"tyranny",
  "unfortunatley":"unfortunately","unfortuante":"unfortunate",
  "usefull":"useful",
  "usualy":"usually",
  "varient":"variant",
  "vegatable":"vegetable",
  "visable":"visible",
  "volunter":"volunteer",
  "vulernable":"vulnerable",
  "wellcome":"welcome",
  "wonderfull":"wonderful",
};

// Spell Fixer — Spell Checker Engine
// Requires: dictionary.js (window.SPELL_DICT)
// Exposes: window.isCorrect(word, userWords) and window.getSuggestions(word, userWords)

(function () {
  'use strict';

  // ── Skip Patterns ────────────────────────────────────────────────────────────
  const RE_ALL_CAPS    = /^[A-Z]{2,}$/;
  const RE_HAS_DIGIT   = /\d/;
  const RE_CAMEL_CASE  = /[a-z][A-Z]/;
  const RE_EMAIL       = /@/;
  const RE_URL         = /^https?:\/\//i;
  const RE_DOMAIN_LIKE = /^\w+\.\w{2,}$/;

  function shouldSkip(word) {
    if (!word || word.length < 2)  return true;
    if (RE_ALL_CAPS.test(word))    return true;
    if (RE_HAS_DIGIT.test(word))   return true;
    if (RE_CAMEL_CASE.test(word))  return true;
    if (RE_EMAIL.test(word))       return true;
    if (RE_URL.test(word))         return true;
    if (RE_DOMAIN_LIKE.test(word)) return true;
    return false;
  }

  // ── Normalise a word for dictionary lookup ───────────────────────────────────
  function normalise(word) {
    return word.toLowerCase()
      .replace(/[^a-z']/g, '')  // strip non-alpha except apostrophe
      .replace(/^'+|'+$/g, '')  // strip leading/trailing apostrophes
      .replace(/'s$/, '');      // strip possessive ('s) so "John's" → "john"
  }

  // ── isCorrect ────────────────────────────────────────────────────────────────
  /**
   * @param {string} word        – raw word as typed (may have mixed case)
   * @param {string[]} userWords – extra words from chrome.storage
   * @returns {boolean}
   */
  window.isCorrect = function isCorrect(word, userWords) {
    if (shouldSkip(word)) return true;
    const w = normalise(word);
    if (!w) return true;
    if (window.SPELL_DICT.has(w)) return true;
    if (userWords && userWords.includes(w)) return true;
    return false;
  };

  // ── Soundex ──────────────────────────────────────────────────────────────────
  const SOUNDEX_MAP = {
    B:1,F:1,P:1,V:1,
    C:2,G:2,J:2,K:2,Q:2,S:2,X:2,Z:2,
    D:3,T:3,
    L:4,
    M:5,N:5,
    R:6
  };

  function soundex(word) {
    if (!word) return '';
    const w = word.toUpperCase();
    let code = w[0];
    let prev = SOUNDEX_MAP[w[0]] || 0;
    for (let i = 1; i < w.length && code.length < 4; i++) {
      const c = w[i];
      if (c === 'H' || c === 'W') continue;
      const digit = SOUNDEX_MAP[c] || 0;
      if (digit && digit !== prev) code += digit;
      prev = digit;
    }
    return (code + '000').slice(0, 4);
  }

  // Build phonetic index once SPELL_DICT is ready
  const phoneticIndex = new Map();
  window.SPELL_DICT.forEach(w => {
    const code = soundex(w);
    if (!phoneticIndex.has(code)) phoneticIndex.set(code, []);
    phoneticIndex.get(code).push(w);
  });

  // ── Levenshtein Distance ─────────────────────────────────────────────────────
  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    // Single-row optimisation (two-row DP)
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    let curr = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          curr[j] = prev[j - 1];
        } else {
          curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
        }
      }
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  }

  // ── getSuggestions ───────────────────────────────────────────────────────────
  /**
   * @param {string} word        – raw word as typed
   * @param {string[]} userWords – extra words from chrome.storage
   * @returns {{ word: string, dist: number }[]} – up to 5, sorted asc by dist
   */
  window.getSuggestions = function getSuggestions(word, userWords) {
    if (shouldSkip(word)) return [];
    const w = normalise(word);
    if (!w) return [];

    const seen = new Map(); // word → best dist

    // ── Levenshtein pass (dictionary only, capped) ────────────────────────────
    let compared = 0;
    const MAX_COMPARE = 10000;

    for (const candidate of window.SPELL_DICT) {
      if (compared >= MAX_COMPARE) break;
      if (Math.abs(candidate.length - w.length) > 2) continue;
      const dist = levenshtein(w, candidate);
      compared++;
      if (dist <= 3) {
        if (!seen.has(candidate) || seen.get(candidate) > dist) {
          seen.set(candidate, dist);
        }
      }
    }

    // ── userWords — always checked in full (never capped) ────────────────────
    for (const uw of (userWords || [])) {
      if (Math.abs(uw.length - w.length) > 2) continue;
      const dist = levenshtein(w, uw);
      if (dist <= 3) {
        if (!seen.has(uw) || seen.get(uw) > dist) seen.set(uw, dist);
      }
    }

    // ── Phonetic pass — add any same-soundex words not yet found ─────────────
    const inputCode = soundex(w);
    const phoneticMatches = phoneticIndex.get(inputCode) || [];
    for (const candidate of phoneticMatches) {
      if (!seen.has(candidate)) {
        seen.set(candidate, levenshtein(w, candidate));
      }
    }
    for (const uw of (userWords || [])) {
      if (!seen.has(uw) && soundex(uw) === inputCode) {
        seen.set(uw, levenshtein(w, uw));
      }
    }

    // ── Sort: distance asc, then phonetic matches before non-phonetic, then alpha
    const phoneticSet = new Set(phoneticMatches);
    const results = [];
    seen.forEach((dist, candidate) => results.push({ word: candidate, dist }));
    results.sort(function (a, b) {
      if (a.dist !== b.dist) return a.dist - b.dist;
      const aP = phoneticSet.has(a.word) ? 0 : 1;
      const bP = phoneticSet.has(b.word) ? 0 : 1;
      if (aP !== bP) return aP - bP;
      return a.word.localeCompare(b.word);
    });
    return results.slice(0, 5);
  };
})();
