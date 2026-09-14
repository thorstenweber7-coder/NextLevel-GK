import type { TrainingPlan, ExerciseExperienceEntry } from '../types';

export function getAuthorizedExerciseExperiences(
  exerciseId: string,
  savedPlans: TrainingPlan[],
  currentUser: { uid?: string; email?: string | null } | null,
  isMasterAdmin: boolean = false,
  isClubAdmin: boolean = false,
  userClubId?: string | null
): ExerciseExperienceEntry[] {
  if (!exerciseId || !savedPlans || savedPlans.length === 0) return [];

  const results: ExerciseExperienceEntry[] = [];

  savedPlans.forEach(plan => {
    const text = plan.exerciseExperiences?.[exerciseId];
    if (!text || !text.trim()) return;

    // Authorization logic:
    // 1. Master Admin can see ALL experiences
    // 2. Creator can see their own experiences
    // 3. Club Admin can see experiences from their assigned ClubCoaches / club plans
    const isOwner = Boolean(
      currentUser?.uid && (
        plan.ownerId === currentUser.uid ||
        plan.debriefedByUserId === currentUser.uid ||
        (currentUser.email && plan.ownerEmail === currentUser.email)
      )
    );

    const isClubCoachPlan = Boolean(
      isClubAdmin && userClubId && (
        plan.clubId === userClubId ||
        (plan as any).targetGroupClubId === userClubId
      )
    );

    if (isMasterAdmin || isOwner || isClubCoachPlan) {
      results.push({
        planId: plan.id,
        planTitle: plan.title || plan.planTitle || 'Trainingseinheit',
        planDate: plan.date || plan.planDate || '–',
        trainerName: plan.debriefedByTrainer || plan.trainerName || 'Trainer',
        experienceText: text.trim(),
        ownerId: plan.ownerId,
        ownerEmail: plan.ownerEmail,
        clubId: plan.clubId,
        debriefedAt: plan.debriefedAt
      });
    }
  });

  // Sort newest first
  results.sort((a, b) => {
    const timeA = a.debriefedAt || new Date(a.planDate).getTime() || 0;
    const timeB = b.debriefedAt || new Date(b.planDate).getTime() || 0;
    return timeB - timeA;
  });

  return results;
}
