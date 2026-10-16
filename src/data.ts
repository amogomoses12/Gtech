export type ProjectStatus =
  | "In progress"
  | "In review"
  | "Planning"
  | "Completed";

export interface Project {
  id: number;
  name: string;
  code: string;
  category: string;
  progress: number;
  status: ProjectStatus;
  dueDate: string;
  budget: number;
  color: string;
  icon: number;
  members: number[];
  description: string;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: "Active" | "Invited";
  avatar: string;
}

export const formatDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function downloadCsv(
  name: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const escape = (value: string | number) => {
    const text = String(value);
    const safe = /^[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const content = [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
