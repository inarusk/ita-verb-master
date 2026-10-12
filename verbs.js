// Verb list: present tense (presente indicativo).
// Order of forms: io, tu, lui/lei, noi, voi, loro.
// type: "regular" (Level 1), "irregular" (Level 2), "reflexive" (Level 3). Level 4 uses all of them.
// To add a verb, copy a line and change it.
const VERBS = [
  // ---- Level 1: regular ----
  { type: "regular", it: "mangiare",  en: "to eat",     forms: ["mangio", "mangi", "mangia", "mangiamo", "mangiate", "mangiano"] },
  { type: "regular", it: "dormire",   en: "to sleep",   forms: ["dormo", "dormi", "dorme", "dormiamo", "dormite", "dormono"] },
  { type: "regular", it: "partire",   en: "to leave (depart)", forms: ["parto", "parti", "parte", "partiamo", "partite", "partono"] },
  { type: "regular", it: "vivere",    en: "to live",    forms: ["vivo", "vivi", "vive", "viviamo", "vivete", "vivono"] },
  { type: "regular", it: "prendere",  en: "to take",    forms: ["prendo", "prendi", "prende", "prendiamo", "prendete", "prendono"] },
  { type: "regular", it: "comprare",  en: "to buy",     forms: ["compro", "compri", "compra", "compriamo", "comprate", "comprano"] },
  { type: "regular", it: "vendere",   en: "to sell",    forms: ["vendo", "vendi", "vende", "vendiamo", "vendete", "vendono"] },
  { type: "regular", it: "lavorare",  en: "to work",    forms: ["lavoro", "lavori", "lavora", "lavoriamo", "lavorate", "lavorano"] },
  { type: "regular", it: "vedere",    en: "to see",     forms: ["vedo", "vedi", "vede", "vediamo", "vedete", "vedono"] },
  { type: "regular", it: "studiare",  en: "to study",   forms: ["studio", "studi", "studia", "studiamo", "studiate", "studiano"] },
  { type: "regular", it: "finire",    en: "to finish",  forms: ["finisco", "finisci", "finisce", "finiamo", "finite", "finiscono"] },
  { type: "regular", it: "preparare", en: "to prepare", forms: ["preparo", "prepari", "prepara", "prepariamo", "preparate", "preparano"] },
  { type: "regular", it: "preferire", en: "to prefer",  forms: ["preferisco", "preferisci", "preferisce", "preferiamo", "preferite", "preferiscono"] },
  { type: "regular", it: "scrivere",  en: "to write",   forms: ["scrivo", "scrivi", "scrive", "scriviamo", "scrivete", "scrivono"] },
  { type: "regular", it: "sentire",   en: "to hear / to feel", forms: ["sento", "senti", "sente", "sentiamo", "sentite", "sentono"] },
  { type: "regular", it: "parlare",   en: "to speak",   forms: ["parlo", "parli", "parla", "parliamo", "parlate", "parlano"] },

  // ---- Level 2: irregular ----
  { type: "irregular", it: "andare",   en: "to go",      forms: ["vado", "vai", "va", "andiamo", "andate", "vanno"] },
  { type: "irregular", it: "venire",   en: "to come",    forms: ["vengo", "vieni", "viene", "veniamo", "venite", "vengono"] },
  { type: "irregular", it: "fare",     en: "to do / to make", forms: ["faccio", "fai", "fa", "facciamo", "fate", "fanno"] },
  { type: "irregular", it: "dovere",   en: "to have to (must)", forms: ["devo", "devi", "deve", "dobbiamo", "dovete", "devono"] },
  { type: "irregular", it: "uscire",   en: "to go out",  forms: ["esco", "esci", "esce", "usciamo", "uscite", "escono"] },
  { type: "irregular", it: "volere",   en: "to want",    forms: ["voglio", "vuoi", "vuole", "vogliamo", "volete", "vogliono"] },
  { type: "irregular", it: "dire",     en: "to say / to tell", forms: ["dico", "dici", "dice", "diciamo", "dite", "dicono"] },
  { type: "irregular", it: "rimanere", en: "to remain / to stay", forms: ["rimango", "rimani", "rimane", "rimaniamo", "rimanete", "rimangono"] },
  { type: "irregular", it: "bere",     en: "to drink",   forms: ["bevo", "bevi", "beve", "beviamo", "bevete", "bevono"] },
  { type: "irregular", it: "potere",   en: "to be able to (can)", forms: ["posso", "puoi", "può", "possiamo", "potete", "possono"] },

  // ---- Level 3: reflexive (answer includes mi / ti / si / ci / vi / si) ----
  { type: "reflexive", it: "alzarsi",       en: "to get up",          forms: ["mi alzo", "ti alzi", "si alza", "ci alziamo", "vi alzate", "si alzano"] },
  { type: "reflexive", it: "svegliarsi",    en: "to wake up",         forms: ["mi sveglio", "ti svegli", "si sveglia", "ci svegliamo", "vi svegliate", "si svegliano"] },
  { type: "reflexive", it: "lavarsi",       en: "to wash oneself",    forms: ["mi lavo", "ti lavi", "si lava", "ci laviamo", "vi lavate", "si lavano"] },
  { type: "reflexive", it: "vestirsi",      en: "to get dressed",     forms: ["mi vesto", "ti vesti", "si veste", "ci vestiamo", "vi vestite", "si vestono"] },
  { type: "reflexive", it: "addormentarsi", en: "to fall asleep",     forms: ["mi addormento", "ti addormenti", "si addormenta", "ci addormentiamo", "vi addormentate", "si addormentano"] },
  { type: "reflexive", it: "pettinarsi",    en: "to comb one's hair", forms: ["mi pettino", "ti pettini", "si pettina", "ci pettiniamo", "vi pettinate", "si pettinano"] },
  { type: "reflexive", it: "annoiarsi",     en: "to get bored",       forms: ["mi annoio", "ti annoi", "si annoia", "ci annoiamo", "vi annoiate", "si annoiano"] },
  { type: "reflexive", it: "arrabbiarsi",   en: "to get angry",       forms: ["mi arrabbio", "ti arrabbi", "si arrabbia", "ci arrabbiamo", "vi arrabbiate", "si arrabbiano"] },
  { type: "reflexive", it: "divertirsi",    en: "to have fun",        forms: ["mi diverto", "ti diverti", "si diverte", "ci divertiamo", "vi divertite", "si divertono"] },
  { type: "reflexive", it: "riposarsi",     en: "to rest",            forms: ["mi riposo", "ti riposi", "si riposa", "ci riposiamo", "vi riposate", "si riposano"] },
];
