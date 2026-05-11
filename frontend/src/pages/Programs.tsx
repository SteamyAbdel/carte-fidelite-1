import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Stamp, Star, Users, ExternalLink, Copy, Check } from 'lucide-react';
import api, { apiErrorMessage } from '../api';

interface Program {
  id: string;
  name: string;
  type: 'STAMPS' | 'POINTS';
  stampGoal: number | null;
  pointsGoal: number | null;
  reward: string;
  color: string;
  isActive: boolean;
  _count: { cards: number };
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadPrograms = () => {
    api.get('/programs').then(({ data }) => {
      setPrograms(data);
      setLoading(false);
    });
  };

  useEffect(loadPrograms, []);

  const copyLink = (programId: string) => {
    const url = `${window.location.origin}/join/${programId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(programId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programmes de fidélité</h1>
          <p className="text-gray-500 mt-1">Gérez vos programmes et suivez vos clients</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau programme
        </button>
      </div>

      {showCreate && <CreateProgramForm onClose={() => setShowCreate(false)} onCreated={loadPrograms} />}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-gray-200 p-12">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Aucun programme</h2>
          <p className="text-gray-500 mb-6">Créez votre premier programme de fidélité</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Créer un programme
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {programs.map((program) => (
            <div key={program.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: program.color }}
                  >
                    {program.type === 'STAMPS' ? (
                      <Stamp className="w-6 h-6 text-white" />
                    ) : (
                      <Star className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <Link to={`/programs/${program.id}`} className="text-lg font-semibold text-gray-900 hover:text-indigo-600">
                      {program.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {program.type === 'STAMPS'
                        ? `${program.stampGoal} tampons`
                        : `${program.pointsGoal} points`}{' '}
                      &rarr; {program.reward}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3.5 h-3.5" />
                        {program._count.cards} client{program._count.cards !== 1 ? 's' : ''}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        program.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {program.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(program.id)}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                    title="Copier le lien d'inscription"
                  >
                    {copiedId === program.id ? (
                      <><Check className="w-4 h-4 text-green-600" /> Copié !</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Lien</>
                    )}
                  </button>
                  <Link
                    to={`/programs/${program.id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
                  >
                    Détails <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateProgramForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    type: 'STAMPS' as 'STAMPS' | 'POINTS',
    stampGoal: 10,
    pointsPerEuro: 1,
    pointsGoal: 100,
    reward: '',
    description: '',
    color: '#4f46e5',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/programs', form);
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Erreur'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 space-y-5">
        <h2 className="text-xl font-bold text-gray-900">Nouveau programme</h2>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du programme *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Carte fidélité Déjeuner"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'STAMPS' })}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                form.type === 'STAMPS' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              <Stamp className="w-5 h-5 mb-1 text-indigo-600" />
              <div className="font-medium text-sm">Tampons</div>
              <div className="text-xs text-gray-500">X visites = 1 cadeau</div>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: 'POINTS' })}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                form.type === 'POINTS' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              <Star className="w-5 h-5 mb-1 text-indigo-600" />
              <div className="font-medium text-sm">Points</div>
              <div className="text-xs text-gray-500">Accumuler des points</div>
            </button>
          </div>
        </div>

        {form.type === 'STAMPS' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de tampons *</label>
            <input
              type="number"
              min={2}
              max={30}
              value={form.stampGoal}
              onChange={(e) => setForm({ ...form, stampGoal: parseInt(e.target.value) })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Points par euro *</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={form.pointsPerEuro}
                onChange={(e) => setForm({ ...form, pointsPerEuro: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Objectif points *</label>
              <input
                type="number"
                min={10}
                value={form.pointsGoal}
                onChange={(e) => setForm({ ...form, pointsGoal: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Récompense *</label>
          <input
            type="text"
            value={form.reward}
            onChange={(e) => setForm({ ...form, reward: e.target.value })}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="1 repas offert, 10% de réduction..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Couleur de la carte</label>
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}
