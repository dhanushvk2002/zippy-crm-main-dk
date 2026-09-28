const femaleExplicit = new Set([
  "priya", "saraswathi", "saraswati", "soundharya", "soundarya", "soundhari",
  "nandthini", "nandhini", "nandini", "kavitha", "kavita", "divya", "pooja", "puja",
  "anita", "anitha", "lakshmi", "laxmi", "deepa", "deepika", "sneha", "shreya",
  "swati", "swathi", "swetha", "shweta", "meena", "radha", "sunita", "sunitha",
  "geetha", "geeta", "rekha", "ananya", "aarthi", "aarti", "bhavani", "chitra",
  "gayathri", "gayatri", "ishwariya", "ishwarya", "aishwarya", "janani", "keerthi",
  "keerthana", "lavanya", "madhavi", "malathi", "manju", "nisha", "pavithra",
  "pavitra", "preeti", "preethi", "rajeswari", "rajalakshmi", "ramya", "renu",
  "renuka", "reshma", "ritu", "rohini", "rupa", "sandhya", "sangeetha", "sangeeta",
  "saranya", "sharmila", "sindhu", "sowmya", "soumya", "subhashini", "sujatha",
  "sumathi", "usha", "vaishnavi", "vani", "vidya", "yamuna", "mary", "sarah",
  "rachel", "elizabeth", "jennifer", "jessica", "emily", "anna", "maria",
  "priyadarshini", "jaya", "uma", "shanti", "shanthi", "durga", "kala",
  "vanitha", "kamala", "sarojini", "indira", "meenakshi", "padma", "radhika",
  "saranya", "shakuntala", "savithri", "shilpa", "roshni", "tanvi", "komal",
  "neha", "pallavi", "prerana", "shruti", "shweta", "smita", "vandana",
  "divisa", "sowmiya"
]);

const maleExplicit = new Set([
  "vishnu", "advait", "prabu", "prabhu", "king", "aakash", "akash", "dhanush", "kodi", "vinond",
  "vinod", "kumar", "rajesh", "suresh", "ramesh", "rameshwar", "arun", "vijay",
  "ajith", "karthik", "karthikeyan", "vignesh", "murugan", "ganesh", "shiva",
  "senthil", "saravanan", "manikandan", "mani", "anand", "arvind", "ashwin",
  "balaji", "deepak", "dinesh", "harish", "manoj", "naveen", "praveen",
  "rahul", "rohit", "sachin", "sanjay", "santosh", "siddharth", "varun",
  "vikas", "vivek", "john", "david", "michael", "robert", "krishna", "rama",
  "surya", "test", "dhanushkodi", "shankar", "raghav", "venkat", "kiran",
  "prakash", "sridhar", "vasanth", "saravana", "prasad", "mohan"
]);

export function getDoctorGender(rawName) {
  if (!rawName) return "male";
  // Remove Dr, Doctor, Dct prefix
  const cleaned = String(rawName)
    .replace(/^(dr|doctor|dct)\.?\s*/i, "")
    .trim();

  // Split into words, ignoring dots and punctuation
  const words = cleaned
    .toLowerCase()
    .split(/[\s._\-/,]+/)
    .filter(Boolean);

  if (words.length === 0) return "male";

  // 1. Direct match on any word
  for (const w of words) {
    if (femaleExplicit.has(w)) return "female";
    if (maleExplicit.has(w)) return "male";
  }

  // 2. Select primary first name (ignoring 1-letter initials like "v" in "V. Dhanush")
  const primaryName = words.find((w) => w.length > 1) || words[0];

  // 3. Indian female name suffix rules
  if (
    primaryName.endsWith("thini") ||
    primaryName.endsWith("dhini") ||
    primaryName.endsWith("dini") ||
    primaryName.endsWith("wathi") ||
    primaryName.endsWith("vathi") ||
    primaryName.endsWith("mathi") ||
    primaryName.endsWith("mati") ||
    primaryName.endsWith("shree") ||
    primaryName.endsWith("sri") ||
    primaryName.endsWith("ammal") ||
    primaryName.endsWith("bai") ||
    primaryName.endsWith("priya") ||
    primaryName.endsWith("arya") ||
    primaryName.endsWith("harya") ||
    primaryName.endsWith("thra") ||
    primaryName.endsWith("itha") ||
    primaryName.endsWith("ika") ||
    primaryName.endsWith("nya")
  ) {
    return "female";
  }

  // 4. Female names ending in 'a', 'i', 'ee' (excluding common male exceptions)
  if (
    primaryName.endsWith("a") ||
    primaryName.endsWith("i") ||
    primaryName.endsWith("ee")
  ) {
    const maleExceptions = new Set([
      "krishna", "rama", "shiva", "surya", "mani", "balaji", "ravi", "hari",
      "giri", "kodi", "ali", "rishi", "someshwar"
    ]);
    if (!maleExceptions.has(primaryName)) {
      return "female";
    }
  }

  return "male";
}
