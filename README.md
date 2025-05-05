# Food Expiry Tracker

![Food Expiry Tracker](./assets/logo.png)

A sophisticated and user-friendly mobile application designed to help you track and manage the expiry dates of your food items. This app combines advanced functionality with an elegant, minimalist UI to provide the best user experience.

## Why Food Expiry Tracker?

- **Reduce Food Waste**: Get timely notifications before your food expires
- **Smart Organization**: Categorize and track all food items in your pantry, fridge, and freezer
- **Convenient Scanning**: Easily add items by scanning product barcodes or entire grocery receipts
- **Calendar Integration**: View expiry dates in a calendar view for easy planning
- **Beautiful Interface**: Clean, minimalist design focused on usability

## Features

### Core Features

- **Product Barcode Scanning**: Quickly add items by scanning product barcodes
- **Receipt Scanning**: Scan your grocery receipts to add multiple items at once
- **Expiry Date Predictions**: Intelligent prediction of expiry dates based on food category
- **Calendar View**: See all your expiry dates organized in a calendar
- **Notification System**: Customizable notifications for upcoming expiry dates
- **Category Organization**: Organize items by food category for easy management
- **Smart Search & Filtering**: Quickly find items with search and category filters

### Advanced Features

- **Data Management**: Export, import, and backup your food inventory data
- **Customization Options**: Tailor the app to your preferences with theme options
- **Analytics**: Track your food waste and consumption patterns
- **Haptic Feedback**: Subtle vibrations enhance the user experience
- **Multi-device Sync**: Keep your data consistent across all your devices

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Firebase account (for backend)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/food-expiry-tracker.git
   cd food-expiry-tracker
   ```

2. Install dependencies:
   ```
   npm install
   # or if you use yarn
   yarn install
   ```

3. Set up your Firebase configuration:
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Add your Firebase config to `firebaseConfig.ts`

4. Start the development server:
   ```
   npm start
   # or
   yarn start
   ```

5. Follow the instructions in the terminal to open the app on your device or emulator.

## Technology Stack

- **Frontend**: React Native with Expo
- **UI Framework**: React Native Paper
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **State Management**: React Context API and Hooks
- **Notifications**: Expo Notifications
- **Camera & Barcode Scanning**: Expo Camera
- **Calendar Integration**: Expo Calendar

## Project Structure

```
/assets             # Images, icons, and other static assets
/app                # Main application code
  /index.tsx        # Home screen
  /scan.tsx         # Barcode scanning screen
  /receipt-scan.tsx # Receipt scanning screen
  /product.tsx      # Product detail/edit screen
  /calendar.tsx     # Calendar view screen
  /settings.tsx     # Settings screen
  /_layout.tsx      # Main layout and navigation
/components         # Reusable React components
/hooks              # Custom React hooks
/utils              # Utility functions
/services           # Service layer for external APIs
firebaseConfig.ts   # Firebase configuration
```

## Contributing

We welcome contributions to improve Food Expiry Tracker! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all the open-source libraries that made this project possible
- Inspired by the need to reduce food waste and better manage household food inventory
- Special thanks to our beta testers for their valuable feedback

---

Made with ❤️ by Eddie, Lucas, Darren, Harris
