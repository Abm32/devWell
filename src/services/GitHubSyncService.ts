import { githubService } from '../lib/github';
import { CommitService } from './CommitService';
import { subDays } from 'date-fns';

const commitService = new CommitService();

export class GitHubSyncService {
  async syncCommits(userId: string) {
    try {
      console.log('Starting GitHub commit sync for user:', userId);
      const endDate = new Date();
      const startDate = subDays(endDate, 30); // Sync last 30 days of commits

      console.log('Fetching commits from GitHub...');
      const commits = await githubService.getCommits(startDate);
      console.log('Fetched commits:', commits);
      
      // Process each commit
      for (const commit of commits) {
        if (commit.payload.commits) {
          console.log('Processing commits for repository:', commit.repo.name);
          for (const commitData of commit.payload.commits) {
            console.log('Adding commit:', commitData.sha);
            await commitService.addCommitRecord({
              user_id: userId,
              commit_timestamp: commit.created_at || new Date().toISOString(),
              repository: commit.repo.name,
              commit_message: commitData.message,
              commit_hash: commitData.sha
            });
          }
        }
      }

      console.log('GitHub commit sync completed successfully');
      return true;
    } catch (error) {
      console.error('Error syncing GitHub commits:', error);
      return false;
    }
  }
}

export const gitHubSyncService = new GitHubSyncService(); 