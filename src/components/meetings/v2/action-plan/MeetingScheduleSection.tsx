import { useMeetingActionPlan } from "@/hooks/useMeetingActionPlan";
import { ActionPlanCalendar } from "./ActionPlanCalendar";
import { Loader2 } from "lucide-react";
import { parseLocalDate } from "@/lib/dateUtils";

interface MeetingScheduleSectionProps {
  meetingId: string | undefined;
  clientId: string | undefined;
  meetingDate?: string | null;
  readOnly?: boolean;
}

export function MeetingScheduleSection({ meetingId, clientId, meetingDate, readOnly }: MeetingScheduleSectionProps) {
  const { items, loading, refresh } = useMeetingActionPlan(meetingId, clientId, { readOnly });

  let initialMonth: Date | undefined;
  if (meetingDate) {
    try {
      const d = parseLocalDate(meetingDate.split("T")[0]);
      if (!isNaN(d.getTime())) initialMonth = d;
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ActionPlanCalendar
      tasks={items}
      initialMonth={initialMonth}
      readOnly={readOnly}
      onTasksChanged={refresh}
    />
  );
}