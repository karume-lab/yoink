import * as Slot from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Platform, Text as RNText } from "react-native";
import { cn } from "@/lib/utils";

const textVariants = cva(
	cn("text-foreground", Platform.select({ web: "select-text" })),
	{
		variants: {
			variant: {
				default: "font-body text-[13px] font-normal",
				display: "font-display text-[20px] font-medium",
				title: "font-display text-[15px] font-medium",
				body: "font-body text-[13px] font-normal",
				mono: "font-mono text-[12px] font-normal",
				caption: "font-body text-[11px] font-normal",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type TextVariantProps = VariantProps<typeof textVariants>;

const TextClassContext = React.createContext<string | undefined>(undefined);

const Text: React.FC<
	React.ComponentProps<typeof RNText> &
		TextVariantProps &
		React.RefAttributes<RNText> & {
			asChild?: boolean;
		}
> = ({ className, asChild = false, variant = "default", ...props }) => {
	const textClass = React.useContext(TextClassContext);
	const Component = asChild ? Slot.Text : RNText;
	return (
		<Component
			className={cn(textVariants({ variant }), textClass, className)}
			{...props}
		/>
	);
};

export { Text, TextClassContext };
