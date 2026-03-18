/**
 * Learning Academy – UK curriculum Year 7–11, progressing to GCSE exam prep.
 * Structure: Year → Subject → Topic → (Explain, Lessons, Practice, Assessment).
 */

export type UKYear = 7 | 8 | 9 | 10 | 11;

export const UK_YEARS: { value: UKYear; label: string; ageRange: string }[] = [
  { value: 7, label: "Year 7", ageRange: "11–12" },
  { value: 8, label: "Year 8", ageRange: "12–13" },
  { value: 9, label: "Year 9", ageRange: "13–14" },
  { value: 10, label: "Year 10", ageRange: "14–15" },
  { value: 11, label: "Year 11", ageRange: "15–16" },
];

export const GCSE_EXAM_PREP_LABEL = "GCSE exam prep";

export interface CurriculumTopic {
  id: string;
  title: string;
  description: string;
  /** Years this topic is typically covered (e.g. [5, 6, 7] for algebra) */
  years: UKYear[];
  /** Order within subject for display */
  order: number;
}

export interface CurriculumSubject {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  emoji: string;
  color: string;
  topics: CurriculumTopic[];
}

/** Math topics: from number basics through to GCSE (algebra, trigonometry, calculus, etc.) */
const MATH_TOPICS: CurriculumTopic[] = [
  { id: "number", title: "Number", description: "Place value, four operations, fractions, decimals, percentages.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "algebra", title: "Algebra", description: "Expressions, equations, sequences, formulae.", years: [9, 10, 11], order: 2 },
  { id: "geometry", title: "Geometry & Measures", description: "Shapes, angles, area, perimeter, volume, units.", years: [7, 8, 9, 10, 11], order: 3 },
  { id: "statistics", title: "Statistics", description: "Tables, charts, averages, probability.", years: [8, 9, 10, 11], order: 4 },
  { id: "ratio", title: "Ratio & Proportion", description: "Ratio, scale, direct proportion.", years: [9, 10, 11], order: 5 },
  { id: "trigonometry", title: "Trigonometry", description: "Right-angled triangles, sin, cos, tan, applications.", years: [11], order: 6 },
  { id: "calculus", title: "Calculus (intro)", description: "Rates of change, gradients, introduction to calculus for GCSE.", years: [11], order: 7 },
];

const PHYSICS_TOPICS: CurriculumTopic[] = [
  { id: "forces", title: "Forces", description: "Push and pull, gravity, friction, balanced forces.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "light", title: "Light", description: "How we see, shadows, reflection, refraction.", years: [7, 8, 9, 10], order: 2 },
  { id: "sound", title: "Sound", description: "Vibrations, pitch, volume, how sound travels.", years: [8, 9, 10], order: 3 },
  { id: "electricity", title: "Electricity", description: "Circuits, conductors, insulators, components.", years: [8, 9, 10, 11], order: 4 },
  { id: "energy", title: "Energy", description: "Types of energy, energy transfer, conservation.", years: [9, 10, 11], order: 5 },
  { id: "motion", title: "Motion", description: "Speed, distance, time, graphs (towards GCSE).", years: [10, 11], order: 6 },
];

const CHEMISTRY_TOPICS: CurriculumTopic[] = [
  { id: "materials", title: "Materials & States of Matter", description: "Solids, liquids, gases, properties, changes.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "rocks", title: "Rocks & Soils", description: "Types of rocks, fossils, soil.", years: [7, 8, 9], order: 2 },
  { id: "reactions", title: "Chemical Reactions", description: "Simple reactions, acids and alkalis, indicators.", years: [9, 10, 11], order: 3 },
  { id: "particles", title: "Particle Model", description: "Atoms, molecules, particle theory.", years: [10, 11], order: 4 },
];

const BIOLOGY_TOPICS: CurriculumTopic[] = [
  { id: "living-things", title: "Living Things", description: "Life processes, classification, habitats.", years: [7, 8, 9, 10], order: 1 },
  { id: "humans", title: "Humans & Health", description: "Body systems, nutrition, exercise, health.", years: [7, 8, 9, 10, 11], order: 2 },
  { id: "plants", title: "Plants", description: "Parts of a plant, life cycles, photosynthesis.", years: [7, 8, 9, 10], order: 3 },
  { id: "evolution", title: "Evolution & Inheritance", description: "Variation, adaptation, inheritance (towards GCSE).", years: [10, 11], order: 4 },
];

const COMPUTER_SCIENCE_TOPICS: CurriculumTopic[] = [
  { id: "algorithms", title: "Algorithms", description: "Steps and sequences, decomposition, debugging.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "programming", title: "Programming", description: "Block and text-based coding, variables, loops.", years: [8, 9, 10, 11], order: 2 },
  { id: "data", title: "Data & Information", description: "Collecting, presenting, and using data.", years: [8, 9, 10, 11], order: 3 },
  { id: "networks", title: "Networks & the Internet", description: "How computers connect and communicate.", years: [9, 10, 11], order: 4 },
];

const BUSINESS_TOPICS: CurriculumTopic[] = [
  { id: "enterprise", title: "Enterprise", description: "Ideas, products, and what businesses do.", years: [9, 10, 11], order: 1 },
  { id: "money", title: "Money & Budgeting", description: "Income, spending, saving, budgeting.", years: [8, 9, 10, 11], order: 2 },
  { id: "markets", title: "Markets & Customers", description: "Needs and wants, customers, simple marketing.", years: [10, 11], order: 3 },
];

const ENGLISH_TOPICS: CurriculumTopic[] = [
  { id: "reading", title: "Reading", description: "Comprehension, analysis, inference, writer's craft.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "writing", title: "Writing", description: "Stories, non-fiction, structure, grammar and vocabulary.", years: [7, 8, 9, 10, 11], order: 2 },
  { id: "spoken-language", title: "Spoken language", description: "Presentations, discussion, formal speech.", years: [7, 8, 9, 10, 11], order: 3 },
  { id: "literature", title: "Literature", description: "Poetry, drama, prose – set texts and unseen.", years: [9, 10, 11], order: 4 },
];

const HISTORY_TOPICS: CurriculumTopic[] = [
  { id: "medieval", title: "Medieval and early modern", description: "Key events, society, and change.", years: [7, 8, 9], order: 1 },
  { id: "empire-industry", title: "Empire, industry, and reform", description: "Industrial Britain, empire, and democracy.", years: [8, 9, 10], order: 2 },
  { id: "twentieth-century", title: "Twentieth century", description: "World wars, Cold War, and modern Britain.", years: [9, 10, 11], order: 3 },
  { id: "historical-skills", title: "Historical skills", description: "Sources, evidence, and essay writing.", years: [7, 8, 9, 10, 11], order: 4 },
];

const GEOGRAPHY_TOPICS: CurriculumTopic[] = [
  { id: "physical", title: "Physical geography", description: "Rivers, coasts, weather, climate, ecosystems.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "human", title: "Human geography", description: "Population, urban, development, resources.", years: [7, 8, 9, 10, 11], order: 2 },
  { id: "uk-world", title: "UK and the world", description: "UK landscapes, global links, fieldwork.", years: [8, 9, 10, 11], order: 3 },
];

const RELIGIOUS_STUDIES_TOPICS: CurriculumTopic[] = [
  { id: "beliefs-practices", title: "Beliefs and practices", description: "Major religions, key beliefs, worship.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "ethics", title: "Ethics and philosophy", description: "Moral questions, arguments, and dialogue.", years: [9, 10, 11], order: 2 },
];

const FRENCH_TOPICS: CurriculumTopic[] = [
  { id: "french-listening", title: "Listening and reading", description: "Understanding spoken and written French.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "french-speaking-writing", title: "Speaking and writing", description: "Conversation, presentation, and writing.", years: [7, 8, 9, 10, 11], order: 2 },
  { id: "french-grammar-vocab", title: "Grammar and vocabulary", description: "Structures, tenses, and topic vocabulary.", years: [7, 8, 9, 10, 11], order: 3 },
];

const SPANISH_TOPICS: CurriculumTopic[] = [
  { id: "spanish-listening", title: "Listening and reading", description: "Understanding spoken and written Spanish.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "spanish-speaking-writing", title: "Speaking and writing", description: "Conversation, presentation, and writing.", years: [7, 8, 9, 10, 11], order: 2 },
  { id: "spanish-grammar-vocab", title: "Grammar and vocabulary", description: "Structures, tenses, and topic vocabulary.", years: [7, 8, 9, 10, 11], order: 3 },
];

const GERMAN_TOPICS: CurriculumTopic[] = [
  { id: "german-listening", title: "Listening and reading", description: "Understanding spoken and written German.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "german-speaking-writing", title: "Speaking and writing", description: "Conversation, presentation, and writing.", years: [7, 8, 9, 10, 11], order: 2 },
  { id: "german-grammar-vocab", title: "Grammar and vocabulary", description: "Structures, tenses, and topic vocabulary.", years: [7, 8, 9, 10, 11], order: 3 },
];

const ART_TOPICS: CurriculumTopic[] = [
  { id: "art-skills", title: "Art and design", description: "Drawing, painting, techniques, and evaluation.", years: [7, 8, 9, 10, 11], order: 1 },
];

const DRAMA_TOPICS: CurriculumTopic[] = [
  { id: "drama-performance", title: "Drama", description: "Performance, devising, and script.", years: [7, 8, 9, 10, 11], order: 1 },
];

const MUSIC_TOPICS: CurriculumTopic[] = [
  { id: "music-skills", title: "Music", description: "Performance, composition, and listening.", years: [7, 8, 9, 10, 11], order: 1 },
];

const PHOTOGRAPHY_TOPICS: CurriculumTopic[] = [
  { id: "photography-skills", title: "Photography", description: "Composition, techniques, and digital editing.", years: [9, 10, 11], order: 1 },
];

const PE_TOPICS: CurriculumTopic[] = [
  { id: "fitness-health", title: "Fitness and health", description: "Components of fitness, healthy active lifestyle, effects of exercise.", years: [7, 8, 9, 10, 11], order: 1 },
  { id: "team-sports", title: "Team sports", description: "Invasion games, net and wall, striking and fielding, teamwork.", years: [7, 8, 9, 10, 11], order: 2 },
  { id: "individual-activities", title: "Individual activities", description: "Athletics, swimming, gymnastics, outdoor adventure.", years: [7, 8, 9, 10, 11], order: 3 },
  { id: "training", title: "Training and improvement", description: "Principles of training, methods, planning, evaluating performance.", years: [9, 10, 11], order: 4 },
  { id: "anatomy-physiology", title: "Anatomy and physiology", description: "Cardiovascular, respiratory, muscular system, energy systems.", years: [10, 11], order: 5 },
];

export const LEARNING_ACADEMY_SUBJECTS: CurriculumSubject[] = [
  {
    id: "math",
    title: "Mathematics",
    shortTitle: "Math",
    description: "Number, algebra, geometry, trigonometry, calculus, statistics – from basics to GCSE.",
    emoji: "📐",
    color: "bg-amber-500",
    topics: MATH_TOPICS,
  },
  {
    id: "physics",
    title: "Physics",
    shortTitle: "Physics",
    description: "Forces, light, sound, electricity, energy, motion.",
    emoji: "⚡",
    color: "bg-blue-500",
    topics: PHYSICS_TOPICS,
  },
  {
    id: "chemistry",
    title: "Chemistry",
    shortTitle: "Chemistry",
    description: "Materials, states of matter, reactions, particle model.",
    emoji: "🧪",
    color: "bg-emerald-500",
    topics: CHEMISTRY_TOPICS,
  },
  {
    id: "biology",
    title: "Biology",
    shortTitle: "Biology",
    description: "Living things, humans and health, plants, evolution.",
    emoji: "🌿",
    color: "bg-green-500",
    topics: BIOLOGY_TOPICS,
  },
  {
    id: "computer-science",
    title: "Computer Science",
    shortTitle: "Computer Science",
    description: "Algorithms, programming, data, networks.",
    emoji: "💻",
    color: "bg-indigo-500",
    topics: COMPUTER_SCIENCE_TOPICS,
  },
  {
    id: "business-studies",
    title: "Business Studies",
    shortTitle: "Business",
    description: "Enterprise, money, budgeting, markets and customers.",
    emoji: "📊",
    color: "bg-rose-500",
    topics: BUSINESS_TOPICS,
  },
  {
    id: "english",
    title: "English",
    shortTitle: "English",
    description: "Reading, writing, spoken language, literature.",
    emoji: "📖",
    color: "bg-sky-500",
    topics: ENGLISH_TOPICS,
  },
  {
    id: "history",
    title: "History",
    shortTitle: "History",
    description: "Medieval to modern, sources, and essay skills.",
    emoji: "🏛️",
    color: "bg-stone-600",
    topics: HISTORY_TOPICS,
  },
  {
    id: "geography",
    title: "Geography",
    shortTitle: "Geography",
    description: "Physical, human, UK and the world.",
    emoji: "🌍",
    color: "bg-lime-600",
    topics: GEOGRAPHY_TOPICS,
  },
  {
    id: "religious-studies",
    title: "Religious Studies",
    shortTitle: "RS",
    description: "Beliefs, practices, ethics, and philosophy.",
    emoji: "☯️",
    color: "bg-violet-500",
    topics: RELIGIOUS_STUDIES_TOPICS,
  },
  {
    id: "french",
    title: "French",
    shortTitle: "French",
    description: "Listening, reading, speaking, writing, grammar.",
    emoji: "🇫🇷",
    color: "bg-blue-600",
    topics: FRENCH_TOPICS,
  },
  {
    id: "spanish",
    title: "Spanish",
    shortTitle: "Spanish",
    description: "Listening, reading, speaking, writing, grammar.",
    emoji: "🇪🇸",
    color: "bg-yellow-500",
    topics: SPANISH_TOPICS,
  },
  {
    id: "german",
    title: "German",
    shortTitle: "German",
    description: "Listening, reading, speaking, writing, grammar.",
    emoji: "🇩🇪",
    color: "bg-amber-700",
    topics: GERMAN_TOPICS,
  },
  {
    id: "art",
    title: "Art & Design",
    shortTitle: "Art",
    description: "Drawing, painting, techniques, evaluation.",
    emoji: "🎨",
    color: "bg-pink-500",
    topics: ART_TOPICS,
  },
  {
    id: "drama",
    title: "Drama",
    shortTitle: "Drama",
    description: "Performance, devising, script.",
    emoji: "🎭",
    color: "bg-orange-500",
    topics: DRAMA_TOPICS,
  },
  {
    id: "music",
    title: "Music",
    shortTitle: "Music",
    description: "Performance, composition, listening.",
    emoji: "🎵",
    color: "bg-fuchsia-500",
    topics: MUSIC_TOPICS,
  },
  {
    id: "photography",
    title: "Photography",
    shortTitle: "Photography",
    description: "Composition, techniques, digital editing.",
    emoji: "📷",
    color: "bg-slate-600",
    topics: PHOTOGRAPHY_TOPICS,
  },
  {
    id: "pe",
    title: "Physical Education",
    shortTitle: "PE",
    description: "Fitness and health, team sports, individual activities, training, anatomy.",
    emoji: "⚽",
    color: "bg-red-500",
    topics: PE_TOPICS,
  },
];

export function getSubject(id: string): CurriculumSubject | undefined {
  return LEARNING_ACADEMY_SUBJECTS.find((s) => s.id === id);
}

export function getTopic(subjectId: string, topicId: string): CurriculumTopic | undefined {
  const subject = getSubject(subjectId);
  return subject?.topics.find((t) => t.id === topicId);
}

export function getTopicsForYear(subjectId: string, year: UKYear): CurriculumTopic[] {
  const subject = getSubject(subjectId);
  if (!subject) return [];
  return subject.topics.filter((t) => t.years.includes(year)).sort((a, b) => a.order - b.order);
}

/** Topics that appear in Year 11 / GCSE – used for GCSE exam prep view (not same as "all years"). */
export function getTopicsForGCSE(subjectId: string): CurriculumTopic[] {
  return getTopicsForYear(subjectId, 11);
}
