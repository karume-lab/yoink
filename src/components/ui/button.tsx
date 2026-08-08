import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Platform, Pressable } from "react-native";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	cn(
		"group shrink-0 flex-row items-center justify-center gap-2 rounded-[10px]",
		Platform.select({
			web: "focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] disabled:pointer-events-none transition-all",
		}),
	),
	{
		variants: {
			variant: {
				default: "bg-primary active:bg-primary/90",
				secondary: "bg-secondary active:bg-secondary/80",
				ghost: "active:bg-accent/50",
			},
			size: {
				default: "h-12 px-4 py-2",
				sm: "h-9 px-3",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

const buttonTextVariants = cva(
	cn(
		"font-display font-medium text-[15px]",
		Platform.select({ web: "pointer-events-none transition-colors" }),
	),
	{
		variants: {
			variant: {
				default: "text-primary-foreground", // dark text on copper fill
				secondary: "text-secondary-foreground",
				ghost: "text-foreground",
			},
			size: {
				default: "",
				sm: "text-[13px]",
				icon: "",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
	React.RefAttributes<typeof Pressable> &
	VariantProps<typeof buttonVariants>;

const Button: React.FC<ButtonProps> = ({
	className,
	variant,
	size,
	...props
}) => {
	return (
		<TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
			<Pressable
				className={cn(
					props.disabled && "opacity-50",
					buttonVariants({ variant, size }),
					className,
				)}
				role="button"
				{...props}
			/>
		</TextClassContext.Provider>
	);
};

export { Button, buttonTextVariants, buttonVariants };
