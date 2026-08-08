import { TextInput, TouchableOpacity } from "react-native";
import { IconClipboard } from "tabler-icons-react-native";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PRIMARY } from "@/lib/colors";

interface LinkInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onPaste?: () => void;
  onSubmit?: () => void;
  isLoading?: boolean;
}

export function LinkInput({
  value,
  onChangeText,
  onPaste,
  onSubmit,
  isLoading,
}: LinkInputProps) {
  return (
    <Card className="flex-row items-center px-3 py-3 shadow-none gap-0">
      <Text variant="mono" className="text-primary mr-2">
        {">"}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="paste a link"
        placeholderTextColor="#8F8F96"
        onSubmitEditing={onSubmit}
        autoCapitalize="none"
        autoCorrect={false}
        className="flex-1 font-mono text-[12px] text-foreground outline-none"
        editable={!isLoading}
      />

      {onPaste && !value && (
        <TouchableOpacity
          onPress={onPaste}
          className="ml-2 p-1"
          activeOpacity={0.7}
        >
          <Icon as={IconClipboard} color={PRIMARY} size={16} />
        </TouchableOpacity>
      )}
    </Card>
  );
}
