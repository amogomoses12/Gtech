import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { Member, Project } from "../data";
import { formatDate } from "../data";
import {
  AvatarStack,
  EmptyState,
  IconButton,
  ProjectIcon,
  StatusBadge,
} from "./ui";

export function ProjectsTable({
  projects,
  members,
  onOpen,
  compact = false,
}: {
  projects: Project[];
  members: Member[];
  onOpen: (project: Project) => void;
  compact?: boolean;
}) {
  if (!projects.length)
    return (
      <EmptyState
        title="No projects found"
        text="Try another search or create a new project to get started."
      />
    );
  return (
    <div className="table-scroll">
      <table
        className={`data-table projects-table ${compact ? "compact-table" : ""}`}
      >
        <thead>
          <tr>
            <th>Project name</th>
            <th>Team</th>
            <th>Progress</th>
            <th>Status</th>
            {!compact && <th>Due date</th>}
            {!compact && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} onClick={() => onOpen(project)}>
              <td>
                <button
                  className="project-name"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(project);
                  }}
                >
                  <ProjectIcon project={project} />
                  <span>
                    <strong>{project.name}</strong>
                    <small>{compact ? project.category : project.code}</small>
                  </span>
                </button>
              </td>
              <td>
                <AvatarStack ids={project.members} members={members} />
              </td>
              <td>
                <div className="progress-cell">
                  <span className="progress-track">
                    <span style={{ width: `${project.progress}%` }} />
                  </span>
                  <span>{project.progress}%</span>
                </div>
              </td>
              <td>
                <StatusBadge status={project.status} />
              </td>
              {!compact && (
                <td className="muted-cell">{formatDate(project.dueDate)}</td>
              )}
              {!compact && (
                <td>
                  <IconButton
                    label={`Edit ${project.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(project);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </IconButton>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  setPage,
  total,
  perPage = 8,
  noun = "results",
}: {
  page: number;
  setPage: (page: number) => void;
  total: number;
  perPage?: number;
  noun?: string;
}) {
  const count = Math.max(1, Math.ceil(total / perPage));
  return (
    <div className="table-footer">
      <span>
        Showing{" "}
        <strong>
          {total ? (page - 1) * perPage + 1 : 0}-
          {Math.min(page * perPage, total)}
        </strong>{" "}
        of <strong>{total}</strong> {noun}
      </span>
      <div className="pagination">
        <IconButton
          label="Previous page"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </IconButton>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            className={page === i + 1 ? "current-page" : ""}
            aria-label={`Page ${i + 1}`}
            aria-current={page === i + 1 ? "page" : undefined}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        <IconButton
          label="Next page"
          disabled={page === count}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={16} />
        </IconButton>
      </div>
    </div>
  );
}
