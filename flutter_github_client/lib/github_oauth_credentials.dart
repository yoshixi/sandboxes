// TODO(CodelabUser): Create an OAuth App
const githubClientId = String.fromEnvironment("GITHUB_CLIENT_ID");
const githubClientSecret = String.fromEnvironment("GITHUB_CLIENT_SECRET");

// OAuth scopes for repository and user information
const githubScopes = ['repo', 'read:org'];
