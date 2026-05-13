import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Award, QrCode, LogOut, Image, X } from 'lucide-react';
import api, { apiErrorMessage } from '../api';

interface LayoutProps {
  onLogout: () => void;
}

export default function Layout({ onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(() => JSON.parse(localStorage.getItem('restaurant') || '{}'));
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('restaurant');
    onLogout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Award className="w-7 h-7 text-indigo-600" />
              <span className="font-bold text-lg text-gray-900">Fidélité</span>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <NavLink to="/" end className={linkClass}>
                <LayoutDashboard className="w-4 h-4" />
                Tableau de bord
              </NavLink>
              <NavLink to="/programs" className={linkClass}>
                <Award className="w-4 h-4" />
                Programmes
              </NavLink>
              <NavLink to="/scanner" className={linkClass}>
                <QrCode className="w-4 h-4" />
                Scanner
              </NavLink>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:block">{restaurant.name}</span>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline">Logo</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="sm:hidden flex border-t border-gray-100">
          <NavLink to="/" end className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-indigo-600' : 'text-gray-500'}`
          }>
            <LayoutDashboard className="w-5 h-5" />
            Accueil
          </NavLink>
          <NavLink to="/programs" className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-indigo-600' : 'text-gray-500'}`
          }>
            <Award className="w-5 h-5" />
            Programmes
          </NavLink>
          <NavLink to="/scanner" className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-indigo-600' : 'text-gray-500'}`
          }>
            <QrCode className="w-5 h-5" />
            Scanner
          </NavLink>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {showSettings && (
        <LogoSettingsModal
          restaurant={restaurant}
          onClose={() => setShowSettings(false)}
          onSaved={(updated) => {
            localStorage.setItem('restaurant', JSON.stringify(updated));
            setRestaurant(updated);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
}

interface RestaurantProfile {
  id?: string;
  name?: string;
  email?: string;
  logo?: string | null;
  address?: string | null;
  phone?: string | null;
}

function LogoSettingsModal({
  restaurant,
  onClose,
  onSaved,
}: {
  restaurant: RestaurantProfile;
  onClose: () => void;
  onSaved: (restaurant: RestaurantProfile) => void;
}) {
  const [logo, setLogo] = useState<string>(restaurant.logo || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (file.type !== 'image/png') {
      setError('Utilisez un logo PNG.');
      return;
    }
    if (file.size > 500 * 1024) {
      setError('Le logo doit faire 500 Ko maximum.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ''));
    reader.onerror = () => setError('Impossible de lire le fichier.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.put('/restaurants/me', { logo });
      onSaved(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Erreur lors de la sauvegarde du logo'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Logo restaurant</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
            {logo ? (
              <img src={logo} alt="Logo restaurant" className="w-full h-full object-contain" />
            ) : (
              <Image className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fichier PNG</label>
            <input
              type="file"
              accept="image/png"
              onChange={(event) => handleFile(event.target.files?.[0])}
              className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setLogo('')}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Retirer
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
