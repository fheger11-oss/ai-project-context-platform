import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuthSessionStore } from "@/features/auth/stores/auth-session-store";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import { cn } from "@/lib/utils";

type FeedbackNavItemProps = {
  collapsed: boolean;
  onOpen?: () => void;
};

export function FeedbackNavItem({ collapsed, onOpen }: FeedbackNavItemProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const accessToken = useAuthSessionStore((state) => state.accessToken);

  function handleOpen() {
    onOpen?.();
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="utility"
        title={collapsed ? "Feedback" : undefined}
        aria-label={collapsed ? "Feedback" : undefined}
        className={cn(
          "h-9 w-full justify-start gap-3 px-2 text-sm font-normal",
          collapsed && "md:justify-center"
        )}
        onClick={handleOpen}
      >
        <MessageSquare className="size-4 shrink-0" />
        <span className={cn("min-w-0 flex-1 truncate text-left", collapsed && "md:hidden")}>
          Feedback
        </span>
      </Button>
      <FeedbackDialog
        accessToken={accessToken}
        open={open}
        page={location.pathname}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
