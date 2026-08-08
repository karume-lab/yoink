import { View } from "react-native";
import { Text } from "@/components/ui/text";

interface TapeProgressProps {
	progress: number; // 0 to 1
	segments?: number;
}

export function TapeProgress({ progress, segments = 20 }: TapeProgressProps) {
	const filledSegments = Math.round(progress * segments);

	return (
		<View className="flex-row items-center gap-3">
			<View className="flex-row gap-[2px] h-4">
				{Array.from({ length: segments }).map((_, i) => (
					<View
						key={i}
						className={`w-[4px] h-full ${
							i < filledSegments ? "bg-primary" : "bg-popover"
						}`}
					/>
				))}
			</View>
			<Text variant="mono" className="text-muted-foreground w-10">
				{Math.round(progress * 100)}%
			</Text>
		</View>
	);
}
