import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type FlatList,
  type GestureResponderEvent,
  PanResponder,
  type PanResponderGestureState,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TablerIcon } from "tabler-icons-react-native";
import {
  IconBell,
  IconCloudDownload,
  IconPhoto,
} from "tabler-icons-react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  PermissionSlide,
  type PermissionSlideType,
} from "@/features/onboarding/components/PermissionSlide";
import { WelcomeSlide } from "@/features/onboarding/components/WelcomeSlide";
import { PRIMARY } from "@/lib/colors";
import { configureNotifications } from "@/services/Notifications";
import { useOnboardingStore } from "@/stores/onboardingStore";

type SlideType = "welcome" | PermissionSlideType;

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  type: SlideType;
  icon: TablerIcon;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    title: "Welcome to Yoink",
    description: "",
    type: "welcome",
    icon: IconCloudDownload,
  },
  {
    id: "notifications",
    title: "Know the moment it lands.",
    description:
      "Yoink downloads in the background — even from a share, without opening the app. Notifications tell you when your video is saved.",
    type: "notifications",
    icon: IconBell,
  },
  {
    id: "gallery",
    title: "Save to your gallery.",
    description:
      "Downloads go into a Yoink album in your gallery, ready for your WhatsApp status or anywhere else.",
    type: "gallery",
    icon: IconPhoto,
  },
];

interface PaginatorDotProps {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}

const PaginatorDot: React.FC<PaginatorDotProps> = ({
  index,
  scrollX,
  width,
}) => {
  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [10, 24, 10],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );

    return {
      width: dotWidth,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[dotStyle, { backgroundColor: PRIMARY }]}
      className="h-2.5 rounded-full"
    />
  );
};

const OnboardingScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const permissionLockRef = useRef<number | null>(null);
  // A stable ref so the pan responder can call handleNext without it being a
  // dependency (handleNext is declared after the pan responder).
  const handleNextRef = useRef<() => void>(() => {});
  const [busy, setBusy] = useState(false);
  const [permissions, setPermissions] = useState<
    Record<PermissionSlideType, boolean>
  >({ notifications: false, gallery: false });
  const { completeOnboarding } = useOnboardingStore();

  // Pre-check permissions on mount so an already-granted permission is
  // reflected right away.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setPermissions((prev) => ({
          ...prev,
          notifications: status === "granted",
        }));
      } catch {
        // ignore
      }
      try {
        const permission = await MediaLibrary.getPermissionsAsync(false);
        setPermissions((prev) => ({ ...prev, gallery: permission.granted }));
      } catch {
        // ignore
      }
    })();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (permissionLockRef.current !== null) return;
      if (
        viewableItems[0] &&
        viewableItems[0].index !== null &&
        viewableItems[0].index !== undefined
      ) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  // Permission slides require an explicit grant before the user can advance.
  // The welcome slide is always ready (free scrolling).
  const isSlideReady = (slide: OnboardingSlide): boolean => {
    switch (slide.type) {
      case "notifications":
        return permissions.notifications;
      case "gallery":
        return permissions.gallery;
      default:
        return true;
    }
  };

  const currentSlideReady = isSlideReady(SLIDES[currentIndex]);

  // On permission slides the FlatList is locked. The pan responder intercepts
  // horizontal swipes so swiping forward triggers the same permission flow as
  // pressing Next. On all other slides the FlatList scrolls natively.
  const swipePanResponder = useMemo(
    () =>
      PanResponder.create({
        // Only claim the gesture when the slide is locked (permission slide)
        // and the move is clearly horizontal.
        onMoveShouldSetPanResponder: (
          _: GestureResponderEvent,
          gs: PanResponderGestureState,
        ) =>
          !currentSlideReady &&
          Math.abs(gs.dx) > 10 &&
          Math.abs(gs.dx) > Math.abs(gs.dy),
        onPanResponderRelease: (
          _: GestureResponderEvent,
          gs: PanResponderGestureState,
        ) => {
          if (gs.dx > 50 && currentIndex > 0) {
            // Rightward swipe → go back.
            flatListRef.current?.scrollToIndex({
              index: currentIndex - 1,
              animated: true,
            });
          } else if (gs.dx < -50) {
            // Leftward swipe on a locked slide → trigger the permission flow,
            // same as pressing Next.
            handleNextRef.current();
          }
        },
      }),
    [currentSlideReady, currentIndex],
  );

  const handleFinishOnboarding = async () => {
    completeOnboarding();
    router.replace("/(tabs)");
  };

  // The single onboarding CTA. On permission slides it requests the approval
  // and only advances once granted.
  const handleNext = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const slide = SLIDES[currentIndex];
      if (slide.type === "notifications") {
        permissionLockRef.current = currentIndex;
        const granted = await configureNotifications();
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: false,
        });
        permissionLockRef.current = null;
        setPermissions((prev) => ({ ...prev, notifications: granted }));
        if (!granted) return;
      } else if (slide.type === "gallery") {
        permissionLockRef.current = currentIndex;
        const permission = await MediaLibrary.requestPermissionsAsync(false);
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: false,
        });
        permissionLockRef.current = null;
        setPermissions((prev) => ({ ...prev, gallery: permission.granted }));
        if (!permission.granted) return;
      }

      if (currentIndex < SLIDES.length - 1) {
        flatListRef.current?.scrollToIndex({
          index: currentIndex + 1,
          animated: true,
        });
      } else {
        await handleFinishOnboarding();
      }
    } finally {
      setBusy(false);
    }
  };

  // Keep the ref in sync so the pan responder always calls the latest version.
  handleNextRef.current = handleNext;

  return (
    <View className="flex-1 bg-background" {...swipePanResponder.panHandlers}>
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={currentSlideReady}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => {
          if (item.type === "welcome") {
            return (
              <View style={{ width }} className="flex-1">
                <WelcomeSlide topInset={insets.top} />
              </View>
            );
          }
          const IconComponent = item.icon;
          return (
            <View
              style={{ width, paddingTop: insets.top + 24 }}
              className="flex-1 px-8"
            >
              <View className="mb-4 items-center">
                <View className="size-20 items-center justify-center rounded-md bg-white/10">
                  <IconComponent size={40} color={PRIMARY} />
                </View>
              </View>
              <Text
                variant="display"
                className="mb-2 text-center text-[24px] font-semibold leading-tight"
              >
                {item.title}
              </Text>
              <Text
                variant="body"
                className="mb-6 text-center leading-5 text-muted-foreground"
              >
                {item.description}
              </Text>
              <PermissionSlide
                type={item.type}
                granted={permissions[item.type]}
              />
            </View>
          );
        }}
      />

      {/* Bottom controls */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        className="w-full px-8"
      >
        <View className="h-16 flex-row items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <PaginatorDot
              key={i.toString()}
              index={i}
              scrollX={scrollX}
              width={width}
            />
          ))}
        </View>

        <Button
          className="h-14 w-full rounded-md"
          disabled={busy}
          onPress={handleNext}
        >
          <Text
            className="text-center text-lg font-bold text-primary-foreground"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {currentIndex === SLIDES.length - 1 ? "Start yoinking" : "Next"}
          </Text>
        </Button>
      </View>
    </View>
  );
};

export default OnboardingScreen;
