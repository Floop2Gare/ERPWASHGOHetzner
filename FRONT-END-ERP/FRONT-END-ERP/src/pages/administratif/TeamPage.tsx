import { useMemo, useState, FormEvent } from 'react';
import { UsersRound, Mail, Phone, Briefcase, Calendar, TrendingUp, X, Plus } from 'lucide-react';
import clsx from 'clsx';

import { useAppData, type ProjectMember } from '../../store/useAppData';
import { getWorkspaceModule } from '../../workspace/modules';

const TeamPage = () => {
  const module = getWorkspaceModule('administratif');
  const { projectMembers, projects, addProjectMember } = useAppData();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: '',
    email: '',
    phone: '',
    capacity: 35,
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const teamStats = useMemo(() => {
    const total = projectMembers.length;
    const totalCapacity = projectMembers.reduce((acc, member) => acc + member.capacity, 0);
    const avgCapacity = total > 0 ? Math.round(totalCapacity / total) : 0;

    const membersWithProjects = projectMembers.filter((member) => {
      return projects.some((project) => project.memberIds.includes(member.id));
    });

    return [
      {
        label: 'Membres de l\'équipe',
        value: total.toString(),
        helper: `${membersWithProjects.length} affecté(s) à un projet`,
        icon: UsersRound,
      },
      {
        label: 'Capacité moyenne',
        value: `${avgCapacity}h`,
        helper: 'Par semaine',
        icon: Calendar,
      },
      {
        label: 'Projets actifs',
        value: projects.filter((p) => p.status === 'En cours').length.toString(),
        helper: 'Avec membres assignés',
        icon: TrendingUp,
      },
    ];
  }, [projectMembers, projects]);

  const membersWithProjects = useMemo(() => {
    return projectMembers.map((member) => {
      const assignedProjects = projects.filter((project) =>
        project.memberIds.includes(member.id)
      );
      const activeProjects = assignedProjects.filter((p) => p.status === 'En cours');
      const totalTasks = assignedProjects.reduce(
        (acc, p) => acc + p.tasks.filter((t) => t.assigneeId === member.id).length,
        0
      );
      const completedTasks = assignedProjects.reduce(
        (acc, p) =>
          acc +
          p.tasks.filter((t) => t.assigneeId === member.id && t.status === 'Terminé').length,
        0
      );

      return {
        ...member,
        assignedProjects,
        activeProjects,
        totalTasks,
        completedTasks,
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      };
    });
  }, [projectMembers, projects]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleCreateMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.role.trim() || !formData.email.trim()) {
      setFeedback('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    const newMember = addProjectMember({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      role: formData.role.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      capacity: formData.capacity,
    });
    setFeedback(`Collaborateur "${newMember.firstName} ${newMember.lastName}" créé avec succès.`);
    setIsCreateModalOpen(false);
    setFormData({
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      phone: '',
      capacity: 35,
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setFormData({
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      phone: '',
      capacity: 35,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 md:p-8 transition-colors">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="dashboard-hero">
          <div className="dashboard-hero__content lg:flex lg:items-start lg:justify-between lg:gap-6">
            <div className="dashboard-hero__intro">
              <p className="dashboard-hero__eyebrow">{module?.name ?? 'Gestion de projet et équipe'}</p>
              <h1 className="dashboard-hero__title">Équipe</h1>
              <p className="dashboard-hero__subtitle">
                Gérez les membres de votre équipe, leurs affectations et leur charge de travail.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                Nouveau collaborateur
              </button>
            </div>
          </div>
          <div className="dashboard-hero__glow" aria-hidden />
        </header>

        {feedback && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-sm dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200">
            {feedback}
          </div>
        )}

        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teamStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="dashboard-kpi group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="dashboard-kpi__eyebrow">{stat.label}</p>
                      <p className="dashboard-kpi__value">{stat.value}</p>
                      <p className="dashboard-kpi__description">{stat.helper}</p>
                    </div>
                    <div className="dashboard-kpi__icon">
                      <Icon />
                    </div>
                  </div>
                  <div className="dashboard-kpi__glow" aria-hidden />
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Membres de l'équipe</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Vue d'ensemble des membres et de leurs affectations
              </p>
            </div>
          </div>

          {membersWithProjects.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <UsersRound className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                Aucun membre trouvé
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ajoutez des membres à votre équipe pour commencer.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {membersWithProjects.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {getInitials(member.firstName, member.lastName)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          {member.firstName} {member.lastName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Phone className="h-4 w-4" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="h-4 w-4" />
                        <span>{member.capacity}h/semaine</span>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Projets actifs</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {member.activeProjects.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Tâches assignées</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {member.completedTasks}/{member.totalTasks}
                        </span>
                      </div>
                      {member.totalTasks > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">Progression</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {member.progress}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className="h-full bg-blue-600 transition-all dark:bg-blue-500"
                              style={{ width: `${member.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {member.assignedProjects.length > 0 && (
                      <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Projets assignés
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {member.assignedProjects.slice(0, 3).map((project) => (
                            <span
                              key={project.id}
                              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {project.name.length > 20 ? `${project.name.substring(0, 20)}...` : project.name}
                            </span>
                          ))}
                          {member.assignedProjects.length > 3 && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              +{member.assignedProjects.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Nouveau collaborateur</h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateMember} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="member-firstname" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Prénom *
                      </label>
                      <input
                        id="member-firstname"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        placeholder="Ex: Marion"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="member-lastname" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Nom *
                      </label>
                      <input
                        id="member-lastname"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        placeholder="Ex: Lefèvre"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="member-role" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Rôle *
                    </label>
                    <input
                      id="member-role"
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Ex: Directrice de projet"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="member-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Email *
                    </label>
                    <input
                      id="member-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Ex: marion.lefevre@atelier-proprete.fr"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="member-phone" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Téléphone
                      </label>
                      <input
                        id="member-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        placeholder="Ex: +33 6 52 11 32 74"
                      />
                    </div>
                    <div>
                      <label htmlFor="member-capacity" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Capacité (h/semaine) *
                      </label>
                      <input
                        id="member-capacity"
                        type="number"
                        min="0"
                        max="50"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Créer le collaborateur
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPage;

