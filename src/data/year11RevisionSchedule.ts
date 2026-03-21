/**
 * Year 11 personalised revision schedule: Sep–Apr (8 months) to GCSE.
 * Monthly revision topics across all subjects.
 */

export interface MonthRevision {
  month: string;
  label: string;
  /** Short description of focus */
  focus: string;
  /** Subject id → topic ids to revise this month */
  topicsBySubject: { subjectId: string; topicIds: string[] }[];
}

export const YEAR_11_SCHEDULE: MonthRevision[] = [
  {
    month: "Sep",
    label: "September",
    focus: "Foundation: Number, Algebra basics, Forces",
    topicsBySubject: [
      { subjectId: "math", topicIds: ["number", "algebra", "linear-graphs"] },
      { subjectId: "physics", topicIds: ["forces"] },
    ],
  },
  {
    month: "Oct",
    label: "October",
    focus: "Geometry, Statistics, Materials & Reactions",
    topicsBySubject: [
      {
        subjectId: "math",
        topicIds: ["geometry", "statistics", "statistical-diagrams", "linear-graphs"],
      },
      { subjectId: "chemistry", topicIds: ["materials", "structure-bonding", "reactions"] },
    ],
  },
  {
    month: "Nov",
    label: "November",
    focus: "Biology foundations, Computer Science core",
    topicsBySubject: [
      { subjectId: "biology", topicIds: ["living-things", "cells", "humans", "plants"] },
      { subjectId: "computer-science", topicIds: ["algorithms", "programming"] },
    ],
  },
  {
    month: "Dec",
    label: "December",
    focus: "Ratio, Trigonometry, Light, Sound, Electricity",
    topicsBySubject: [
      { subjectId: "math", topicIds: ["ratio", "probability", "trigonometry"] },
      { subjectId: "physics", topicIds: ["light", "sound", "electricity", "waves"] },
    ],
  },
  {
    month: "Jan",
    label: "January",
    focus: "Energy & Motion, Particle model, Evolution",
    topicsBySubject: [
      { subjectId: "physics", topicIds: ["energy", "motion", "thermal"] },
      { subjectId: "chemistry", topicIds: ["structure-bonding", "particles"] },
      { subjectId: "biology", topicIds: ["evolution", "coordination"] },
    ],
  },
  {
    month: "Feb",
    label: "February",
    focus: "Data & Networks, Business, mixed revision",
    topicsBySubject: [
      { subjectId: "computer-science", topicIds: ["data", "networks"] },
      { subjectId: "business-studies", topicIds: ["enterprise", "money", "markets"] },
    ],
  },
  {
    month: "Mar",
    label: "March",
    focus: "Full revision – Practice questions in all subjects",
    topicsBySubject: [
      {
        subjectId: "math",
        topicIds: [
          "number",
          "algebra",
          "linear-graphs",
          "geometry",
          "statistics",
          "statistical-diagrams",
          "ratio",
          "probability",
          "trigonometry",
          "calculus",
        ],
      },
      {
        subjectId: "physics",
        topicIds: [
          "forces",
          "light",
          "sound",
          "electricity",
          "energy",
          "motion",
          "thermal",
          "waves",
        ],
      },
      {
        subjectId: "chemistry",
        topicIds: ["materials", "structure-bonding", "rocks", "reactions", "particles"],
      },
      {
        subjectId: "biology",
        topicIds: [
          "living-things",
          "cells",
          "humans",
          "plants",
          "evolution",
          "coordination",
        ],
      },
      { subjectId: "computer-science", topicIds: ["algorithms", "programming", "data", "networks"] },
      { subjectId: "business-studies", topicIds: ["enterprise", "money", "markets"] },
      { subjectId: "english", topicIds: ["reading", "writing", "spoken-language", "literature"] },
      { subjectId: "history", topicIds: ["medieval", "empire-industry", "twentieth-century", "historical-skills"] },
      { subjectId: "geography", topicIds: ["physical", "human", "uk-world", "fieldwork"] },
      { subjectId: "religious-studies", topicIds: ["beliefs-practices", "ethics"] },
      { subjectId: "french", topicIds: ["french-listening", "french-speaking-writing", "french-grammar-vocab"] },
      { subjectId: "spanish", topicIds: ["spanish-listening", "spanish-speaking-writing", "spanish-grammar-vocab"] },
      { subjectId: "german", topicIds: ["german-listening", "german-speaking-writing", "german-grammar-vocab"] },
    ],
  },
  {
    month: "Apr",
    label: "April",
    focus: "GCSE exam prep – timed practice, exam technique, final review",
    topicsBySubject: [
      {
        subjectId: "math",
        topicIds: [
          "number",
          "algebra",
          "linear-graphs",
          "geometry",
          "statistics",
          "statistical-diagrams",
          "ratio",
          "probability",
          "trigonometry",
          "calculus",
        ],
      },
      {
        subjectId: "physics",
        topicIds: [
          "forces",
          "light",
          "sound",
          "electricity",
          "energy",
          "motion",
          "thermal",
          "waves",
        ],
      },
      {
        subjectId: "chemistry",
        topicIds: ["materials", "structure-bonding", "rocks", "reactions", "particles"],
      },
      {
        subjectId: "biology",
        topicIds: [
          "living-things",
          "cells",
          "humans",
          "plants",
          "evolution",
          "coordination",
        ],
      },
      { subjectId: "computer-science", topicIds: ["algorithms", "programming", "data", "networks"] },
      { subjectId: "business-studies", topicIds: ["enterprise", "money", "markets"] },
      { subjectId: "english", topicIds: ["reading", "writing", "spoken-language", "literature"] },
      { subjectId: "history", topicIds: ["medieval", "empire-industry", "twentieth-century", "historical-skills"] },
      { subjectId: "geography", topicIds: ["physical", "human", "uk-world", "fieldwork"] },
      { subjectId: "religious-studies", topicIds: ["beliefs-practices", "ethics"] },
      { subjectId: "french", topicIds: ["french-listening", "french-speaking-writing", "french-grammar-vocab"] },
      { subjectId: "spanish", topicIds: ["spanish-listening", "spanish-speaking-writing", "spanish-grammar-vocab"] },
      { subjectId: "german", topicIds: ["german-listening", "german-speaking-writing", "german-grammar-vocab"] },
    ],
  },
];
