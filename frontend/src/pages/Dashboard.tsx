import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CreditCard, ArrowRightLeft, Gift, Plus, Search, Mail, Phone,
  Stamp, Star, Trophy, ChevronDown, TrendingUp, Clock, Crown, X,
} from 'lucide-react';
import api from '../api';

interface ProgramDetail {
  id: string;
  name: string;
  type: 'STAMPS' | 'POINTS';
  isActive: boolean;
  stampGoal: number | null;
  pointsGoal: number | null;
  reward: string;
  color: string;
  totalCards: number;
  totalTransactions: number;
  totalRewards: number;
  avgProgress: number;
}

interface TopClient {
  name: string;
  email: string;
  totalTransactions: number;
  totalRewards: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  createdAt: string;
  clientName: string;
}

interface RecentClient {
  name: string;
  email: string;
  joinedAt: string;
}

interface RewardEntry {
  clientName: string;
  totalRewards: number;
}

interface Stats {
  totalPrograms: number;
  totalCards: number;
  totalTransactions: number;
  totalRewards: number;
  newCardsThisWeek: number;
  newCardsThisMonth: number;
  transactionsThisWeek: number;
  transactionsThisMonth: number;
  programDetails: ProgramDetail[];
  topClients: TopClient[];
  recentTransactions: RecentTransaction[];
  recentClients: RecentClient[];
  rewardsHistory: RewardEntry[];
}

interface ClientCard {
  serialNumber: string;
  programName: string;
  programType: 'STAMPS' | 'POINTS';
  currentStamps: number;
  currentPoints: number;
  stampGoal: number | null;
  pointsGoal: number | null;
  totalRewardsEarned: number;
  lastVisit: string;
  createdAt: string;
}

interface Client {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  customerSince: string;
  card: ClientCard;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return formatDate(dateStr);
}

function txLabel(type: string): { label: string; color: string } {
  switch (type) {
    case 'STAMP_ADD': return { label: 'Tampon', color: 'bg-indigo-100 text-indigo-700' };
    case 'POINTS_ADD': return { label: 'Points', color: 'bg-amber-100 text-amber-700' };
    case 'REWARD_CLAIMED': return { label: 'Récompense', color: 'bg-rose-100 text-rose-700' };
    default: return { label: type, color: 'bg-gray-100 text-gray-700' };
  }
}

function ProgressBar({ current, goal, color }: { current: number; goal: number; color: string }) {
  const pct = Math.min((current / goal) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

type PanelId = 'programs' | 'cards' | 'transactions' | 'rewards' | null;

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const restaurant = JSON.parse(localStorage.getItem('restaurant') || '{}');

  useEffect(() => {
    api.get('/restaurants/stats').then(({ data }) => {
      setStats({
        totalPrograms: data.totalPrograms ?? 0,
        totalCards: data.totalCards ?? 0,
        totalTransactions: data.totalTransactions ?? 0,
        totalRewards: data.totalRewards ?? 0,
        newCardsThisWeek: data.newCardsThisWeek ?? 0,
        newCardsThisMonth: data.newCardsThisMonth ?? 0,
        transactionsThisWeek: data.transactionsThisWeek ?? 0,
        transactionsThisMonth: data.transactionsThisMonth ?? 0,
        programDetails: data.programDetails ?? [],
        topClients: data.topClients ?? [],
        recentTransactions: data.recentTransactions ?? [],
        recentClients: data.recentClients ?? [],
        rewardsHistory: data.rewardsHistory ?? [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));

    api.get('/restaurants/clients').then(({ data }) => {
      setClients(data);
      setClientsLoading(false);
    }).catch(() => setClientsLoading(false));
  }, []);

  const togglePanel = (panel: PanelId) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      c.card.programName.toLowerCase().includes(q)
    );
  });

  const statCards: { id: PanelId; label: string; value: number; sub: string; icon: typeof CreditCard; color: string; bg: string }[] = stats ? [
    {
      id: 'programs', label: 'Programmes actifs', value: stats.totalPrograms,
      sub: `${stats.programDetails.filter((p) => p.isActive).length} actif${stats.programDetails.filter((p) => p.isActive).length > 1 ? 's' : ''}`,
      icon: CreditCard, color: 'bg-indigo-500', bg: 'hover:border-indigo-300',
    },
    {
      id: 'cards', label: 'Cartes distribuées', value: stats.totalCards,
      sub: `+${stats.newCardsThisWeek} cette semaine`,
      icon: Users, color: 'bg-emerald-500', bg: 'hover:border-emerald-300',
    },
    {
      id: 'transactions', label: 'Transactions', value: stats.totalTransactions,
      sub: `+${stats.transactionsThisWeek} cette semaine`,
      icon: ArrowRightLeft, color: 'bg-amber-500', bg: 'hover:border-amber-300',
    },
    {
      id: 'rewards', label: 'Récompenses offertes', value: stats.totalRewards,
      sub: `${stats.rewardsHistory.length} client${stats.rewardsHistory.length > 1 ? 's' : ''} récompensé${stats.rewardsHistory.length > 1 ? 's' : ''}`,
      icon: Gift, color: 'bg-rose-500', bg: 'hover:border-rose-300',
    },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {restaurant.name}</h1>
          <p className="text-gray-500 mt-1">Voici un aperçu de votre programme de fidélité</p>
        </div>
        <Link
          to="/programs"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau programme
        </Link>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-lg mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <button
              key={stat.label}
              onClick={() => togglePanel(stat.id)}
              className={`bg-white rounded-xl border-2 p-6 text-left transition-all cursor-pointer ${
                activePanel === stat.id ? 'border-gray-400 shadow-md' : `border-gray-200 ${stat.bg}`
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`inline-flex items-center justify-center w-10 h-10 ${stat.color} rounded-lg mb-3`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activePanel === stat.id ? 'rotate-180' : ''}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.sub}</div>
            </button>
          ))}
        </div>
      )}

      {/* Detail panels */}
      {stats && activePanel && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              {activePanel === 'programs' && 'Détail des programmes'}
              {activePanel === 'cards' && 'Nouveaux clients'}
              {activePanel === 'transactions' && 'Activité récente'}
              {activePanel === 'rewards' && 'Récompenses'}
            </h3>
            <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ---- PROGRAMMES ---- */}
          {activePanel === 'programs' && (
            <div className="p-6">
              {stats.programDetails.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Aucun programme créé</p>
              ) : (
                <div className="space-y-4">
                  {stats.programDetails.map((prog) => (
                    <Link
                      key={prog.id}
                      to={`/programs/${prog.id}`}
                      className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="w-3 h-12 rounded-full" style={{ backgroundColor: prog.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{prog.name}</span>
                          {prog.isActive ? (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Actif</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactif</span>
                          )}
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {prog.type === 'STAMPS' ? 'Tampons' : 'Points'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">{prog.reward}</div>
                      </div>
                      <div className="flex gap-6 text-center">
                        <div>
                          <div className="text-lg font-bold text-gray-900">{prog.totalCards}</div>
                          <div className="text-xs text-gray-400">clients</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">{prog.totalTransactions}</div>
                          <div className="text-xs text-gray-400">transactions</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-900">{prog.avgProgress}%</div>
                          <div className="text-xs text-gray-400">progression moy.</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- CARDS / NEW CLIENTS ---- */}
          {activePanel === 'cards' && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-emerald-700 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Cette semaine</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-800">+{stats.newCardsThisWeek}</div>
                  <div className="text-xs text-emerald-600">nouveaux clients</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-700 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Ce mois</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-800">+{stats.newCardsThisMonth}</div>
                  <div className="text-xs text-blue-600">nouveaux clients</div>
                </div>
              </div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Dernières inscriptions</h4>
              {stats.recentClients.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Aucune inscription récente</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentClients.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold text-sm">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-400">{c.email}</div>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelative(c.joinedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- TRANSACTIONS ---- */}
          {activePanel === 'transactions' && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-700 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Cette semaine</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-800">{stats.transactionsThisWeek}</div>
                  <div className="text-xs text-amber-600">transactions</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-orange-700 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Ce mois</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-800">{stats.transactionsThisMonth}</div>
                  <div className="text-xs text-orange-600">transactions</div>
                </div>
              </div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Dernières transactions</h4>
              {stats.recentTransactions.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Aucune transaction pour le moment</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentTransactions.map((tx) => {
                    const { label, color } = txLabel(tx.type);
                    return (
                      <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${color}`}>{label}</span>
                        <div className="flex-1">
                          <span className="text-sm text-gray-900">{tx.clientName}</span>
                          {tx.note && <span className="text-xs text-gray-400 ml-2">— {tx.note}</span>}
                        </div>
                        {tx.amount > 0 && <span className="text-sm font-medium text-gray-600">+{tx.amount}</span>}
                        <span className="text-xs text-gray-400">{formatRelative(tx.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ---- REWARDS ---- */}
          {activePanel === 'rewards' && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-rose-50 rounded-lg p-4 flex-1">
                  <div className="text-2xl font-bold text-rose-800">{stats.totalRewards}</div>
                  <div className="text-xs text-rose-600">récompenses distribuées au total</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 flex-1">
                  <div className="text-2xl font-bold text-purple-800">{stats.rewardsHistory.length}</div>
                  <div className="text-xs text-purple-600">clients ont été récompensés</div>
                </div>
              </div>
              {stats.topClients.length > 0 && (
                <>
                  <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Meilleurs clients
                  </h4>
                  <div className="space-y-2">
                    {stats.topClients.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-400">{c.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">{c.totalTransactions} visites</div>
                          <div className="text-xs text-rose-500">{c.totalRewards} récompense{c.totalRewards > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {stats.rewardsHistory.length === 0 && stats.topClients.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">Aucune récompense distribuée pour le moment</p>
              )}
            </div>
          )}
        </div>
      )}

      {stats && stats.totalPrograms === 0 && (
        <div className="mt-8 text-center bg-white rounded-2xl border border-gray-200 p-12">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Aucun programme de fidélité</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Créez votre premier programme de fidélité pour commencer à récompenser vos clients.
          </p>
          <Link
            to="/programs"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer un programme
          </Link>
        </div>
      )}

      {/* Clients section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64"
            />
          </div>
        </div>

        {clientsLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {search ? 'Aucun client trouvé pour cette recherche' : 'Aucun client inscrit pour le moment'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Programme</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Progression</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Récompenses</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Dernière visite</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const isStamps = client.card.programType === 'STAMPS';
                    const current = isStamps ? client.card.currentStamps : client.card.currentPoints;
                    const goal = (isStamps ? client.card.stampGoal : client.card.pointsGoal) || 1;
                    return (
                      <tr key={client.card.serialNumber} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm">
                              {(client.name || client.email)[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">{client.name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              {client.email}
                            </span>
                            {client.phone && (
                              <span className="flex items-center gap-1.5 text-gray-500">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                {client.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 text-gray-700">
                            {isStamps ? <Stamp className="w-3.5 h-3.5 text-indigo-500" /> : <Star className="w-3.5 h-3.5 text-amber-500" />}
                            {client.card.programName}
                          </span>
                        </td>
                        <td className="py-3 px-4 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <ProgressBar current={current} goal={goal} color={isStamps ? '#6366f1' : '#f59e0b'} />
                            <span className="text-xs text-gray-500 whitespace-nowrap">{current}/{goal}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-gray-700">
                            <Trophy className="w-3.5 h-3.5 text-rose-500" />
                            {client.card.totalRewardsEarned}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{formatDate(client.card.lastVisit)}</td>
                        <td className="py-3 px-4 text-gray-500">{formatDate(client.card.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {filteredClients.map((client) => {
                const isStamps = client.card.programType === 'STAMPS';
                const current = isStamps ? client.card.currentStamps : client.card.currentPoints;
                const goal = (isStamps ? client.card.stampGoal : client.card.pointsGoal) || 1;
                return (
                  <div key={client.card.serialNumber} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                        {(client.name || client.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{client.name || '—'}</div>
                        <div className="text-xs text-gray-500">{client.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        {isStamps ? <Stamp className="w-3.5 h-3.5 text-indigo-500" /> : <Star className="w-3.5 h-3.5 text-amber-500" />}
                        {client.card.programName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Trophy className="w-3.5 h-3.5 text-rose-500" />
                        {client.card.totalRewardsEarned} récompense{client.card.totalRewardsEarned !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar current={current} goal={goal} color={isStamps ? '#6366f1' : '#f59e0b'} />
                      <span className="text-xs text-gray-500 whitespace-nowrap">{current}/{goal}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Dernière visite : {formatDate(client.card.lastVisit)}</span>
                      <span>Depuis le {formatDate(client.card.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
