import { useEffect, useId, useRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Cloud,
  LayoutDashboard,
  PanelsTopLeft,
  Smartphone,
  X,
} from "lucide-react";
import type { Member, Project } from "../data";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "brand-small" : ""}`}>
      <svg
        width="33"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M17 2 3 10v14l14 8 14-8V14H17v7h7v1l-7 4-8-5V13l8-5 9 5 5-3L17 2Z"
          fill="currentColor"
        />
      </svg>
      {!small && (
        <span>
          Gtech<span className="brand-period">.</span>
        </span>
      )}
    </div>
  );
}

export function IconButton({
  children,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function Avatar({
  name,
  src,
  size = 32,
  className = "",
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, minWidth: size }}
      title={name}
    >
      {src && !failed ? (
        <img src={src} alt={name} onError={() => setFailed(true)} />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}

export function AvatarStack({
  ids,
  members,
}: {
  ids: number[];
  members: Member[];
}) {
  return (
    <div className="avatar-stack">
      {ids.slice(0, 3).map((id) => {
        const member = members.find((person) => person.id === id);
        return member ? (
          <Avatar key={id} name={member.name} src={member.avatar} size={27} />
        ) : null;
      })}
      {ids.length > 3 && (
        <span className="avatar-extra">+{ids.length - 3}</span>
      )}
    </div>
  );
}

export function ProjectIcon({
  project,
}: {
  project: Pick<Project, "icon" | "color">;
}) {
  const Icon = [PanelsTopLeft, Smartphone, Cloud, LayoutDashboard][
    project.icon % 4
  ];
  return (
    <span className={`project-icon ${project.color}`}>
      <Icon size={18} strokeWidth={1.7} />
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = ["Completed", "Active", "In progress"].includes(status)
    ? "success"
    : ["In review", "Pending", "Invited", "New"].includes(status)
      ? "warning"
      : "neutral";
  return (
    <span className={`status-badge ${tone}`}>
      <span />
      {status}
    </span>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  label,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
  className?: string;
}) {
  return (
    <span className={`select-wrap ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown size={13} aria-hidden="true" />
    </span>
  );
}

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  drawer = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      if (ref.current?.contains(document.activeElement)) return;
      const input = ref.current?.querySelector<HTMLElement>(
        "input, select, textarea",
      );
      (input ?? ref.current?.querySelector<HTMLElement>("button"))?.focus();
    }, 50);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const elements = ref.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex="0"]',
      );
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className={`modal-overlay ${drawer ? "drawer-overlay" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={`modal ${wide ? "modal-wide" : ""} ${drawer ? "drawer" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header className="modal-header">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

export function EmptyState({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-mark">
        <LayoutDashboard size={25} strokeWidth={1.4} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div className="toast" role="status">
      <span className="toast-check">
        <Check size={15} />
      </span>
      <span>{message}</span>
      <IconButton label="Dismiss notification" onClick={onClose}>
        <X size={15} />
      </IconButton>
    </div>
  );
}
