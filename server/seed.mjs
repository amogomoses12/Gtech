import { db, one, run } from "./db.mjs";
import { pathToFileURL } from "node:url";

const lessons = {
  Mathematics: [
    [
      "Making sense of algebra",
      "# Algebra is a language for patterns\n\nA variable is a symbol that stands for a number. In the expression 3x + 2, x is the variable, 3 is its coefficient, and 2 is a constant.\n\n## Start with a simple equation\n\nTo solve 3x + 2 = 14, subtract 2 from both sides: 3x = 12. Divide both sides by 3: x = 4. Check by substituting: 3(4) + 2 = 14.\n\n## The balance principle\n\nAn equation is like a balanced scale. Whatever operation you perform on one side, perform on the other. This preserves equality.\n\n## Try it yourself\n\nSolve 5x - 7 = 18 before reading on. Add 7 to both sides, then divide by 5. Your answer should be x = 5.\n\n## Your takeaway\n\nIdentify the unknown, undo operations in reverse order, and substitute your answer to check it.",
    ],
    [
      "Linear equations, one step at a time",
      "# Working with linear equations\n\nA linear equation has variables raised only to the first power. Its graph is a straight line. The form y = mx + c makes its features easy to see.\n\n## Gradient and intercept\n\nm is the gradient, the change in y for each unit increase in x. c is the y-intercept, where the line crosses the vertical axis. For y = 2x + 3, the gradient is 2 and the intercept is 3.\n\n## A worked example\n\nA line passes through (1, 5) and (3, 9). Its gradient is (9 - 5) / (3 - 1) = 2. Substitute (1, 5): 5 = 2(1) + c, so c = 3.\n\n## Practice\n\nFind the equation of a line with gradient 4 passing through (2, 11). Substitution gives 11 = 8 + c, so the equation is y = 4x + 3.",
    ],
    [
      "Fractions, ratios, and percentages",
      "# Numbers in everyday life\n\nA fraction compares a part with a whole. A ratio compares two quantities. A percentage expresses a fraction out of 100.\n\n## Converting between forms\n\n3/4 = 0.75 = 75%. Divide the numerator by the denominator to get a decimal, then multiply by 100 for a percentage.\n\n## Percentage change\n\nIf a price rises from $40 to $50, the increase is $10. Divide the increase by the original price: 10 / 40 = 0.25. The increase is 25%, not 20%.\n\n## Practice\n\nA class has 18 students who walk and 12 who take a bus. The ratio of walkers to bus riders is 18:12 = 3:2. Walkers make up 18/30 = 60% of the class.",
    ],
    [
      "Your revision and problem-solving plan",
      "# Turn understanding into confidence\n\nPractice works best when it is regular and active. Start with one topic, solve a problem without looking at the answer, and explain each step in your own words.\n\n## A 25-minute session\n\nSpend 5 minutes recalling the main ideas from memory, 15 minutes solving three problems, and 5 minutes reviewing mistakes.\n\n## Keep an error log\n\nWrite the original question, the mistake, the corrected reasoning, and one similar problem to try later. Revisit it after a day and again after a week.\n\n## Next step\n\nTry the Algebra foundations practice session in the Practice section. Your answers are graded and saved to your account.",
    ],
  ],
  Physics: [
    [
      "The physics of everyday motion",
      "# A world in motion\n\nPhysics describes how the world behaves using observations, models, and measurements. Start with three quantities: displacement, velocity, and acceleration.\n\n## Distance and displacement\n\nDistance is the total length of a path. Displacement is the change from your starting position to your finishing position and includes direction. Walk 3 metres east then 3 metres west: your distance is 6 m, but your displacement is 0 m.\n\n## Speed and velocity\n\nAverage speed = total distance / elapsed time. Average velocity = displacement / elapsed time. Both use metres per second, but only velocity has direction.\n\n## Worked example\n\nA cyclist travels 120 m in 20 s. Their average speed is 120 / 20 = 6 m/s.",
    ],
    [
      "Forces and Newton's laws",
      "# Why motion changes\n\nA force is a push or pull. The net force is the vector sum of all forces on an object.\n\n## First law\n\nAn object remains at rest or moves with constant velocity unless acted on by a nonzero net force.\n\n## Second law\n\nNet force F = ma, where m is mass in kilograms and a is acceleration in metres per second squared. A 2 kg object accelerating at 3 m/s squared experiences a net force of 6 N.\n\n## Third law\n\nForces occur in equal and opposite pairs acting on different objects. When you push a wall, it pushes back on you. These forces do not cancel on a single object.\n\n## Check your understanding\n\nIf the same force acts on twice the mass, the acceleration is halved.",
    ],
    [
      "Energy and conservation",
      "# Energy changes form\n\nEnergy is a quantity that can be transferred between objects or transformed. In an isolated system, the total energy remains constant.\n\n## Kinetic energy\n\nKinetic energy = (1/2)mv squared. A 2 kg object moving at 4 m/s has kinetic energy (1/2)(2)(16) = 16 joules. Doubling speed quadruples kinetic energy.\n\n## Gravitational potential energy\n\nNear Earth's surface, the change in potential energy is mgh. Use g approximately 9.8 m/s squared. Lifting a 1 kg book through 2 m requires about 19.6 J of energy.\n\n## Real systems\n\nFriction converts mechanical energy to thermal energy. Energy is not destroyed; it becomes less useful for the task.",
    ],
  ],
  Scholarships: [
    [
      "Start with your story",
      "# Your application starts with you\n\nA strong scholarship application connects your experiences, goals, and potential contribution to the scholarship's published criteria. There is no guaranteed formula or guaranteed award.\n\n## Build an evidence bank\n\nList projects, responsibilities, academic achievements, service, and challenges you have addressed. For each, record what you did, the result, and what you learned.\n\n## Match the opportunity\n\nRead eligibility requirements on the official provider's website. Check citizenship, residency, subject, level of study, and deadlines before investing time.\n\n## Your first task\n\nWrite a 100-word introduction answering: what do you want to learn, why does it matter, and who might benefit?",
    ],
    [
      "Writing a purposeful personal statement",
      "# Be specific, not spectacular\n\nA useful personal statement is clear, honest, and relevant. Avoid claims you cannot support and do not copy another applicant's story.\n\n## A practical structure\n\nOpen with your purpose. Describe two or three concrete experiences. Connect them to your chosen studies. Close with a realistic plan for using what you learn.\n\n## Show your contribution\n\nInstead of saying you are a good leader, describe a time you coordinated a group, the problem you addressed, and what changed.\n\n## Revise with care\n\nCheck the prompt and word limit. Ask a trusted reader for feedback, then preserve your own voice. Follow each provider's rules on editing and AI assistance.",
    ],
    [
      "A calm, complete application checklist",
      "# Prepare before the deadline\n\nKeep one folder for each opportunity. Save the official instructions and record the deadline with its time zone.\n\n## Common documents\n\nYou may need transcripts, proof of enrollment, a personal statement, references, a CV, and language results. Requirements vary; use the official checklist.\n\n## References\n\nAsk referees early, explain why you are applying, provide your CV, and confirm the submission method. Never write or submit a reference while pretending to be your referee.\n\n## Final review\n\nCheck names, dates, file formats, word counts, and signatures. Submit early and save the confirmation. Gtech offers preparation resources, not scholarship decisions or placement guarantees.",
    ],
  ],
  Technology: [
    [
      "Your first steps in programming",
      '# Think like a problem solver\n\nProgramming means giving a computer precise instructions. Before writing code, describe the problem, the inputs, and the expected output.\n\n## Variables\n\nA variable stores a value. In JavaScript, let score = 10 creates a variable that can be updated. const name = "Gtech" creates a binding you cannot reassign.\n\n## Decisions\n\nA conditional chooses a path. For example, if a score is at least 50, display "Pass"; otherwise display "Try again".\n\n## Your task\n\nWrite the steps for calculating the average of three numbers: add them, then divide by three. Test your plan with 6, 9, and 12. The average is 9.',
    ],
    [
      "Build a learning habit",
      "# Small steps beat long pauses\n\nChoose a small project you can understand from start to finish. A study timer, a calculator, or a reading list is enough.\n\n## Read errors as information\n\nAn error message tells you where an assumption failed. Read it, reproduce the issue, and change one thing at a time.\n\n## Practice deliberately\n\nWrite a few lines, run them, and explain what happened. Keep your code and notes together. Revisit your project after a week and improve one thing.",
    ],
  ],
};

export function seed() {
  if (one("SELECT 1 FROM settings WHERE key='seed_version'")) return;
  db.transaction(() => {
    for (const [key, value] of Object.entries({
      site_name: "Gtech",
      support_email: "hello@gtech.example",
      tagline: "A little curiosity. A world of possibility.",
      seed_version: "1",
    }))
      run("INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)", key, value);
    const courses = [
      [
        "algebra-foundations",
        "Maths that finally makes sense",
        "Mathematics",
        "Build a strong foundation in algebra, one clear explanation at a time.",
        0,
        "Beginner",
        "/images/mathematics.jpg",
        "4 lessons",
      ],
      [
        "physics-in-motion",
        "Discover the physics around you",
        "Physics",
        "Explore motion, forces, and energy through the everyday world.",
        1900,
        "Beginner",
        "/images/physics.jpg",
        "3 lessons",
      ],
      [
        "scholarship-starter",
        "Your scholarship starting point",
        "Scholarships",
        "Find your story, prepare your documents, and apply with confidence.",
        0,
        "All levels",
        "/images/scholarships.jpg",
        "3 lessons",
      ],
      [
        "code-your-first-chapter",
        "Code your first chapter",
        "Technology",
        "Go from curious to capable with the building blocks of programming.",
        0,
        "Beginner",
        "/images/technology.jpg",
        "2 lessons",
      ],
      [
        "maths-exam-toolkit",
        "The maths exam toolkit",
        "Mathematics",
        "Strengthen your problem-solving approach and create a revision routine.",
        2400,
        "Intermediate",
        "/images/mathematics.jpg",
        "4 lessons",
      ],
      [
        "physics-fundamentals",
        "A fresh start with physics",
        "Physics",
        "A free introduction to the ideas behind movement and energy.",
        0,
        "Beginner",
        "/images/physics.jpg",
        "3 lessons",
      ],
    ];
    for (const [
      slug,
      title,
      subject,
      summary,
      price,
      level,
      image,
      duration,
    ] of courses) {
      const result = run(
        "INSERT INTO courses(slug,title,subject,summary,description,image,price_cents,level,instructor,duration,published) VALUES (?,?,?,?,?,?,?,?,?,?,1)",
        slug,
        title,
        subject,
        summary,
        `${summary}\n\nThis self-paced course includes clear reading lessons, worked examples, and practical prompts. Move at your own pace, save your progress, and return whenever you need a refresher.\n\nWhat you will learn\nUnderstand the core ideas rather than memorizing isolated facts. Apply what you learn to examples, build a repeatable study routine, and recognize your next steps.\n\nWho this is for\nCurious learners who want an approachable place to begin. These starter lessons are included with your Gtech installation and can be edited in the admin dashboard.`,
        image,
        price,
        level,
        "Gtech Learning Team",
        duration,
      );
      lessons[subject].forEach(([lessonTitle, content], index) =>
        run(
          "INSERT INTO lessons(course_id,title,content,duration,position,preview) VALUES (?,?,?,?,?,?)",
          result.lastInsertRowid,
          lessonTitle,
          content,
          8 + index * 3,
          index,
          index === 0 ? 1 : 0,
        ),
      );
    }
    const resources = [
      [
        "Your algebra revision sheet",
        "The essential rules, examples, and a short practice checklist in one place.",
        "Mathematics",
        "Study guide",
        lessons.Mathematics[0][1] +
          "\n\n## Quick reference\n\nDistributive rule: a(b + c) = ab + ac.\nLike terms: 3x + 2x = 5x.\nIndices: x squared times x cubed = x to the fifth power.\nCheck every solution in the original equation.",
      ],
      [
        "Motion and forces, simply explained",
        "A readable companion for your first mechanics lessons.",
        "Physics",
        "Reading notes",
        lessons.Physics[1][1],
      ],
      [
        "The personal statement workbook",
        "Turn your experiences into a clear, authentic application story.",
        "Scholarships",
        "Scholarship guide",
        lessons.Scholarships[1][1],
      ],
      [
        "Your scholarship application checklist",
        "Organize documents, references, and deadlines without the overwhelm.",
        "Scholarships",
        "Scholarship guide",
        lessons.Scholarships[2][1],
      ],
      [
        "Finding the right funding opportunity",
        "A thoughtful starting point for researching legitimate scholarships.",
        "Scholarships",
        "Scholarship guide",
        "# Research with confidence\n\nStart with official university financial aid pages and the official scholarship provider. Eligibility and deadlines change, so verify them directly.\n\n## Keep a simple tracker\n\nRecord the opportunity name, official website, eligibility, award coverage, documents, deadline, and progress. Avoid assuming that funding covers every expense.\n\n## Watch for red flags\n\nBe cautious of guarantees, pressure to pay fees to claim an award, and requests for banking passwords. Never share account credentials with a scholarship promoter.\n\n## Plan beyond one application\n\nBuild a shortlist that fits your goals and circumstances. Ask your institution about local and subject-specific opportunities. Gtech does not award scholarships or guarantee results.",
      ],
      [
        "A weekly study planner",
        "Make space for focused practice and meaningful breaks.",
        "Mathematics",
        "Worksheet",
        "# Your week, one step at a time\n\nMonday: recall last week's core ideas for 10 minutes, then solve three problems.\nTuesday: read one new lesson and write a five-sentence summary.\nWednesday: practice without notes and record mistakes.\nThursday: revisit the mistakes and try a similar question.\nFriday: take a short practice session and reflect on your progress.\nWeekend: rest, review lightly, and plan the next week.\n\n## Reflection\n\nWhat did I understand better? What still feels unclear? What is one question I can ask next week?",
      ],
    ];
    for (const resource of resources)
      run(
        "INSERT INTO resources(title,description,subject,kind,content,published) VALUES (?,?,?,?,?,1)",
        ...resource,
      );
    const quizzes = [
      [
        "Algebra foundations",
        "Mathematics",
        "A small challenge for a stronger foundation.",
        [
          [
            "Solve 3x + 2 = 14.",
            ["x = 2", "x = 4", "x = 6", "x = 12"],
            1,
            "Subtract 2 to get 3x = 12, then divide by 3: x = 4.",
          ],
          [
            "What is the gradient of y = 5x + 2?",
            ["2", "5", "7", "10"],
            1,
            "In y = mx + c, m is the gradient. Here m = 5.",
          ],
          [
            "Express 3/4 as a percentage.",
            ["25%", "34%", "50%", "75%"],
            3,
            "3 divided by 4 is 0.75. Multiply by 100 to get 75%.",
          ],
          [
            "Simplify 2(x + 3) + x.",
            ["3x + 3", "2x + 6", "3x + 6", "2x + 3"],
            2,
            "Expand the brackets: 2x + 6 + x. Combine like terms to get 3x + 6.",
          ],
          [
            "A price rises from $40 to $50. What is the percentage increase?",
            ["10%", "20%", "25%", "40%"],
            2,
            "The increase is $10. Divide by the original $40 and multiply by 100: 25%.",
          ],
        ],
      ],
      [
        "Motion, forces & energy",
        "Physics",
        "Put your understanding of everyday physics to the test.",
        [
          [
            "A cyclist travels 120 m in 20 s. What is the average speed?",
            ["4 m/s", "6 m/s", "12 m/s", "24 m/s"],
            1,
            "Average speed = distance / time = 120 / 20 = 6 m/s.",
          ],
          [
            "What net force accelerates a 2 kg object at 3 m/s squared?",
            ["1.5 N", "5 N", "6 N", "9 N"],
            2,
            "Newton's second law: F = ma = 2 x 3 = 6 N.",
          ],
          [
            "You walk 3 m east then 3 m west. What is your displacement?",
            ["0 m", "3 m east", "6 m", "6 m west"],
            0,
            "You finish at your starting position, so your displacement is zero.",
          ],
          [
            "What happens to kinetic energy when speed doubles?",
            ["It stays the same", "It doubles", "It triples", "It quadruples"],
            3,
            "Kinetic energy is proportional to speed squared. Doubling speed multiplies it by 4.",
          ],
          [
            "What is the SI unit of energy?",
            ["Newton", "Watt", "Joule", "Pascal"],
            2,
            "Energy is measured in joules. A watt is a unit of power, or energy per second.",
          ],
        ],
      ],
      [
        "Scholarship readiness check",
        "Scholarships",
        "Find out how ready you are for your next application.",
        [
          [
            "Where should you confirm a scholarship deadline?",
            [
              "A forwarded message",
              "The official provider website",
              "An old blog post",
              "A social media comment",
            ],
            1,
            "The official provider is the authoritative source. Check the date and time zone.",
          ],
          [
            "What makes a personal statement more convincing?",
            [
              "Unsupported superlatives",
              "Copying a successful essay",
              "Specific, honest examples",
              "Using the longest words",
            ],
            2,
            "Concrete examples make your experiences and goals clear without exaggeration.",
          ],
          [
            "When should you ask for a reference?",
            [
              "On the deadline",
              "After submitting",
              "Well before the deadline",
              "Only if you win",
            ],
            2,
            "Give your referees enough time and provide the requirements and context.",
          ],
        ],
      ],
    ];
    for (const [title, subject, description, questions] of quizzes) {
      const result = run(
        "INSERT INTO quizzes(title,subject,description,duration,published) VALUES (?,?,?,?,1)",
        title,
        subject,
        description,
        questions.length * 2,
      );
      questions.forEach(([prompt, options, correct, explanation], i) =>
        run(
          "INSERT INTO questions(quiz_id,prompt,options,correct_index,explanation,position) VALUES (?,?,?,?,?,?)",
          result.lastInsertRowid,
          prompt,
          JSON.stringify(options),
          correct,
          explanation,
          i,
        ),
      );
    }
  })();
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  seed();
  console.log(
    "Gtech starter courses, materials, and practice sessions are ready.",
  );
  db.close();
}
