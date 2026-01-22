import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserPlus, X, Check, Users } from 'lucide-react';
import { ClubMember, ClubMemberRole } from '../types/auth';
import { getClubMembers, addClubMember, updateClubMember, removeClubMember } from '../lib/firestoreService';

interface MemberManagerProps {
    clubId: string;
    clubName: string;
    isReadOnly?: boolean;
}

const ROLE_OPTIONS: { value: ClubMemberRole; label: string }[] = [
    { value: 'president', label: 'President' },
    { value: 'vice-president', label: 'Vice President' },
    { value: 'treasurer', label: 'Treasurer' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'coordinator', label: 'Coordinator' },
    { value: 'member', label: 'Member' },
];

const ROLE_COLORS: Record<ClubMemberRole, string> = {
    'president': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'vice-president': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'treasurer': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'secretary': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'coordinator': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    'member': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

export default function MemberManager({ clubId, clubName, isReadOnly = false }: MemberManagerProps) {
    const [members, setMembers] = useState<ClubMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
    const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [newMember, setNewMember] = useState({
        name: '',
        email: '',
        role: 'member' as ClubMemberRole,
    });

    // Fetch members on mount
    useEffect(() => {
        fetchMembers();
    }, [clubId]);

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            const membersList = await getClubMembers(clubId);
            setMembers(membersList);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!newMember.name.trim() || !newMember.email.trim()) {
            setFormMessage({ type: 'error', text: 'Please fill in all fields' });
            return;
        }

        const result = await addClubMember(clubId, newMember);
        if (result.success) {
            setFormMessage({ type: 'success', text: 'Member added successfully!' });
            setNewMember({ name: '', email: '', role: 'member' });
            await fetchMembers();
            setTimeout(() => {
                setIsAddModalOpen(false);
                setFormMessage(null);
            }, 1000);
        } else {
            setFormMessage({ type: 'error', text: result.error || 'Failed to add member' });
        }
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;

        const success = await updateClubMember(clubId, editingMember.id!, {
            name: editingMember.name,
            email: editingMember.email,
            role: editingMember.role,
        });

        if (success) {
            await fetchMembers();
            setEditingMember(null);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return;

        const success = await removeClubMember(clubId, memberId);
        if (success) {
            await fetchMembers();
        }
    };

    const getRoleLabel = (role: ClubMemberRole) => {
        return ROLE_OPTIONS.find(r => r.value === role)?.label || role;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{clubName} Members</h3>
                {!isReadOnly && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Member
                    </button>
                )}
            </div>

            {/* Members List */}
            {members.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">No members yet. Add your first club member!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {members.map((member) => (
                        <div
                            key={member.id}
                            className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center justify-between"
                        >
                            {editingMember?.id === member.id && editingMember ? (
                                // Edit mode
                                <div className="flex-1 flex flex-wrap items-center gap-3">
                                    <input
                                        type="text"
                                        value={editingMember.name}
                                        onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                        className="flex-1 min-w-[150px] px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="email"
                                        value={editingMember.email}
                                        onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                                        className="flex-1 min-w-[150px] px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <select
                                        value={editingMember.role}
                                        onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as ClubMemberRole })}
                                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {ROLE_OPTIONS.map((role) => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleUpdateMember}
                                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingMember(null)}
                                            className="p-2 bg-slate-400 hover:bg-slate-500 text-white rounded-lg transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View mode
                                <>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="font-semibold text-slate-900 dark:text-white">{member.name}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[member.role]}`}>
                                                {getRoleLabel(member.role)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-500">
                                            Joined: {member.joinedAt.toLocaleDateString()}
                                        </p>
                                    </div>
                                    {!isReadOnly && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingMember(member)}
                                                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                                title="Edit member"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveMember(member.id!)}
                                                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                title="Remove member"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Member Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add New Member</h3>
                            <button
                                onClick={() => { setIsAddModalOpen(false); setFormMessage(null); }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {formMessage && (
                            <div className={`p-3 rounded-lg mb-4 ${formMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                {formMessage.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={newMember.name}
                                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Member name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={newMember.email}
                                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="member@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Role
                                </label>
                                <select
                                    value={newMember.role}
                                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value as ClubMemberRole })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {ROLE_OPTIONS.map((role) => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setIsAddModalOpen(false); setFormMessage(null); }}
                                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddMember}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Member
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
