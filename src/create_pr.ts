// Test GH token: process.env.GH_TOKEN
import { Octokit } from 'octokit';
import dotenv from "dotenv";

dotenv.config();


const octokit = new Octokit({
  auth: process.env.GH_TOKEN
})

async function createPR() {
  const br = ((await listBranches()) as { data: { name: string }[] }).data.map(a => a.name);
  console.log(br);
}

async function listBranches() {
  return await octokit.request(`GET /repos/${process.env.GH_OWNER}/${process.env.GH_REPO}/branches`, {
    owner: process.env.GH_OWNER,
    repo: process.env.GH_REPO,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

createPR()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
});

// Run tests??
// Create PR using octokit
// Put in commit names from branch in Notion, which tasks have & haven't been completed, any custom user comment
// Update branch & task status in Notion - done tasks should be changed to "PR to dev", rest left be
// Keep in mind branch status is just a rollup of the status of its tasks since not all have to be completed for a PR
// GH Action tests & checks??
// Then it's a problem of release & GitHub actions for that...