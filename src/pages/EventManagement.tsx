import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Calendar, MapPin, AlignLeft, Link as LinkIcon, Users, DollarSign, Plus, Trash2, CheckCircle, Circle, UserPlus, Clock, XCircle } from 'lucide-react';
import { sendTaskAssignmentEmails, isEmailConfigured } from '../lib/emailService';
import { FirestorePost, User, ClubMember, EventTask, BudgetItem, EventRSVP } from '../types/auth';
import { getPosts, updatePost, getClubMembers, getEventRSVPs, updateParticipantAttendance, addEventParticipant, deleteEventParticipant } from '../lib/firestoreService';

interface EventManagementProps {
    eventId: string;
    onBack?: () => void;
    user?: User | null;
}

export default function EventManagement({ eventId, onBack, user }: EventManagementProps) {
    const [post, setPost] = useState<FirestorePost | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'roles' | 'budget' | 'participants'>('details');
    const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
    const [eventRsvps, setEventRsvps] = useState<EventRSVP[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    // Form State for Details
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        date: '',
        time: '',
        location: '',
        locationUrl: '',
        registrationlink: '',
        responseSpreadsheetUrl: '',
        eventWhatsappLink: '',
    });

    // Tasks State
    const [tasks, setTasks] = useState<EventTask[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
    const [newTaskDeadline, setNewTaskDeadline] = useState('');

    // Budget State
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [newBudgetItem, setNewBudgetItem] = useState({
        description: '',
        category: 'misc' as BudgetItem['category'],
        estimatedCost: 0,
        actualCost: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const posts = await getPosts();
                const foundPost = posts.find(p => p.id === eventId);
                if (foundPost) {
                    setPost(foundPost);
                    setFormData({
                        title: foundPost.title,
                        content: foundPost.content,
                        date: foundPost.date,
                        time: foundPost.time || '',
                        location: foundPost.location || '',
                        locationUrl: foundPost.locationUrl || '',
                        registrationlink: foundPost.registrationLink || '',
                        responseSpreadsheetUrl: (foundPost as any).responseSpreadsheetUrl || '',
                        eventWhatsappLink: foundPost.eventWhatsappLink || '',
                    });
                    // Load tasks and budget from post if they exist
                    setTasks((foundPost as any).eventTasks || []);
                    setBudgetItems((foundPost as any).eventBudget || []);

                    // Fetch club members for assignment dropdown
                    if (foundPost.clubId) {
                        const members = await getClubMembers(foundPost.clubId);
                        setClubMembers(members);
                    }

                    // Fetch RSVPs for attendees tab
                    if (foundPost.id) {
                        const rsvps = await getEventRSVPs(foundPost.id);
                        setEventRsvps(rsvps);
                    }
                }
            } catch (error) {
                console.error('Error fetching post:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [eventId]);

    const handleSave = async () => {
        if (!post?.id) return;

        setIsSaving(true);
        setMessage(null);

        try {
            const success = await updatePost(post.id, {
                title: formData.title,
                content: formData.content,
                date: formData.date,
                time: formData.time,
                location: formData.location,
                locationUrl: formData.locationUrl,
                registrationLink: formData.registrationlink,
                responseSpreadsheetUrl: formData.responseSpreadsheetUrl,
                eventWhatsappLink: formData.eventWhatsappLink,
                eventTasks: tasks,
                eventBudget: budgetItems,
            } as any);

            if (success) {
                setMessage({ type: 'success', text: 'Event updated successfully!' });
                setPost(prev => prev ? { ...prev, ...formData, registrationLink: formData.registrationlink, responseSpreadsheetUrl: formData.responseSpreadsheetUrl } as any : null);
            } else {
                setMessage({ type: 'error', text: 'Failed to update event.' });
            }
        } catch (error) {
            console.error('Error updating post:', error);
            setMessage({ type: 'error', text: 'An error occurred while saving.' });
        } finally {
            setIsSaving(false);
        }
    };

    // Task Management Functions
    const addTask = async () => {
        if (!newTaskTitle.trim()) return;
        const assignees = newTaskAssignees.length > 0 ? newTaskAssignees : ['Unassigned'];
        const emails = assignees.map(name => clubMembers.find(m => m.name === name)?.email).filter(Boolean) as string[];
        const newTask: EventTask = {
            id: Date.now().toString(),
            title: newTaskTitle,
            assignedTo: assignees,
            assignedToEmails: emails,
            deadline: newTaskDeadline || undefined,
            status: 'pending',
            createdBy: user?.name || 'Unknown',
            createdAt: new Date().toISOString(),
        };
        setTasks([...tasks, newTask]);
        setNewTaskTitle('');
        setNewTaskAssignees([]);
        setNewTaskDeadline('');

        // Send email notifications to assignees (if emails are available and not 'Unassigned')
        if (emails.length > 0 && !assignees.includes('Unassigned')) {
            try {
                await sendTaskAssignmentEmails(
                    emails,
                    assignees,
                    newTaskTitle,
                    newTaskDeadline || undefined,
                    post?.title || 'Event',
                    user?.name || 'Unknown'
                );
                if (isEmailConfigured()) {
                    setMessage({ type: 'success', text: 'Task created and notification emails sent!' });
                }
            } catch (error) {
                console.error('Failed to send notification emails:', error);
                // Task is still created even if email fails
            }
        }
    };

    const toggleAssignee = (name: string) => {
        setNewTaskAssignees(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : [...prev, name]
        );
    };

    const updateTaskStatus = (taskId: string, status: EventTask['status']) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
    };

    const deleteTask = (taskId: string) => {
        setTasks(tasks.filter(t => t.id !== taskId));
    };

    // Budget Management Functions
    const addBudgetItem = () => {
        if (!newBudgetItem.description.trim()) return;
        const item: BudgetItem = {
            id: Date.now().toString(),
            ...newBudgetItem,
            paid: false,
        };
        setBudgetItems([...budgetItems, item]);
        setNewBudgetItem({ description: '', category: 'misc', estimatedCost: 0, actualCost: 0 });
    };

    const updateBudgetItem = (itemId: string, updates: Partial<BudgetItem>) => {
        setBudgetItems(budgetItems.map(b => b.id === itemId ? { ...b, ...updates } : b));
    };

    const deleteBudgetItem = (itemId: string) => {
        setBudgetItems(budgetItems.filter(b => b.id !== itemId));
    };

    // Budget calculations
    const totalEstimated = budgetItems.reduce((sum, item) => sum + item.estimatedCost, 0);
    const totalActual = budgetItems.reduce((sum, item) => sum + item.actualCost, 0);
    const totalPaid = budgetItems.filter(b => b.paid).reduce((sum, item) => sum + item.actualCost, 0);
    const totalUnpaid = totalActual - totalPaid;

    // Access Control Check
    const hasAccess = user && post && (
        user.role === 'admin' ||
        ((user.role === 'club-secretary' || user.role === 'president' || user.role === 'treasurer') && user.clubId === post.clubId)
    );

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
                <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
                <p>The event you are looking for does not exist or has been deleted.</p>
                {onBack && (
                    <button onClick={onBack} className="mt-6 text-blue-600 hover:underline">
                        Go Back
                    </button>
                )}
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
                <p>You do not have permission to manage this event.</p>
                {onBack && (
                    <button onClick={onBack} className="mt-6 text-blue-600 hover:underline">
                        Go Back
                    </button>
                )}
            </div>
        );
    }

    const categoryColors: Record<BudgetItem['category'], string> = {
        venue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        catering: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        equipment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
        prizes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        transport: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        misc: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Event Management</h1>
                            <p className="text-slate-600 dark:text-slate-400">{post.title}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold transition-all shadow-lg"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isSaving ? 'Saving...' : 'Save All'}
                    </button>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {message.text}
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${activeTab === 'details'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            <AlignLeft className="w-5 h-5" />
                            Details
                        </button>
                        <button
                            onClick={() => setActiveTab('roles')}
                            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${activeTab === 'roles'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            <Users className="w-5 h-5" />
                            Roles & Tasks
                            {tasks.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                                    {tasks.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('budget')}
                            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${activeTab === 'budget'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            <DollarSign className="w-5 h-5" />
                            Budget
                            {budgetItems.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded-full">
                                    ₹{totalActual.toLocaleString()}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('participants')}
                            className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${activeTab === 'participants'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            <Users className="w-5 h-5" />
                            Participants
                            {(post?.rsvps || 0) > 0 && (
                                <span className="ml-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full">
                                    {post?.rsvps || 0}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Details Tab */}
                        {activeTab === 'details' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Basic Info */}
                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <AlignLeft className="w-5 h-5 text-blue-500" />
                                            Basic Information
                                        </h2>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Event Title</label>
                                                <input
                                                    type="text"
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                                                <textarea
                                                    rows={5}
                                                    value={formData.content}
                                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date & Time */}
                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-green-500" />
                                            Date & Time
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
                                                <input
                                                    type="date"
                                                    value={formData.date}
                                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Time</label>
                                                <input
                                                    type="text"
                                                    value={formData.time}
                                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                                    placeholder="e.g., 2:00 PM - 5:00 PM"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <MapPin className="w-5 h-5 text-red-500" />
                                            Location
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Venue Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.location}
                                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Maps URL</label>
                                                <input
                                                    type="url"
                                                    value={formData.locationUrl}
                                                    onChange={(e) => setFormData({ ...formData, locationUrl: e.target.value })}
                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <LinkIcon className="w-5 h-5 text-purple-500" />
                                            Links
                                        </h2>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Registration</label>
                                                <input
                                                    type="url"
                                                    value={formData.registrationlink}
                                                    onChange={(e) => setFormData({ ...formData, registrationlink: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Responses Spreadsheet</label>
                                                <input
                                                    type="url"
                                                    value={formData.responseSpreadsheetUrl}
                                                    onChange={(e) => setFormData({ ...formData, responseSpreadsheetUrl: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">WhatsApp</label>
                                                <input
                                                    type="url"
                                                    value={formData.eventWhatsappLink}
                                                    onChange={(e) => setFormData({ ...formData, eventWhatsappLink: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                                                    placeholder="https://chat.whatsapp.com/..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Status</h2>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600 dark:text-slate-400">RSVPs</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{post.rsvps || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-600 dark:text-slate-400">Status</span>
                                                <span className="capitalize px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                    {post.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Roles Tab */}
                        {activeTab === 'roles' && (
                            <div className="space-y-6">
                                {/* Add Task */}
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <UserPlus className="w-5 h-5 text-blue-500" />
                                        Create New Task
                                    </h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Task Description</label>
                                            <input
                                                type="text"
                                                value={newTaskTitle}
                                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                                placeholder="e.g., Arrange chairs and tables"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Assign To (select multiple)</label>
                                            <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg max-h-32 overflow-y-auto">
                                                {clubMembers.length === 0 ? (
                                                    <p className="text-sm text-slate-400">No members found</p>
                                                ) : (
                                                    clubMembers.map(member => (
                                                        <button
                                                            key={member.id || member.email}
                                                            type="button"
                                                            onClick={() => toggleAssignee(member.name)}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${newTaskAssignees.includes(member.name)
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                                }`}
                                                        >
                                                            {member.name}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                            {newTaskAssignees.length > 0 && (
                                                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                                                    {newTaskAssignees.length} member(s) selected
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                <Clock className="w-4 h-4 inline mr-1" />
                                                Deadline (optional)
                                            </label>
                                            <input
                                                type="date"
                                                value={newTaskDeadline}
                                                onChange={(e) => setNewTaskDeadline(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={addTask}
                                        disabled={!newTaskTitle.trim()}
                                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Task
                                    </button>
                                </div>

                                {/* Task List */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                        <h3 className="font-bold text-slate-900 dark:text-white">Tasks ({tasks.length})</h3>
                                    </div>
                                    {tasks.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>No tasks created yet. Add tasks above to assign responsibilities.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {tasks.map(task => (
                                                <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <button
                                                        onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                                                        className="flex-shrink-0"
                                                    >
                                                        {task.status === 'completed' ? (
                                                            <CheckCircle className="w-6 h-6 text-green-500" />
                                                        ) : (
                                                            <Circle className="w-6 h-6 text-slate-400 hover:text-blue-500 transition-colors" />
                                                        )}
                                                    </button>
                                                    <div className="flex-1">
                                                        <p className={`font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                            {task.title}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {(Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo]).map((name, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                                                    {name}
                                                                </span>
                                                            ))}
                                                            {task.deadline && (
                                                                <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${new Date(task.deadline) < new Date() && task.status !== 'completed'
                                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                                                    }`}>
                                                                    <Clock className="w-3 h-3" />
                                                                    {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <select
                                                        value={task.status}
                                                        onChange={(e) => updateTaskStatus(task.id, e.target.value as EventTask['status'])}
                                                        className={`px-3 py-1 rounded-full text-xs font-bold border-0 focus:ring-2 focus:ring-blue-500 ${task.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                            task.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                                'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                            }`}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="in-progress">In Progress</option>
                                                        <option value="completed">Completed</option>
                                                    </select>
                                                    <button
                                                        onClick={() => deleteTask(task.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Budget Tab */}
                        {activeTab === 'budget' && (
                            <div className="space-y-6">
                                {/* Budget Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Estimated</p>
                                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">₹{totalEstimated.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Actual</p>
                                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">₹{totalActual.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                                        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Paid</p>
                                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">₹{totalPaid.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">Unpaid</p>
                                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">₹{totalUnpaid.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Add Budget Item */}
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Plus className="w-5 h-5 text-green-500" />
                                        Add Expense
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                                            <input
                                                type="text"
                                                value={newBudgetItem.description}
                                                onChange={(e) => setNewBudgetItem({ ...newBudgetItem, description: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                                placeholder="e.g., Sound system rental"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                                            <select
                                                value={newBudgetItem.category}
                                                onChange={(e) => setNewBudgetItem({ ...newBudgetItem, category: e.target.value as BudgetItem['category'] })}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                            >
                                                <option value="venue">Venue</option>
                                                <option value="catering">Catering</option>
                                                <option value="equipment">Equipment</option>
                                                <option value="marketing">Marketing</option>
                                                <option value="prizes">Prizes</option>
                                                <option value="transport">Transport</option>
                                                <option value="misc">Miscellaneous</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Estimated (₹)</label>
                                            <input
                                                type="number"
                                                value={newBudgetItem.estimatedCost || ''}
                                                onChange={(e) => setNewBudgetItem({ ...newBudgetItem, estimatedCost: Number(e.target.value) })}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={addBudgetItem}
                                        disabled={!newBudgetItem.description.trim()}
                                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Expense
                                    </button>
                                </div>

                                {/* Budget Items List */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                        <h3 className="font-bold text-slate-900 dark:text-white">Expenses ({budgetItems.length})</h3>
                                    </div>
                                    {budgetItems.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>No expenses added yet. Track your event budget by adding items above.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-slate-50 dark:bg-slate-700/50">
                                                    <tr>
                                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Description</th>
                                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Category</th>
                                                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Estimated</th>
                                                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Actual</th>
                                                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Paid</th>
                                                        <th className="px-4 py-3"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                    {budgetItems.map(item => (
                                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{item.description}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${categoryColors[item.category]}`}>
                                                                    {item.category}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">₹{item.estimatedCost.toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-right">
                                                                <input
                                                                    type="number"
                                                                    value={item.actualCost || ''}
                                                                    onChange={(e) => updateBudgetItem(item.id, { actualCost: Number(e.target.value) })}
                                                                    className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-right text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    onClick={() => updateBudgetItem(item.id, { paid: !item.paid })}
                                                                    className={`p-1 rounded-full ${item.paid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}
                                                                >
                                                                    {item.paid ? (
                                                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                                    ) : (
                                                                        <Circle className="w-5 h-5 text-slate-400" />
                                                                    )}
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <button
                                                                    onClick={() => deleteBudgetItem(item.id)}
                                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Participants Tab */}
                    {activeTab === 'participants' && (
                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Registered</p>
                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{eventRsvps.length}</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Present</p>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                        {eventRsvps.filter(r => r.attendance === 'present').length}
                                    </p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Absent</p>
                                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                                        {eventRsvps.filter(r => r.attendance === 'absent').length}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Pending</p>
                                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                        {eventRsvps.filter(r => !r.attendance || r.attendance === 'pending').length}
                                    </p>
                                </div>
                            </div>

                            {/* Add Participant Form */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-purple-500" />
                                    Add Participant (from Google Form)
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    Manually add participants from your Google Form responses.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                                        <input
                                            type="text"
                                            id="newParticipantName"
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                            placeholder="Participant name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                                        <input
                                            type="email"
                                            id="newParticipantEmail"
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={async () => {
                                                const nameInput = document.getElementById('newParticipantName') as HTMLInputElement;
                                                const emailInput = document.getElementById('newParticipantEmail') as HTMLInputElement;
                                                const name = nameInput?.value.trim();
                                                const email = emailInput?.value.trim();

                                                if (!name || !email) {
                                                    setMessage({ type: 'error', text: 'Please enter both name and email' });
                                                    return;
                                                }

                                                const result = await addEventParticipant(eventId, name, email);
                                                if (result.success) {
                                                    setMessage({ type: 'success', text: 'Participant added successfully!' });
                                                    nameInput.value = '';
                                                    emailInput.value = '';
                                                    // Refresh participants list
                                                    const updatedRsvps = await getEventRSVPs(eventId);
                                                    setEventRsvps(updatedRsvps);
                                                } else {
                                                    setMessage({ type: 'error', text: result.error || 'Failed to add participant' });
                                                }
                                            }}
                                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Participant
                                        </button>
                                    </div>
                                </div>

                                {/* Import from Sheet */}
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Import from Google Sheet</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Publish your response sheet as CSV (File → Share → Publish to web → CSV)
                                            </p>
                                        </div>
                                        <button
                                            disabled={isImporting || !(post as any)?.responseSpreadsheetUrl}
                                            onClick={async () => {
                                                const sheetUrl = (post as any)?.responseSpreadsheetUrl;
                                                if (!sheetUrl) {
                                                    setMessage({ type: 'error', text: 'Please add a Response Spreadsheet URL in the Details tab first' });
                                                    return;
                                                }

                                                setIsImporting(true);
                                                setMessage(null);

                                                try {
                                                    // Convert Google Sheets URL to CSV export URL
                                                    let csvUrl = sheetUrl;

                                                    // Extract spreadsheet ID and build proper export URL
                                                    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
                                                    if (sheetIdMatch) {
                                                        const sheetId = sheetIdMatch[1];
                                                        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
                                                    } else if (sheetUrl.includes('/edit')) {
                                                        csvUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=csv');
                                                    }

                                                    console.log('Fetching CSV from:', csvUrl);

                                                    // Use CORS proxy to bypass browser restrictions
                                                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;

                                                    const response = await fetch(proxyUrl);
                                                    if (!response.ok) throw new Error('Failed to fetch sheet. Make sure the sheet is shared as "Anyone with the link can view".');

                                                    const csvText = await response.text();
                                                    console.log('CSV data received, first 200 chars:', csvText.substring(0, 200));
                                                    const lines = csvText.split('\n').filter(line => line.trim());

                                                    if (lines.length < 2) {
                                                        setMessage({ type: 'error', text: 'No data found in the sheet' });
                                                        setIsImporting(false);
                                                        return;
                                                    }

                                                    // Parse header to find name and email columns
                                                    const headers = lines[0].split(',').map(h => h.toLowerCase().replace(/"/g, '').trim());
                                                    const nameIdx = headers.findIndex(h => h.includes('name'));
                                                    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));

                                                    if (nameIdx === -1 || emailIdx === -1) {
                                                        setMessage({ type: 'error', text: 'Could not find Name and Email columns in the sheet' });
                                                        setIsImporting(false);
                                                        return;
                                                    }

                                                    // Parse CSV rows and import new participants
                                                    let imported = 0;
                                                    let skipped = 0;
                                                    const existingEmails = eventRsvps.map(r => r.email.toLowerCase());

                                                    for (let i = 1; i < lines.length; i++) {
                                                        // Simple CSV parsing (handles basic cases)
                                                        const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
                                                        const name = cols[nameIdx];
                                                        const email = cols[emailIdx];

                                                        if (name && email && email.includes('@')) {
                                                            if (existingEmails.includes(email.toLowerCase())) {
                                                                skipped++;
                                                            } else {
                                                                const result = await addEventParticipant(eventId, name, email);
                                                                if (result.success) {
                                                                    imported++;
                                                                    existingEmails.push(email.toLowerCase());
                                                                }
                                                            }
                                                        }
                                                    }

                                                    // Refresh participants list
                                                    const updatedRsvps = await getEventRSVPs(eventId);
                                                    setEventRsvps(updatedRsvps);

                                                    setMessage({
                                                        type: 'success',
                                                        text: `Imported ${imported} new participant${imported !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} already existed` : ''}`
                                                    });
                                                } catch (error: any) {
                                                    console.error('Import error:', error);
                                                    setMessage({
                                                        type: 'error',
                                                        text: error.message || 'Failed to import from sheet. Make sure it is published to web as CSV.'
                                                    });
                                                } finally {
                                                    setIsImporting(false);
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${isImporting || !(post as any)?.responseSpreadsheetUrl
                                                ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                                }`}
                                        >
                                            {isImporting ? (
                                                <>
                                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Importing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    Import from Sheet
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Participant List */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 dark:text-white">Participants ({eventRsvps.length})</h3>
                                    <div className="flex items-center gap-3">
                                        <a
                                            href={(post as any)?.responseSpreadsheetUrl || "https://docs.google.com/forms/d/1jVFhtGWaIcnVl0JjJw1P3sc09-nEuCCfBn9RCB9RKB8/edit#responses"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 font-medium"
                                        >
                                            View Responses
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                        {post?.registrationLink && (
                                            <a
                                                href={post.registrationLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                            >
                                                Open Form
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                </div>
                                {eventRsvps.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No participants yet. Add participants from your Google Form responses above.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                                <tr>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Name</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Email</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Registered On</th>
                                                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Attendance</th>
                                                    <th className="px-4 py-3"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {eventRsvps.map(participant => (
                                                    <tr key={participant.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{participant.name}</td>
                                                        <td className="px-4 py-3">
                                                            <a href={`mailto:${participant.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                                                {participant.email}
                                                            </a>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                            {participant.rsvpedAt.toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            })}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!participant.id) return;
                                                                        const success = await updateParticipantAttendance(eventId, participant.id, 'present');
                                                                        if (success) {
                                                                            setEventRsvps(prev => prev.map(p =>
                                                                                p.id === participant.id ? { ...p, attendance: 'present' } : p
                                                                            ));
                                                                        }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${participant.attendance === 'present'
                                                                        ? 'bg-green-600 text-white'
                                                                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                                                                        }`}
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                                                                    Present
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!participant.id) return;
                                                                        const success = await updateParticipantAttendance(eventId, participant.id, 'absent');
                                                                        if (success) {
                                                                            setEventRsvps(prev => prev.map(p =>
                                                                                p.id === participant.id ? { ...p, attendance: 'absent' } : p
                                                                            ));
                                                                        }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${participant.attendance === 'absent'
                                                                        ? 'bg-red-600 text-white'
                                                                        : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
                                                                        }`}
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5 inline mr-1" />
                                                                    Absent
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={async () => {
                                                                    if (!participant.id) return;
                                                                    if (confirm('Are you sure you want to remove this participant?')) {
                                                                        const success = await deleteEventParticipant(eventId, participant.id);
                                                                        if (success) {
                                                                            setEventRsvps(prev => prev.filter(p => p.id !== participant.id));
                                                                            setMessage({ type: 'success', text: 'Participant removed' });
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

