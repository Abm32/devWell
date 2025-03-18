import { Octokit } from '@octokit/rest';
import { getGitHubToken } from './supabase';
import { Commit, GitHubUser } from '../types/github';

class GitHubService {
  private octokit: Octokit | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    const token = await getGitHubToken();
    if (!token) {
      throw new Error('No GitHub token available');
    }
    
    this.octokit = new Octokit({ auth: token });
    this.initialized = true;
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }
    return this.octokit;
  }

  async getCommits(since: Date): Promise<Commit[]> {
    const octokit = await this.ensureInitialized();

    try {
      const { data } = await octokit.activity.listEventsForAuthenticatedUser({
        username: 'me',
        per_page: 100,
        since: since.toISOString(),
      });

      return data.filter((event): event is Commit => 
        event.type === 'PushEvent' && 
        'commits' in (event.payload as any)
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch commits: ${error.message}`);
      }
      throw new Error('Failed to fetch commits');
    }
  }

  async getUserProfile(): Promise<GitHubUser> {
    const octokit = await this.ensureInitialized();

    try {
      const { data } = await octokit.users.getAuthenticated();
      return data as GitHubUser;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch user profile: ${error.message}`);
      }
      throw new Error('Failed to fetch user profile');
    }
  }

  async refreshToken(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }
}

export const githubService = new GitHubService();