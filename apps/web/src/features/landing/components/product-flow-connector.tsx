import { cn } from "@/lib/utils";

type ProductFlowConnectorProps = {
  className?: string;
  direction?: "down" | "split";
};

export function ProductFlowConnector({ className, direction = "down" }: ProductFlowConnectorProps) {
  if (direction === "split") {
    return (
      <div className={cn("relative mx-auto h-16 w-full max-w-2xl", className)} aria-hidden="true">
        <div className="landing-proof-flow absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/12" />
        <div className="landing-proof-flow absolute left-1/2 top-1/2 h-px w-[38%] -translate-x-full bg-white/12" />
        <div className="landing-proof-flow absolute left-1/2 top-1/2 h-px w-[38%] bg-white/12" />
        <div className="landing-proof-node absolute left-1/2 top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border border-primary/25 bg-[#08100e] font-mono text-[10px] text-primary shadow-[0_0_28px_rgba(69,211,154,0.16)]">
          C
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative mx-auto h-12 w-px bg-white/12", className)} aria-hidden="true">
      <div className="landing-proof-flow absolute inset-0" />
    </div>
  );
}
