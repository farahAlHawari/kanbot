import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, getFieldErrors } from '../../../shared/api/errors';
import { EmptyState, ErrorState } from '../../../shared/components/ui';
import type { CreateProjectRequest, ProjectWithStats, UpdateProjectRequest } from '../../../shared/types/api';
import { createProject, deleteProject, updateProject } from '../api/projects-api';
import { PROJECTS_QUERY_KEY, useProjects } from '../hooks/use-projects';
import { useFeedback } from '../../../app/providers/use-feedback';

const KEY_PATTERN = /^[A-Z]{2,6}$/;

interface ProjectFormDialogProps {
  mode: 'create' | 'edit';
  project?: ProjectWithStats;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateProjectRequest) => Promise<unknown>;
}

function ProjectFormDialog({ mode, project, pending, onClose, onSubmit }: ProjectFormDialogProps) {
  const [name, setName] = useState(project?.name ?? '');
  const [key, setKey] = useState(project?.key ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Name is required.';
    else if (name.trim().length > 80) nextErrors.name = 'Name must be 80 characters or fewer.';
    const normalizedKey = key.trim().toUpperCase();
    if (normalizedKey && !KEY_PATTERN.test(normalizedKey)) {
      nextErrors.key = 'Key must be 2–6 letters.';
    } else if (mode === 'edit' && !normalizedKey) {
      nextErrors.key = 'Key is required.';
    }
    if (description.length > 500) nextErrors.description = 'Description must be 500 characters or fewer.';

    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length) return;

    const input = {
      name: name.trim(),
      ...(mode === 'edit' || normalizedKey ? { key: normalizedKey } : {}),
      description: description.trim(),
    };
    try {
      await onSubmit(input);
      if (mode === 'edit') onClose();
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (error instanceof ApiError && error.status === 409) {
        setErrors((previous) => ({
          ...previous,
          key: fieldErrors.key ?? 'This key is already used.',
        }));
      } else if (Object.keys(fieldErrors).length) {
        setErrors((previous) => ({ ...previous, ...fieldErrors }));
      } else {
        setServerError(error instanceof Error ? error.message : 'Unable to save the project. Please try again.');
      }
    }
  }

  return (
    <Dialog open     onClose={() => {
      if (!pending) onClose();
    }} fullWidth maxWidth="sm" aria-labelledby="project-form-title">
      <DialogTitle id="project-form-title">{mode === 'create' ? 'Create project' : 'Edit project'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate aria-busy={pending}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {serverError ? <Alert severity="error" role="alert">{serverError}</Alert> : null}
            <TextField
              label="Name"
              required
              autoFocus
              fullWidth
              value={name}
              slotProps={{ htmlInput: { maxLength: 80 } }}
              onChange={(event) => setName(event.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name || ' '}
            />
            <TextField
              label="Key"
              required={mode === 'edit'}
              fullWidth
              value={key}
              slotProps={{ htmlInput: { maxLength: 6, style: { textTransform: 'uppercase' } } }}
              onChange={(event) => setKey(event.target.value.toUpperCase())}
              error={Boolean(errors.key)}
              helperText={errors.key || (mode === 'create' ? 'Optional. Leave empty to generate a key.' : '2–6 uppercase letters.')}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={description}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              onChange={(event) => setDescription(event.target.value)}
              error={Boolean(errors.description)}
              helperText={errors.description || `${description.length}/500 characters`}
            />
            {mode === 'edit' ? (
              <Typography variant="caption" color="text.secondary">
                Changing the project key does not change existing Todo keys.
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
            {mode === 'create' ? 'Create project' : 'Save changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export function ProjectsPage() {
  const { data, isLoading, isError, error, refetch } = useProjects();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useFeedback();
  const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectWithStats | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const projects = data?.projects ?? [];
  const createOpen = searchParams.get('create') === '1';

  const refreshProjects = () => queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async ({ project }) => {
      await refreshProjects();
      notify(`Project "${project.name}" created.`);
      navigate(`/projects/${project.id}/backlog`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectRequest }) => updateProject(id, input),
    onSuccess: async ({ project }) => {
      await refreshProjects();
      notify(`Project "${project.name}" updated.`);
      setEditingProject(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      const deletedProject = deletingProject;
      await refreshProjects();
      setDeletingProject(null);
      setDeleteError(null);
      notify(`Project "${deletedProject?.name ?? 'Project'}" deleted.`);
      navigate('/projects', { replace: true });
    },
    onError: (deleteFailure) => {
      setDeleteError(deleteFailure instanceof Error ? deleteFailure.message : 'Unable to delete the project.');
    },
  });

  function closeCreateDialog() {
    if (createMutation.isPending) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('create');
    setSearchParams(nextParams, { replace: true });
  }

  function openCreateDialog() {
    createMutation.reset();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('create', '1');
    setSearchParams(nextParams);
  }

  function openEditDialog(project: ProjectWithStats) {
    updateMutation.reset();
    setEditingProject(project);
  }

  function openDeleteDialog(project: ProjectWithStats) {
    deleteMutation.reset();
    setDeleteError(null);
    setDeletingProject(project);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" variant="h2">Your projects</Typography>
          <Typography color="text.secondary">Manage your backlogs and sprint workspaces.</Typography>
        </Box>
        <Button variant="contained" onClick={openCreateDialog}>Create project</Button>
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2].map((item) => (
            <Grid key={item} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Skeleton width="60%" height={30} />
                <Skeleton width="35%" sx={{ mt: 1 }} />
                <Skeleton width="90%" sx={{ mt: 2 }} />
                <Skeleton width="80%" />
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : 'Unable to load projects.'}
          onRetry={() => void refetch()}
        />
      ) : projects.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <EmptyState
              title="Create your first project"
              description="Projects keep your backlog and sprints organized."
              action={<Button variant="contained" onClick={openCreateDialog}>Create your first project</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {projects.map((project) => (
            <Grid key={project.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                    <Typography component="h2" variant="h3" sx={{ overflowWrap: 'anywhere' }}>{project.name}</Typography>
                    <Typography
                      component="span"
                      sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.hover', fontWeight: 700, fontSize: '0.8rem' }}
                    >
                      {project.key}
                    </Typography>
                  </Box>
                  <Typography color="text.secondary" sx={{ minHeight: 48, mt: 1, overflowWrap: 'anywhere' }}>
                    {project.description || 'No description'}
                  </Typography>
                  <Stack spacing={0.75} sx={{ mt: 2 }}>
                    <Typography variant="body2">Backlog: {project.stats.backlogCount}</Typography>
                    <Typography variant="body2">Todos: {project.stats.totalTodos}</Typography>
                    <Typography variant="body2">
                      Active sprint: {project.stats.activeSprint?.name ?? 'None'}
                    </Typography>
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
                  <Button variant="contained" onClick={() => navigate(`/projects/${project.id}/backlog`)}>
                    Open project
                  </Button>
                  <Box>
                    <Button onClick={() => openEditDialog(project)}>Edit</Button>
                    <Button color="error" onClick={() => openDeleteDialog(project)}>Delete</Button>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {createOpen ? (
        <ProjectFormDialog
          key="create-project"
          mode="create"
          pending={createMutation.isPending}
          onClose={closeCreateDialog}
          onSubmit={(input) => createMutation.mutateAsync(input)}
        />
      ) : null}
      {editingProject ? (
        <ProjectFormDialog
          key={editingProject.id}
          mode="edit"
          project={editingProject}
          pending={updateMutation.isPending}
          onClose={() => {
            if (!updateMutation.isPending) setEditingProject(null);
          }}
          onSubmit={(input) => updateMutation.mutateAsync({ id: editingProject.id, input })}
        />
      ) : null}

      <Dialog
        open={Boolean(deletingProject)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeletingProject(null);
        }}
        aria-labelledby="delete-project-title"
      >
        <DialogTitle id="delete-project-title">Delete project?</DialogTitle>
        <DialogContent>
          {deleteError ? <Alert severity="error" sx={{ mb: 2 }} role="alert">{deleteError}</Alert> : null}
          <Typography>
            Delete <strong>{deletingProject?.name}</strong>? All of its sprints and todos will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeletingProject(null)} disabled={deleteMutation.isPending}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending || !deletingProject}
            onClick={() => {
              if (deletingProject) deleteMutation.mutate(deletingProject.id);
            }}
          >
            {deleteMutation.isPending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
            Delete project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
