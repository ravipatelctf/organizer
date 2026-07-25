'use client';

import { createContext, useContext } from 'react';

import type { Project } from '@/lib/types/org';

const ProjectContext = createContext<Project | null>(null);

export function ProjectProvider({
  project,
  children,
}: {
  project: Project;
  children: React.ReactNode;
}) {
  return <ProjectContext.Provider value={project}>{children}</ProjectContext.Provider>;
}

export function useProjectContext(): Project {
  const project = useContext(ProjectContext);
  if (!project) {
    throw new Error('useProjectContext must be used within a ProjectProvider.');
  }
  return project;
}
