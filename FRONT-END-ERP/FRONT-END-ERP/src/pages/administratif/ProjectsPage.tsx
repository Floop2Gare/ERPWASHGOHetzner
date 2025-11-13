import { useMemo, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FolderKanban, Calendar, User, TrendingUp, Clock, X, Plus } from 'lucide-react';
import clsx from 'clsx';

import { useAppData, type Project } from '../../store/useAppData';
import { formatCurrency } from '../../lib/format';
import { getWorkspaceModule } from '../../workspace/modules';

const formatDate = (iso: string | null | undefined) => {
  if (!iso) {
    return '—';
  }
  try {
    return format(parseISO(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return '—';
  }
};

const ProjectsPage = () => {
  const module = getWorkspaceModule('administratif');
  const { projects, clients, getClient, getProjectMember, addProject } = useAppData();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    manager: '',
    start: '',
    end: '',
    status: 'Planifié' as Project['status'],
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const projectStats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === 'En cours').length;
    const completed = projects.filter((p) => p.status === 'Clôturé').length;
    const planned = projects.filter((p) => p.status === 'Planifié').length;

    const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0);
    const completedTasks = projects.reduce(
      (acc, p) => acc + p.tasks.filter((t) => t.status === 'Terminé').length,
      0
    );
    const avgProgress =
      totalTasks > 0
        ? Math.round(
            projects.reduce(
              (acc, p) =>
                acc +
                p.tasks.reduce((taskAcc, task) => taskAcc + task.progress, 0) / p.tasks.length,
              0
            ) / total
          )
        : 0;

    return [
      {
        label: 'Projets actifs',
        value: inProgress.toString(),
        helper: `${total} projet(s) au total`,
        icon: FolderKanban,
      },
      {
        label: 'Tâches en cours',
        value: totalTasks.toString(),
        helper: `${completedTasks} terminée(s)`,
        icon: Clock,
      },
      {
        label: 'Progression moyenne',
        value: `${avgProgress}%`,
        helper: 'Tous projets confondus',
        icon: TrendingUp,
      },
    ];
  }, [projects]);

  const projectsWithDetails = useMemo(() => {
    return projects.map((project) => {
      const client = getClient(project.clientId);
      const members = project.memberIds
        .map((id) => getProjectMember(id))
        .filter((m): m is NonNullable<typeof m> => m !== undefined);
      const progress =
        project.tasks.length > 0
          ? Math.round(
              project.tasks.reduce((acc, task) => acc + task.progress, 0) / project.tasks.length
            )
          : 0;

      return {
        ...project,
        clientName: client?.name ?? 'Client inconnu',
        members,
        progress,
        taskCount: project.tasks.length,
        completedTasks: project.tasks.filter((t) => t.status === 'Terminé').length,
      };
    });
  }, [projects, getClient, getProjectMember]);

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'En cours':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200';
      case 'Clôturé':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200';
      case 'Planifié':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const handleCreateProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.clientId || !formData.manager.trim() || !formData.start || !formData.end) {
      setFeedback('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    const newProject = addProject({
      name: formData.name.trim(),
      clientId: formData.clientId,
      manager: formData.manager.trim(),
      start: formData.start,
      end: formData.end,
      status: formData.status,
      memberIds: [],
      tasks: [],
    });
    setFeedback(`Projet "${newProject.name}" créé avec succès.`);
    setIsCreateModalOpen(false);
    setFormData({
      name: '',
      clientId: '',
      manager: '',
      start: '',
      end: '',
      status: 'Planifié',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setFormData({
      name: '',
      clientId: '',
      manager: '',
      start: '',
      end: '',
      status: 'Planifié',
    });
  };

  return (
    <div className="dashboard-page space-y-10">
        <header className="dashboard-hero">
          <div className="dashboard-hero__content lg:flex lg:items-start lg:justify-between lg:gap-6">
            <div className="dashboard-hero__intro">
              <p className="dashboard-hero__eyebrow">{module?.name ?? 'Gestion de projet et équipe'}</p>
              <h1 className="dashboard-hero__title">Gestion de projet</h1>
              <p className="dashboard-hero__subtitle">
                Suivez vos projets, planifiez les tâches et pilotez l'avancement de vos équipes.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                Nouveau projet
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
            {projectStats.map((stat, index) => {
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Projets</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Liste de tous vos projets en cours et planifiés
              </p>
            </div>
          </div>

          {projectsWithDetails.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <FolderKanban className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                Aucun projet trouvé
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Créez votre premier projet pour commencer.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectsWithDetails.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {project.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {project.clientName}
                          </p>
                        </div>
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                            getStatusColor(project.status)
                          )}
                        >
                          {project.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4" />
                          <span>{project.manager}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(project.start)} - {formatDate(project.end)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>
                            {project.completedTasks}/{project.taskCount} tâches terminées
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400">Progression</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full bg-blue-600 transition-all dark:bg-blue-500"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      {project.members.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-500">Équipe :</span>
                          {project.members.map((member) => (
                            <span
                              key={member.id}
                              className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {member.firstName} {member.lastName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {isCreateModalOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Nouveau projet</h2>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateProject} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="project-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Nom du projet *
                      </label>
                      <input
                        id="project-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        placeholder="Ex: Programme concession Bordeaux"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="project-client" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Client *
                      </label>
                      <select
                        id="project-client"
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="">Sélectionner un client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="project-manager" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Chef de projet *
                      </label>
                      <input
                        id="project-manager"
                        type="text"
                        value={formData.manager}
                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        placeholder="Ex: Marion Lefèvre"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="project-start" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Date de début *
                        </label>
                        <input
                          id="project-start"
                          type="date"
                          value={formData.start}
                          onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="project-end" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Date de fin *
                        </label>
                        <input
                          id="project-end"
                          type="date"
                          value={formData.end}
                          onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="project-status" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Statut *
                      </label>
                      <select
                        id="project-status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="Planifié">Planifié</option>
                        <option value="En cours">En cours</option>
                        <option value="Clôturé">Clôturé</option>
                      </select>
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
                      Créer le projet
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}
    </div>
  );
};

export default ProjectsPage;

