import type React from "react";
import type { TablerIcon, TablerIconsProps } from "tabler-icons-react-native";
import { withUniwind } from "uniwind";
import { cn } from "@/lib/utils";

type IconProps = TablerIconsProps & {
	as: TablerIcon;
	className?: string;
};

const IconImpl: React.FC<IconProps> = ({ as: IconComponent, ...props }) => {
	return <IconComponent {...props} />;
};

const StyledIcon = withUniwind(IconImpl, {
	size: {
		fromClassName: "className",
		styleProperty: "width",
	},
	color: {
		fromClassName: "className",
		styleProperty: "color",
	},
});

export const Icon: React.FC<IconProps> = ({
	as: IconComponent,
	className,
	...props
}) => {
	return (
		<StyledIcon
			as={IconComponent}
			className={cn("text-foreground size-4", className)}
			{...props}
		/>
	);
};
