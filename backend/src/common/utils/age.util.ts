export function computeAge(birthDate: Date, today: Date = new Date()): number {
  const diffMs = today.getTime() - birthDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 30);
}

export function computeAdjustedAge(
  birthDate: Date,
  assessmentDate: Date = new Date(),
  prematureWeeks: number = 0,
): number {
  if (prematureWeeks < 3) {
    const diffMs = assessmentDate.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 30);
  }

  const chronologicalDays = Math.floor(
    (assessmentDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const adjustedDays = chronologicalDays - prematureWeeks * 7;
  let months = Math.floor(adjustedDays / 30);

  if (months < 0) months = 0;
  if (months > 24) months = 24;

  return months;
}


