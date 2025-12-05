# Flutter WebView Integration Guide

This guide explains how to open this Next.js math game platform from a Flutter app using WebView with query parameters.

## Overview

The app accepts a `user_id` query parameter to identify users coming from the main platform (ustoz.ai). When opened from Flutter, pass the user's UUID to track their progress.

## URL Format

```
https://your-deployment-url.vercel.app?user_id=USER_UUID_HERE
```

Or for specific game categories:
```
https://your-deployment-url.vercel.app/math-puzzle?user_id=USER_UUID_HERE
https://your-deployment-url.vercel.app/memory-puzzle?user_id=USER_UUID_HERE
https://your-deployment-url.vercel.app/train-your-brain?user_id=USER_UUID_HERE
```

## Flutter Implementation

### 1. Add Dependencies

Add to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  webview_flutter: ^4.4.2
  # Or use flutter_inappwebview for more features
  # flutter_inappwebview: ^6.0.0
```

### 2. Basic WebView Implementation

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class MathGameWebView extends StatefulWidget {
  final String userId;
  final String? initialRoute; // optional: 'math-puzzle', 'memory-puzzle', etc.

  const MathGameWebView({
    Key? key,
    required this.userId,
    this.initialRoute,
  }) : super(key: key);

  @override
  State<MathGameWebView> createState() => _MathGameWebViewState();
}

class _MathGameWebViewState extends State<MathGameWebView> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();

    // Build URL with user_id parameter
    final baseUrl = 'https://your-deployment-url.vercel.app';
    final route = widget.initialRoute ?? '';
    final url = '$baseUrl/$route?user_id=${widget.userId}';

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            // Update loading bar
          },
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            print('WebView error: ${error.description}');
          },
        ),
      )
      ..loadRequest(Uri.parse(url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Math Games'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
```

### 3. Advanced Implementation with InAppWebView

For better control and features:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class MathGameWebView extends StatefulWidget {
  final String userId;
  final String? initialRoute;

  const MathGameWebView({
    Key? key,
    required this.userId,
    this.initialRoute,
  }) : super(key: key);

  @override
  State<MathGameWebView> createState() => _MathGameWebViewState();
}

class _MathGameWebViewState extends State<MathGameWebView> {
  final GlobalKey webViewKey = GlobalKey();
  InAppWebViewController? webViewController;
  double _progress = 0;

  @override
  Widget build(BuildContext context) {
    final baseUrl = 'https://your-deployment-url.vercel.app';
    final route = widget.initialRoute ?? '';
    final url = '$baseUrl/$route?user_id=${widget.userId}';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Math Games'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Column(
        children: [
          _progress < 1.0
              ? LinearProgressIndicator(value: _progress)
              : const SizedBox.shrink(),
          Expanded(
            child: InAppWebView(
              key: webViewKey,
              initialUrlRequest: URLRequest(url: WebUri(url)),
              initialSettings: InAppWebViewSettings(
                javaScriptEnabled: true,
                domStorageEnabled: true,
                databaseEnabled: true,
                useHybridComposition: true, // Better performance on Android
                allowsInlineMediaPlayback: true,
                mediaPlaybackRequiresUserGesture: false,
              ),
              onWebViewCreated: (controller) {
                webViewController = controller;
              },
              onLoadStart: (controller, url) {
                setState(() {
                  _progress = 0;
                });
              },
              onProgressChanged: (controller, progress) {
                setState(() {
                  _progress = progress / 100;
                });
              },
              onLoadStop: (controller, url) async {
                setState(() {
                  _progress = 1.0;
                });
              },
              onConsoleMessage: (controller, consoleMessage) {
                print('Console: ${consoleMessage.message}');
              },
            ),
          ),
        ],
      ),
    );
  }
}
```

### 4. Usage Example

```dart
// Navigate to math games with user_id
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => MathGameWebView(
      userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      initialRoute: 'math-puzzle', // optional
    ),
  ),
);

// Or open homepage
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => MathGameWebView(
      userId: currentUser.id,
    ),
  ),
);
```

### 5. Full-Screen Implementation

For a more immersive experience:

```dart
class MathGameFullScreen extends StatelessWidget {
  final String userId;

  const MathGameFullScreen({Key? key, required this.userId}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: MathGameWebView(
            userId: userId,
          ),
        ),
      ),
    );
  }
}
```

## Query Parameters Supported

The app currently supports:

- `user_id` (required) - UUID of the user
  - Example: `?user_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### How It Works

1. **First Load**: App checks for `user_id` in URL query params
2. **Storage**: If found, stores it in localStorage for future visits
3. **Session**: Creates/updates user session in Supabase database
4. **Scores**: All game scores are saved against this user_id
5. **Persistence**: Even if user closes and reopens, their data persists

## Testing

### Development Testing (localhost)

```dart
// For local testing, use your local IP address
final url = 'http://192.168.1.100:3000?user_id=${widget.userId}';
```

Make sure your Next.js dev server is running on `0.0.0.0`:
```bash
# In package.json, update dev script:
"dev": "next dev -H 0.0.0.0"
```

### Production Testing

```dart
final url = 'https://your-app.vercel.app?user_id=${widget.userId}';
```

## Important Notes

1. **User ID Format**: Must be a valid UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
2. **LocalStorage**: The app stores user_id in browser localStorage, so it persists across sessions
3. **Guest Mode**: If no user_id is provided, app auto-generates a guest UUID
4. **JavaScript Required**: Make sure JavaScript is enabled in WebView
5. **DOM Storage**: Enable DOM storage for localStorage to work
6. **Sound Effects**: Games use Web Audio API - ensure media playback is allowed

## Troubleshooting

### User ID not being recognized

- Check that UUID format is valid
- Verify URL encoding if user_id contains special characters
- Check browser console in WebView for errors

### Games not loading

- Enable JavaScript in WebView settings
- Enable DOM storage for localStorage
- Check network connectivity

### Scores not saving

- Verify Supabase environment variables are set
- Check if user_id is valid UUID format
- Look for errors in browser console

## Example: Complete Flutter Integration

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class MathGamesScreen extends StatelessWidget {
  final String userId;

  const MathGamesScreen({Key? key, required this.userId}) : super(key: key);

  void _openMathGames(BuildContext context, {String? category}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MathGameWebView(
          userId: userId,
          initialRoute: category,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choose Category')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListTile(
            leading: const Icon(Icons.calculate),
            title: const Text('Math Puzzles'),
            subtitle: const Text('4 arithmetic games'),
            onTap: () => _openMathGames(context, category: 'math-puzzle'),
          ),
          ListTile(
            leading: const Icon(Icons.memory),
            title: const Text('Memory Games'),
            subtitle: const Text('4 memory challenges'),
            onTap: () => _openMathGames(context, category: 'memory-puzzle'),
          ),
          ListTile(
            leading: const Icon(Icons.psychology),
            title: const Text('Brain Training'),
            subtitle: const Text('3 logic puzzles'),
            onTap: () => _openMathGames(context, category: 'train-your-brain'),
          ),
          ListTile(
            leading: const Icon(Icons.home),
            title: const Text('All Games'),
            subtitle: const Text('Open homepage'),
            onTap: () => _openMathGames(context),
          ),
        ],
      ),
    );
  }
}
```

## Security Considerations

- Always validate user_id format before passing to WebView
- Use HTTPS in production
- Consider implementing a token-based authentication for enhanced security
- The current implementation allows guest users - secure accordingly
