import type { TutorialIssue } from "../model/checks";

interface ChecksPanelProps {
  issues: TutorialIssue[];
  onSelectStep: (id: string) => void;
}

export function ChecksPanel({ issues, onSelectStep }: ChecksPanelProps) {
  return (
    <section className="checks">
      <div className="checks__head">
        <span className="checks__title">Checks</span>
        <span className="checks__count">{issues.length}</span>
      </div>

      {issues.length === 0 ? (
        <p className="checks__ok">No issues found.</p>
      ) : (
        <ul className="checks__list">
          {issues.map((issue) => {
            const content = (
              <>
                <span
                  className={
                    "checks__badge checks__badge--" + issue.severity
                  }
                >
                  {issue.severity === "warn" ? "Warning" : "Tip"}
                </span>
                <span className="checks__message">{issue.message}</span>
              </>
            );

            return (
              <li key={issue.id} className="checks__item">
                {issue.stepId ? (
                  <button
                    type="button"
                    className="checks__button"
                    onClick={() => onSelectStep(issue.stepId!)}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="checks__static">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
