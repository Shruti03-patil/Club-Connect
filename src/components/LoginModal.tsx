import { X, User, GraduationCap, Shield } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const roles = [
    { id: 'student', label: 'Student', icon: GraduationCap, color: 'bg-blue-600 hover:bg-blue-700' },
    { id: 'teacher', label: 'Teacher', icon: User, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'bg-amber-600 hover:bg-amber-700' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Choose Your Role</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="space-y-3">
          {roles.map((role) => (
            <button
              key={role.id}
              className={`w-full flex items-center gap-4 p-4 rounded-md ${role.color} text-white transition-colors shadow-sm`}
            >
              <div className="p-1 bg-white/20 rounded-md">
                <role.icon className="w-5 h-5" />
              </div>
              <span className="text-lg font-medium">Login as {role.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
