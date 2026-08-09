import { TaskCard } from "./task-card";
import type { AdaptivePhase, AdaptiveTask, AdaptiveTaskStatus } from "@/types";

export function PhaseSection({
  phase,
  allTasks,
  onStatusChange,
}: {
  phase: AdaptivePhase;
  allTasks: AdaptiveTask[];
  onStatusChange: (taskId: string, status: AdaptiveTaskStatus) => Promise<void>;
}) {
  if (phase.tasks.length === 0) return null;
  const completedCount = phase.tasks.filter((t) => t.status === "completed").length;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">{phase.title}</h2>
        <p className="text-xs text-muted-foreground">
          {completedCount}/{phase.tasks.length} complete
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {phase.tasks.map((task) => (
          <TaskCard key={task.id} task={task} allTasks={allTasks} onStatusChange={onStatusChange} />
        ))}
      </div>
    </section>
  );
}
