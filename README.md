# Barcode Scanner - Expiry Date Tracker

A mobile app that helps users track product expiry dates by scanning barcodes. Built with React Native and Expo.

## Features

- 📷 Barcode scanning (QR codes, EAN-13, UPC-A)
- 📅 Calendar integration for expiry dates
- 🔔 Customizable notifications
- 📱 Cross-platform (iOS & Android)
- 🌐 Offline support
- 🔒 Secure data storage with Firebase

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)
- Firebase account

## Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/barcodescan.git
cd barcodescan
```

2. Install dependencies:

```bash
npm install
```

3. Create a Firebase project and enable:

   - Authentication
   - Firestore Database
   - Cloud Functions (optional)

4. Update Firebase configuration:

   - Copy your Firebase config to `firebaseConfig.ts`
   - Enable email/password authentication in Firebase Console

5. Start the development server:

```bash
npm start
```

6. Run on your device:
   - Scan the QR code with Expo Go app (iOS/Android)
   - Press 'i' for iOS simulator
   - Press 'a' for Android emulator

## Project Structure

```
/barcodescan
  /app
    /_layout.tsx      # Navigation setup
    /index.tsx        # Home screen
    /scan.tsx         # Barcode scanner
    /product.tsx      # Product details
    /calendar.tsx     # Calendar view
    /settings.tsx     # App settings
  /components         # Reusable components
  /services          # API and utility functions
  firebaseConfig.ts   # Firebase configuration
```

## Usage

1. **Scanning Products**

   - Tap the "Scan" button
   - Point camera at barcode
   - Enter product details if not found
   - Set expiry date
   - Add to calendar

2. **Calendar View**

   - View all expiry dates
   - Color-coded by urgency
   - Tap date to see products

3. **Settings**
   - Configure notifications
   - Set reminder preferences
   - Manage account

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Expo team for the amazing framework
- Firebase for backend services
- React Native community for components and libraries
