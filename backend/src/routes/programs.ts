import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { param } from '../utils/params';
import { nonEmptyString, optionalHexColor, positiveInt } from '../utils/validation';

export const programRouter = Router();

programRouter.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, description } = req.body;
    const name = nonEmptyString(req.body.name);
    const reward = nonEmptyString(req.body.reward);
    const stampGoal = positiveInt(req.body.stampGoal);
    const pointsGoal = positiveInt(req.body.pointsGoal);
    const pointsPerEuro = typeof req.body.pointsPerEuro === 'number' && req.body.pointsPerEuro > 0 ? req.body.pointsPerEuro : null;
    const color = optionalHexColor(req.body.color);

    if ((type !== 'STAMPS' && type !== 'POINTS') || !name || !reward) {
      res.status(400).json({ error: 'Type, nom et récompense requis' });
      return;
    }

    if (type === 'STAMPS' && !stampGoal) {
      res.status(400).json({ error: 'Nombre de tampons requis pour un programme tampons' });
      return;
    }

    if (type === 'POINTS' && (!pointsPerEuro || !pointsGoal)) {
      res.status(400).json({ error: 'Points par euro et objectif requis pour un programme points' });
      return;
    }

    if (req.body.color && !color) {
      res.status(400).json({ error: 'Couleur invalide' });
      return;
    }

    const program = await prisma.loyaltyProgram.create({
      data: {
        restaurantId: req.restaurantId!,
        type,
        name,
        description: typeof description === 'string' ? description.trim() : null,
        stampGoal: type === 'STAMPS' ? stampGoal : null,
        pointsPerEuro: type === 'POINTS' ? pointsPerEuro : null,
        pointsGoal: type === 'POINTS' ? pointsGoal : null,
        reward,
        color: color || '#1a1a2e',
      },
    });

    res.status(201).json(program);
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

programRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const programs = await prisma.loyaltyProgram.findMany({
      where: { restaurantId: req.restaurantId },
      include: { _count: { select: { cards: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(programs);
  } catch (error) {
    console.error('List programs error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

programRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = param(req.params.id);
    const program = await prisma.loyaltyProgram.findFirst({
      where: { id, restaurantId: req.restaurantId },
      include: {
        _count: { select: { cards: true } },
        cards: {
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!program) {
      res.status(404).json({ error: 'Programme non trouvé' });
      return;
    }

    res.json(program);
  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

programRouter.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = param(req.params.id);
    const existing = await prisma.loyaltyProgram.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Programme non trouvé' });
      return;
    }

    const name = req.body.name === undefined ? undefined : nonEmptyString(req.body.name);
    const reward = req.body.reward === undefined ? undefined : nonEmptyString(req.body.reward);
    const color = req.body.color === undefined ? undefined : optionalHexColor(req.body.color);
    const { description, isActive } = req.body;

    if ((req.body.name !== undefined && !name) || (req.body.reward !== undefined && !reward)) {
      res.status(400).json({ error: 'Nom ou récompense invalide' });
      return;
    }

    if (req.body.color !== undefined && !color) {
      res.status(400).json({ error: 'Couleur invalide' });
      return;
    }

    const program = await prisma.loyaltyProgram.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description: typeof description === 'string' ? description.trim() : null }),
        ...(reward && { reward }),
        ...(color && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(program);
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

programRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = param(req.params.id);
    const existing = await prisma.loyaltyProgram.findFirst({
      where: { id, restaurantId: req.restaurantId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Programme non trouvé' });
      return;
    }

    await prisma.loyaltyProgram.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
