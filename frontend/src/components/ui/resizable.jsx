import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  direction,
  ...props
}) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      direction={direction}
      className={cn(
        "flex h-full w-full",
        direction === "vertical" ? "flex-col" : "flex-row",
        className
      )}
      {...props} />
  );
}

function ResizablePanel({
  ...props
}) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex items-center justify-center",
        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden",
        className
      )}
      {...props}>
      {withHandle && (
        <div className="z-10 flex h-6 w-3 items-center justify-center rounded-sm border border-white/10 bg-white/5">
          <GripVerticalIcon className="size-2.5 text-[#71717a]" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
