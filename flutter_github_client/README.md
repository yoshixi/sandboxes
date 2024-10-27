# flutter_github_client

A new Flutter project for my practice. 

https://codelabs.developers.google.com/codelabs/flutter-github-client

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## How to run code
To run this Flutter GitHub client application, follow these steps:

1. Set up your GitHub OAuth App:
   - Go to GitHub Developer Settings
   - Create a new OAuth App
   - Set the Authorization callback URL to `http://localhost`
   - Note down the Client ID and Client Secret

2. Set environment variables:
   ```
   export GITHUB_CLIENT_ID=your_client_id
   export GITHUB_CLIENT_SECRET=your_client_secret
   ```

3. Run the Flutter app:
   ```
   flutter run --dart-define=GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID --dart-define=GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
   ```

Note: Make sure you have Flutter installed and set up on your system before running the app.
