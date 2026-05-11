import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { addStamp } from '../services/loyalty';
import { updateApplePass } from '../services/apple-wallet';
import { updateGooglePass } from '../services/google-wallet';
import { param } from '../utils/params';
import { positiveInt } from '../utils/validation';

export const cardRouter = Router();

cardRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const programId = typeof req.query.programId === 'string' ? req.query.programId : undefined;

    const programs = await prisma.loyaltyProgram.findMany({
      where: { restaurantId: req.restaurantId },
      select: { id: true },
    });
    const programIds = programs.map((p) => p.id);

    const cards = await prisma.loyaltyCard.findMany({
      where: {
        programId: programId ? { in: [programId].filter((id) => programIds.includes(id)) } : { in: programIds },
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        program: { select: { id: true, name: true, type: true, stampGoal: true, pointsGoal: true, reward: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(cards);
  } catch (error) {
    console.error('List cards error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

cardRouter.get('/:serial', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const serial = param(req.params.serial);
    const card = await prisma.loyaltyCard.findUnique({
      where: { serialNumber: serial },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        program: {
          select: { id: true, name: true, type: true, stampGoal: true, pointsGoal: true, reward: true, restaurantId: true },
        },
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!card || card.program.restaurantId !== req.restaurantId) {
      res.status(404).json({ error: 'Carte non trouvée' });
      return;
    }

    res.json(card);
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

cardRouter.post('/:serial/stamp', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const serial = param(req.params.serial);
    const card = await prisma.loyaltyCard.findUnique({
      where: { serialNumber: serial },
      include: { program: { select: { restaurantId: true } } },
    });

    if (!card || card.program.restaurantId !== req.restaurantId) {
      res.status(404).json({ error: 'Carte non trouvée' });
      return;
    }

    const amount = req.body.amount === undefined ? 1 : positiveInt(req.body.amount);
    if (!amount || amount > 10000) {
      res.status(400).json({ error: 'Montant invalide' });
      return;
    }

    const result = await addStamp(serial, amount);

    try { await updateApplePass(serial); } catch (e) { console.error('Apple push error:', e); }
    try { await updateGooglePass(serial); } catch (e) { console.error('Google push error:', e); }

    res.json({
      ...result,
      message: result.rewardEarned ? 'Récompense disponible !' : 'Tampon ajouté',
    });
  } catch (error) {
    console.error('Stamp error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

cardRouter.post('/:serial/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const serial = param(req.params.serial);
    const card = await prisma.loyaltyCard.findUnique({
      where: { serialNumber: serial },
      include: { program: { select: { restaurantId: true, type: true, stampGoal: true, pointsGoal: true, reward: true } } },
    });

    if (!card || card.program.restaurantId !== req.restaurantId) {
      res.status(404).json({ error: 'Carte non trouvée' });
      return;
    }

    const isStamps = card.program.type === 'STAMPS';
    const goal = isStamps ? card.program.stampGoal! : card.program.pointsGoal!;
    const current = isStamps ? card.currentStamps : card.currentPoints;

    if (current < goal) {
      res.status(400).json({ error: 'Pas assez de tampons/points pour la récompense' });
      return;
    }

    const updated = await prisma.loyaltyCard.update({
      where: { id: card.id },
      data: {
        currentStamps: isStamps ? card.currentStamps - goal : card.currentStamps,
        currentPoints: !isStamps ? card.currentPoints - goal : card.currentPoints,
        totalRewardsEarned: card.totalRewardsEarned + 1,
        lastUpdated: new Date(),
      },
    });

    await prisma.transaction.create({
      data: {
        cardId: card.id,
        type: 'REWARD_CLAIMED',
        amount: 1,
        note: card.program.reward,
      },
    });

    try { await updateApplePass(serial); } catch (e) { console.error('Apple push error:', e); }
    try { await updateGooglePass(serial); } catch (e) { console.error('Google push error:', e); }

    res.json({
      message: 'Récompense utilisée !',
      reward: card.program.reward,
      card: {
        currentStamps: updated.currentStamps,
        currentPoints: updated.currentPoints,
        totalRewardsEarned: updated.totalRewardsEarned,
      },
    });
  } catch (error) {
    console.error('Redeem error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
