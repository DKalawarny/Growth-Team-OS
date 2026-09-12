import Intake from './Intake'

/**
 * The way out — the six intake screens, with no account and no database.
 *
 * 🔴 DEV ONLY. Registered in App.jsx behind `import.meta.env.DEV`, which Vite
 * substitutes at build time, so this file is dropped from a production bundle
 * entirely rather than merely being unreachable — the treatment the map preview
 * needed after a first attempt shipped an orphaned but fetchable chunk.
 *
 * ⭐ It renders the REAL Intake. The screens, the order of the questions, the
 * chips, the validation messages and the reflection card are all exactly what a
 * paying person sees — which is the point, and why this is a prop on that
 * component rather than a second copy of the intake that would drift from it
 * inside a week. The only differences are that nothing is saved and the
 * reflection below is canned instead of coming back from Solomon.
 */

/**
 * Written to show the SHAPE the real reflection has to hit, so the design can
 * be judged against a realistic one rather than lorem ipsum: restate a
 * constraint in their own words, then ONE consequence for the plan. Two
 * sentences. No praise, no question, no encouragement.
 */
const SAMPLE_REFLECTIONS = {
  s1: 'Shared custody, kids in town. So this plan stays within driving distance and doesn’t ask you to trade your Wednesdays.',
  s3: 'A truck and a pressure washer, both already paid for. That means move one costs you a Saturday, not a loan.',
  s5: 'Three years, and you’d give up space before stability. So this builds slowly enough that nothing has to be sold.',
}

export default function PreviewIntake() {
  return <Intake preview previewReflections={SAMPLE_REFLECTIONS} />
}
