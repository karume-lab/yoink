# Yoink

Yoink is a personal media downloader built with Expo and React Native. It allows you to download clean, watermark-free videos from TikTok and Instagram directly to your device's camera roll without relying on third-party backend APIs. 

**Note**: This is a personal utility app meant to be sideloaded via an Expo dev build or EAS. It is not intended for the App Store or Play Store.

## Features

- **TikTok Downloader**: Extracts clean MP4s from public TikTok links.
- **Instagram Downloader**: Supports public posts, reels, and private stories (via session cookie authentication).
- **On-Device Only**: Everything happens locally on your device. No backend servers, no recurring hosting costs.
- **Queue System**: Downloads are processed sequentially in the background.
- **Download History**: Keep track of your downloaded videos with a local SQLite database (powered by Drizzle ORM).
- **Customizable**: Optionally save videos to a specific photo album on your device.

## Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Package Manager**: [Bun](https://bun.sh/)
- **UI & Styling**: [TailwindCSS](https://tailwindcss.com/) via Uniwind, and [React Native Reusables](https://rnr-docs.vercel.app/) (RNR) components.
- **Database**: [Drizzle ORM](https://orm.drizzle.team/) with `expo-sqlite`
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with `react-native-mmkv` for persistent storage

## Getting Started

### Prerequisites

Ensure you have [Bun](https://bun.sh/) installed.

### Installation

1. Clone the repository and install dependencies:
   ```bash
   bun install
   ```

2. Generate the local database migrations:
   ```bash
   bun run db:generate
   ```

3. Start the Expo development server:
   ```bash
   bun run dev
   ```

### Running on Device

Since this app requires native modules (like `expo-file-system`, `expo-media-library`, and `expo-sqlite`), it is recommended to run it using a **Development Build** rather than Expo Go. 

- [Create a development build](https://docs.expo.dev/develop/development-builds/introduction/) for iOS or Android.
- Install the build on your physical device.

## Usage

1. **Extract**: Copy a link from TikTok or Instagram.
2. **Download**: Open Yoink, paste the link into the input field, and hit submit. The app will scrape the raw video URL and add it to the download queue.
3. **Instagram Stories**: To download Instagram stories, you must first navigate to the **Settings** tab and input your Instagram `sessionid` cookie.

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0). See the [LICENSE](LICENSE) file for more details.

## Legal Disclaimer

**Yoink** is designed solely for providing access to publicly available content. It is not intended to support or promote piracy or copyright infringement. As the creator of this app, I hereby declare that I am not responsible for, and in no way associated with, any external links or the content they direct to.

It is essential to understand that all the content available through this app are found freely accessible on the internet and the app does not host any copyrighted content. I do not exercise control over the nature, content, or availability of the websites linked within the app.

If you have any concerns or objections regarding the content provided by this app, please contact the respective website owners, webmasters, or hosting providers. Thank you.
