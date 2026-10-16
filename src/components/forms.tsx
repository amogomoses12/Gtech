import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Trash2 } from "lucide-react";
import type { Member, Project, ProjectStatus } from "../data";
import { Avatar, ProjectIcon, StatusBadge } from "./ui";

export type ProjectValues = Pick<
  Project,
  | "name"
  | "category"
  | "budget"
  | "dueDate"
  | "status"
  | "progress"
  | "description"
  | "members"
>;

function FormActions({
  onCancel,
  label,
}: {
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="form-actions">
      <button
        className="button button-secondary"
        type="button"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button className="button button-primary" type="submit">
        {label}
      </button>
    </div>
  );
}

function DeleteButton({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="danger-zone">
      <button
        className="danger-button"
        type="button"
        onClick={() => (confirm ? onDelete() : setConfirm(true))}
      >
        <Trash2 size={14} />
        {confirm ? `Confirm ${label.toLowerCase()}` : label}
      </button>
      {confirm && (
        <button
          type="button"
          className="text-button"
          onClick={() => setConfirm(false)}
        >
          Keep it
        </button>
      )}
    </div>
  );
}

export function ProjectForm({
  project,
  members,
  onSubmit,
  onCancel,
  onDelete,
}: {
  project?: Project;
  members: Member[];
  onSubmit: (values: ProjectValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [values, setValues] = useState<ProjectValues>(
    project ?? {
      name: "",
      category: "Product development",
      budget: 5000,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      status: "Planning",
      progress: 0,
      description: "",
      members: members[0] ? [members[0].id] : [],
    },
  );
  const update = <K extends keyof ProjectValues>(
    key: K,
    value: ProjectValues[K],
  ) => setValues((previous) => ({ ...previous, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (values.name.trim())
      onSubmit({
        ...values,
        name: values.name.trim(),
        progress: values.status === "Completed" ? 100 : values.progress,
      });
  };
  return (
    <form className="app-form" onSubmit={submit}>
      {project && (
        <div className="project-detail-intro">
          <ProjectIcon project={project} />
          <div>
            <strong>{project.code}</strong>
            <span>{project.category}</span>
          </div>
          <StatusBadge status={project.status} />
        </div>
      )}
      <label className="field">
        Project name
        <input
          required
          maxLength={80}
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="e.g. Customer onboarding"
          autoFocus={!project}
        />
      </label>
      <div className="form-grid">
        <label className="field">
          Category
          <select
            aria-label="Category"
            value={values.category}
            onChange={(event) => update("category", event.target.value)}
          >
            {[
              "Product development",
              "Design & development",
              "Mobile development",
              "Infrastructure",
              "Marketing",
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select
            aria-label="Status"
            value={values.status}
            onChange={(event) => {
              const status = event.target.value as ProjectStatus;
              setValues((previous) => ({
                ...previous,
                status,
                progress: status === "Completed" ? 100 : previous.progress,
              }));
            }}
          >
            {["Planning", "In progress", "In review", "Completed"].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          Due date
          <input
            required
            type="date"
            value={values.dueDate}
            onChange={(event) => update("dueDate", event.target.value)}
          />
        </label>
        <label className="field">
          Budget (USD)
          <input
            required
            type="number"
            min="0"
            max="100000000"
            value={values.budget}
            onChange={(event) => update("budget", Number(event.target.value))}
          />
        </label>
      </div>
      <label className="field">
        Description
        <textarea
          rows={3}
          maxLength={600}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder="What are we working towards?"
        />
      </label>
      <div className="field">
        <div className="range-label">
          <label htmlFor="project-progress">Project progress</label>
          <strong>{values.progress}%</strong>
        </div>
        <input
          id="project-progress"
          type="range"
          min="0"
          max="100"
          step="1"
          value={values.progress}
          disabled={values.status === "Completed"}
          onChange={(event) => update("progress", Number(event.target.value))}
        />
      </div>
      <fieldset className="field team-picker">
        <legend>Project team</legend>
        <div>
          {members
            .filter((member) => member.status === "Active")
            .map((member) => (
              <label
                key={member.id}
                className={
                  values.members.includes(member.id)
                    ? "member-option selected"
                    : "member-option"
                }
                title={member.name}
              >
                <input
                  type="checkbox"
                  checked={values.members.includes(member.id)}
                  onChange={() =>
                    update(
                      "members",
                      values.members.includes(member.id)
                        ? values.members.filter((id) => id !== member.id)
                        : [...values.members, member.id],
                    )
                  }
                />
                <Avatar name={member.name} src={member.avatar} size={30} />
                <span>{member.name.split(" ")[0]}</span>
                {values.members.includes(member.id) && <Check size={12} />}
              </label>
            ))}
        </div>
      </fieldset>
      <FormActions
        onCancel={onCancel}
        label={project ? "Save changes" : "Create project"}
      />
      {project && onDelete && (
        <DeleteButton label="Archive project" onDelete={onDelete} />
      )}
    </form>
  );
}
