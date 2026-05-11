import { prisma } from '../db';
import { LoyaltyType } from '@prisma/client';

export interface StampResult {
  card: {
    id: string;
    serialNumber: string;
    currentStamps: number;
    currentPoints: number;
    totalRewardsEarned: number;
  };
  rewardEarned: boolean;
  programType: LoyaltyType;
  goal: number;
}

export async function addStamp(serialNumber: string, amount: number = 1): Promise<StampResult> {
  if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
    throw new Error('Montant invalide');
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: { program: true },
  });

  if (!card) throw new Error('Carte non trouvée');
  if (!card.program.isActive) throw new Error('Programme inactif');

  const isStamps = card.program.type === 'STAMPS';
  const goal = isStamps ? card.program.stampGoal! : card.program.pointsGoal!;

  let newStamps = card.currentStamps;
  let newPoints = card.currentPoints;
  let rewardEarned = false;

  if (isStamps) {
    newStamps += amount;
    if (newStamps >= goal) {
      rewardEarned = true;
    }
  } else {
    newPoints += amount;
    if (newPoints >= goal) {
      rewardEarned = true;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const loyaltyCard = await tx.loyaltyCard.update({
      where: { id: card.id },
      data: {
        currentStamps: newStamps,
        currentPoints: newPoints,
        lastUpdated: new Date(),
      },
    });

    await tx.transaction.create({
      data: {
        cardId: card.id,
        type: isStamps ? 'STAMP_ADD' : 'POINTS_ADD',
        amount,
      },
    });

    return loyaltyCard;
  });

  return {
    card: {
      id: updated.id,
      serialNumber: updated.serialNumber,
      currentStamps: updated.currentStamps,
      currentPoints: updated.currentPoints,
      totalRewardsEarned: updated.totalRewardsEarned,
    },
    rewardEarned,
    programType: card.program.type,
    goal,
  };
}
