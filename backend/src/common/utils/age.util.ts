const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_MONTH = 30;
const DAYS_PER_WEEK = 7;
const PREMATURE_THRESHOLD_WEEKS = 3;
const MAX_ADJUSTED_AGE_MONTHS = 24;

export function computeAge(birthDate: Date, today: Date = new Date()): number {
  const diffMs = today.getTime() - birthDate.getTime();
  const diffDays = Math.floor(diffMs / MILLISECONDS_PER_DAY);
  return Math.floor(diffDays / DAYS_PER_MONTH);
}

export function computeAdjustedAge(
  birthDate: Date,
  assessmentDate: Date = new Date(),
  prematureWeeks: number = 0,
): number {
  if (prematureWeeks < PREMATURE_THRESHOLD_WEEKS) {
    return computeAge(birthDate, assessmentDate);
  }

  const chronologicalDays = Math.floor(
    (assessmentDate.getTime() - birthDate.getTime()) / MILLISECONDS_PER_DAY,
  );
  const adjustedDays = chronologicalDays - prematureWeeks * DAYS_PER_WEEK;
  let months = Math.floor(adjustedDays / DAYS_PER_MONTH);

  if (months < 0) months = 0;
  if (months > MAX_ADJUSTED_AGE_MONTHS) months = MAX_ADJUSTED_AGE_MONTHS;

  return months;
}
