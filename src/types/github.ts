export interface Commit {
  id: string;
  type: string | null;
  created_at: string | null;
  repo: {
    id: number;
    name: string;
    url: string;
  };
  actor: {
    id: number;
    login: string;
    display_login?: string;
    gravatar_id: string | null;
    url: string;
    avatar_url: string;
  };
  payload: {
    action?: string;
    commits?: Array<{
      message: string;
      sha: string;
    }>;
  };
  public: boolean;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
} 