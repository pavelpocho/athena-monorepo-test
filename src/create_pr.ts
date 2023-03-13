// Test GH token: process.env.GH_TOKEN
import { Octokit } from 'octokit';
import dotenv from "dotenv";
import { exec } from "child_process";

dotenv.config();


const octokit = new Octokit({
  auth: process.env.GH_TOKEN
})

async function main() {
  const br = ((await listBranches()) as { data: { name: string }[] }).data.map(a => a.name);
  const c_br = await getCurrentBranch();
  if (!br.includes(c_br)) {
    console.error('Current branch has not yet been pushed to remote.');
    return;
  }
}

async function createPR() {
  const questions = [
    {
      type: 'input',
      name: 'title',
      message: "Please provide the PR title",
    },
    {
      type: 'input',
      name: 'body',
      message: "Please provide the PR body",
    },
  ]

  const inquirer = await import("inquirer");
  const res = await inquirer.default.prompt(questions) as { title: string, body: string };
  console.log(res);
  await octokit.request(`POST /repos/${process.env.GH_OWNER}/${process.env.GH_REPO}/pulls`, {
    owner: process.env.GH_OWNER,
    repo: process.env.GH_REPO,
    title: res.title,
    body: res.body,
    head: 'octocat:new-feature',
    base: 'master',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

async function getCurrentBranch() {
  return new Promise<string>((resolve, reject) => {
    exec('git branch --show-current', (error, stdout) => {
      if (error) {
        console.warn(error);
        reject(error);
      }
      resolve(stdout)
    })
  });
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

main()
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