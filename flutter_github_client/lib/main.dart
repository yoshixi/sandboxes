import 'package:flutter/material.dart';
import 'github_oauth_credentials.dart';
import 'package:github/github.dart';
import 'src/github_login.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GitHub Client',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        visualDensity: VisualDensity.adaptivePlatformDensity,
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'GitHub Client'),
    );
  }
}

class MyHomePage extends StatelessWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return GithubLoginWidget(
      builder: (context, httpClient) {
        return FutureBuilder<CurrentUser>(
            // Modify from here
            future: viewerDetail(httpClient.credentials.accessToken),
            builder: (context, snapshot) {
              return Scaffold(
                appBar: AppBar(
                  title: Text(title),
                  elevation: 2,
                ),
                body: Center(
                  child: Text(
                    snapshot.hasData
                        ? 'Hello ${snapshot.data!.login}!'
                        : 'Retrieving viewer login details...',
                  ),
                ),
              );
            });
      },
      githubClientId: githubClientId,
      githubClientSecret: githubClientSecret,
      githubScopes: githubScopes,
    );
  }
}

Future<CurrentUser> viewerDetail(String accessToken) async {
  // Add from here
  final gitHub = GitHub(auth: Authentication.withToken(accessToken));
  return gitHub.users.getCurrentUser();
}
