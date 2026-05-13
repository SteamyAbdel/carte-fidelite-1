import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Copy, Check, Stamp, Star, Pencil, Trash2, X } from 'lucide-react';
import api, { apiErrorMessage } from '../api';

interface Card {
  id: string;
  serialNumber: string;
  currentStamps: number;
  currentPoints: number;
  totalRewardsEarned: number;
  createdAt: string;
  customer: { id: string; name: string | null; email: string };
}

interface Program {
  id: string;
  name: string;
  type: 'STAMPS' | 'POINTS';
  stampGoal: number | null;
  pointsGoal: number | null;
  pointsPerEuro: number | null;
  reward: string;
  color: string;
  isActive: boolean;
  description: string | null;
  _count: { cards: number };
  cards: Card[];
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const loadProgram = () => {
    if (!id) return;
    api.get(`/programs/${id}`).then(({ data }) => {
      setProgram(data);
      setLoading(false);
    });
  };

  useEffect(loadProgram, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-4 w-96 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!program) {
    return <div className="text-center py-12 text-gray-500">Programme non trouvé</div>;
  }

  const goal = program.type === 'STAMPS' ? program.stampGoal : program.pointsGoal;

  const handleDelete = async () => {
    if (!program || !window.confirm(`Supprimer le programme "${program.name}" et toutes ses cartes ?`)) return;
    setDeleting(true);
    setError('');

    try {
      await api.delete(`/programs/${program.id}`);
      navigate('/programs');
    } catch (err) {
      setError(apiErrorMessage(err, 'Erreur lors de la suppression'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <Link to="/programs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour aux programmes
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-5">{error}</div>}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: program.color }}
            >
              {program.type === 'STAMPS' ? (
                <Stamp className="w-7 h-7 text-white" />
              ) : (
                <Star className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{program.name}</h1>
              <p className="text-gray-500 mt-1">
                {program.type === 'STAMPS' ? 'Programme tampons' : 'Programme points'} &middot;{' '}
                {goal} {program.type === 'STAMPS' ? 'tampons' : 'points'} &rarr; {program.reward}
              </p>
              {program.description && <p className="text-sm text-gray-400 mt-2">{program.description}</p>}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {copied ? (
                <><Check className="w-4 h-4 text-green-600" /> Copié !</>
              ) : (
                <><Copy className="w-4 h-4" /> Lien</>
              )}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="w-4 h-4" />
              Modifier
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clients ({program._count.cards})
          </h2>
        </div>

        {program.cards.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun client inscrit pour le moment</p>
            <p className="text-sm text-gray-400 mt-1">
              Partagez le lien d'inscription pour que vos clients rejoignent le programme
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">{program.type === 'STAMPS' ? 'Tampons' : 'Points'}</th>
                  <th className="px-6 py-3">Progression</th>
                  <th className="px-6 py-3">Récompenses</th>
                  <th className="px-6 py-3">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {program.cards.map((card) => {
                  const current = program.type === 'STAMPS' ? card.currentStamps : card.currentPoints;
                  const pct = Math.min(100, Math.round((current / (goal || 1)) * 100));

                  return (
                    <tr key={card.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 text-sm">{card.customer.name || 'Anonyme'}</div>
                        <div className="text-xs text-gray-400">{card.customer.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {current}/{goal}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: program.color }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{card.totalRewardsEarned}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(card.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditProgramModal
          program={program}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setProgram({ ...program, ...updated });
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function EditProgramModal({
  program,
  onClose,
  onSaved,
}: {
  program: Program;
  onClose: () => void;
  onSaved: (program: Program) => void;
}) {
  const [form, setForm] = useState({
    name: program.name,
    description: program.description || '',
    reward: program.reward,
    color: program.color,
    stampGoal: program.stampGoal || 10,
    pointsPerEuro: program.pointsPerEuro || 1,
    pointsGoal: program.pointsGoal || 100,
    isActive: program.isActive,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: form.name,
        description: form.description,
        reward: form.reward,
        color: form.color,
        isActive: form.isActive,
        ...(program.type === 'STAMPS'
          ? { stampGoal: form.stampGoal }
          : { pointsPerEuro: form.pointsPerEuro, pointsGoal: form.pointsGoal }),
      };
      const { data } = await api.put(`/programs/${program.id}`, payload);
      onSaved({ ...program, ...data });
    } catch (err) {
      setError(apiErrorMessage(err, 'Erreur lors de la modification'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Modifier le programme</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {program.type === 'STAMPS' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de tampons *</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.stampGoal}
              onChange={(event) => setForm({ ...form, stampGoal: parseInt(event.target.value, 10) || 1 })}
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
                onChange={(event) => setForm({ ...form, pointsPerEuro: parseFloat(event.target.value) || 0.1 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Objectif points *</label>
              <input
                type="number"
                min={1}
                value={form.pointsGoal}
                onChange={(event) => setForm({ ...form, pointsGoal: parseInt(event.target.value, 10) || 1 })}
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
            onChange={(event) => setForm({ ...form, reward: event.target.value })}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Programme actif
          </label>
          <input
            type="color"
            value={form.color}
            onChange={(event) => setForm({ ...form, color: event.target.value })}
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
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </form>
    </div>
  );
}
