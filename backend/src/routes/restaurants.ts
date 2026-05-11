import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const restaurantRouter = Router();

restaurantRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      select: { id: true, name: true, email: true, logo: true, address: true, phone: true, createdAt: true },
    });

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant non trouvé' });
      return;
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

restaurantRouter.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, phone, logo } = req.body;

    const restaurant = await prisma.restaurant.update({
      where: { id: req.restaurantId },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(logo !== undefined && { logo }),
      },
      select: { id: true, name: true, email: true, logo: true, address: true, phone: true },
    });

    res.json(restaurant);
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

restaurantRouter.get('/clients', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const programs = await prisma.loyaltyProgram.findMany({
      where: { restaurantId: req.restaurantId },
      select: { id: true },
    });
    const programIds = programs.map((p) => p.id);

    const cards = await prisma.loyaltyCard.findMany({
      where: { programId: { in: programIds } },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
        program: { select: { id: true, name: true, type: true, stampGoal: true, pointsGoal: true, reward: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const clients = cards.map((card) => ({
      id: card.customer.id,
      name: card.customer.name,
      email: card.customer.email,
      phone: card.customer.phone,
      customerSince: card.customer.createdAt,
      card: {
        serialNumber: card.serialNumber,
        programName: card.program.name,
        programType: card.program.type,
        currentStamps: card.currentStamps,
        currentPoints: card.currentPoints,
        stampGoal: card.program.stampGoal,
        pointsGoal: card.program.pointsGoal,
        totalRewardsEarned: card.totalRewardsEarned,
        lastVisit: card.transactions[0]?.createdAt || card.createdAt,
        createdAt: card.createdAt,
      },
    }));

    res.json(clients);
  } catch (error) {
    console.error('Clients error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

restaurantRouter.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const programs = await prisma.loyaltyProgram.findMany({
      where: { restaurantId: req.restaurantId },
      include: {
        _count: { select: { cards: true } },
        cards: {
          include: {
            _count: { select: { transactions: true } },
            customer: { select: { name: true, email: true } },
          },
        },
      },
    });

    const allCards = programs.flatMap((p) => p.cards);
    const transactionWhere = { card: { program: { restaurantId: req.restaurantId } } };
    const [
      totalTransactions,
      transactionsThisWeek,
      transactionsThisMonth,
      recentTransactionRows,
    ] = await prisma.$transaction([
      prisma.transaction.count({ where: transactionWhere }),
      prisma.transaction.count({ where: { ...transactionWhere, createdAt: { gte: sevenDaysAgo } } }),
      prisma.transaction.count({ where: { ...transactionWhere, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.transaction.findMany({
        where: transactionWhere,
        include: {
          card: {
            include: {
              customer: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalCards = programs.reduce((sum, p) => sum + p._count.cards, 0);
    const totalRewards = allCards.reduce((s, c) => s + c.totalRewardsEarned, 0);

    const newCardsThisWeek = allCards.filter((c) => c.createdAt >= sevenDaysAgo).length;
    const newCardsThisMonth = allCards.filter((c) => c.createdAt >= thirtyDaysAgo).length;

    const programDetails = programs.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      isActive: p.isActive,
      stampGoal: p.stampGoal,
      pointsGoal: p.pointsGoal,
      reward: p.reward,
      color: p.color,
      totalCards: p._count.cards,
      totalTransactions: p.cards.reduce((s, c) => s + c._count.transactions, 0),
      totalRewards: p.cards.reduce((s, c) => s + c.totalRewardsEarned, 0),
      avgProgress: p.cards.length > 0
        ? Math.round(
            p.cards.reduce((s, c) => {
              const goal = p.type === 'STAMPS' ? (p.stampGoal || 1) : (p.pointsGoal || 1);
              const current = p.type === 'STAMPS' ? c.currentStamps : c.currentPoints;
              return s + (current / goal) * 100;
            }, 0) / p.cards.length
          )
        : 0,
    }));

    const topClients = allCards
      .map((c) => ({
        name: c.customer.name || c.customer.email,
        email: c.customer.email,
        totalTransactions: c._count.transactions,
        totalRewards: c.totalRewardsEarned,
        currentStamps: c.currentStamps,
        currentPoints: c.currentPoints,
      }))
      .sort((a, b) => b.totalTransactions - a.totalTransactions)
      .slice(0, 5);

    const recentTransactions = recentTransactionRows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      note: t.note,
      createdAt: t.createdAt,
      clientName: t.card.customer.name || t.card.customer.email,
    }));

    const recentClients = allCards
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((c) => ({
        name: c.customer.name || c.customer.email,
        email: c.customer.email,
        joinedAt: c.createdAt,
      }));

    const rewardsHistory = allCards
      .filter((c) => c.totalRewardsEarned > 0)
      .map((c) => ({
        clientName: c.customer.name || c.customer.email,
        totalRewards: c.totalRewardsEarned,
      }))
      .sort((a, b) => b.totalRewards - a.totalRewards);

    res.json({
      totalPrograms: programs.length,
      totalCards,
      totalTransactions,
      totalRewards,
      newCardsThisWeek,
      newCardsThisMonth,
      transactionsThisWeek,
      transactionsThisMonth,
      programDetails,
      topClients,
      recentTransactions,
      recentClients,
      rewardsHistory,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
