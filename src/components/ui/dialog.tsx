import * as DialogPrimitive from "@rn-primitives/dialog";
import * as React from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { IconX } from "tabler-icons-react-native";
import { Icon } from "@/components/ui/icon";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("absolute inset-0 z-50 bg-black/80", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showOverlay?: boolean;
  }
>(({ className, children, showOverlay = true, ...props }, ref) => {
  return (
    <DialogPortal>
      {showOverlay && <DialogOverlay />}
      <DialogPrimitive.Content
        ref={ref}
        pointerEvents="box-none"
        className={cn(
          "absolute inset-0 z-50 flex items-center justify-center p-4",
          className,
        )}
        {...props}
      >
        <Animated.View
          entering={FadeIn.duration(150).delay(50)}
          exiting={FadeOut.duration(100)}
          className="w-full max-w-[420px] rounded-xl border border-border bg-card p-6 shadow-xl shadow-black/40"
        >
          <TextClassContext.Provider value="text-card-foreground">
            {children}
          </TextClassContext.Provider>
          <DialogPrimitive.Close
            className="absolute right-3 top-3 rounded-sm p-1 opacity-70 active:opacity-100"
            aria-label="Close"
          >
            <Icon as={IconX} className="text-muted-foreground size-5" />
          </DialogPrimitive.Close>
        </Animated.View>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader: React.FC<React.ComponentPropsWithoutRef<typeof View>> = ({
  className,
  ...props
}) => (
  <View className={cn("flex flex-col gap-1.5", className)} {...props} />
);

const DialogFooter: React.FC<React.ComponentPropsWithoutRef<typeof View>> = ({
  className,
  ...props
}) => (
  <View className={cn("mt-5 flex flex-row justify-end gap-2", className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "font-display text-[15px] font-medium text-card-foreground",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "font-body text-[13px] text-muted-foreground",
      className,
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
