// Test GH token: process.env.GH_TOKEN
import { Client } from "@notionhq/client";
import { Octokit } from 'octokit';
import dotenv from "dotenv";
import { exec } from "child_process";
import { BranchProperties, TaskProperties } from "./index";

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const octokit = new Octokit({
  auth: process.env.GH_TOKEN
})

async function main() {
  const br = ((await listBranches()) as { data: { name: string }[] }).data.map(a => a.name);
  const c_br = (await getCurrentBranch()).replace(/(\r\n|\n|\r)/gm, "");;
  console.log(c_br);
  console.log(br);
  if (!br.includes(c_br)) {
    console.error('Current branch has not yet been pushed to remote.');
    return;
  }
  const tasks = await getBranchDoneTasks(c_br);
  await setTasksAsPRToDev(tasks.map(t => t.id));
  await createPR(tasks.map(t => t.name), c_br);
}

async function setTasksAsPRToDev(taskPageIds: string[]) {
  const promises = taskPageIds.map((taskPageId) => {
    return notion.pages.update({
      page_id: taskPageId,
      properties: {
        Status: {
          status: {
            id: 'SH?W' // means 'PR on Dev', see in index.ts
          }
        }
      }
    });
  });
  await Promise.all(promises);
}

async function getBranchDoneTasks(branchName: string) {
  const response = await notion.databases.query({
    database_id: process.env.BRANCHES_DB_ID ?? '',
    filter: {
      property: 'Name',
      title: {
        equals: branchName
      }
    }
  });
  const res = response.results.map(a => ({
    id: a.id,
    // @ts-ignore
    properties: a.properties,

  })) as BranchProperties[];
  if (res.length == 0 || res.length > 1) {
    throw('No branch or more than one branch!');
  }
  const branchId = res[0].id;
  const taskResponse = await notion.databases.query({
    database_id: process.env.TASKS_DB_ID ?? '',
    filter: {
      and: [{
        property: 'Branch',
        relation: {
          contains: branchId
        }
      }, {
        property: 'Status',
        status: {
          equals: 'Done'
        }
      }]
    }
  });
  const taskRes = taskResponse.results.map(a => ({
    id: a.id,
    // @ts-ignore
    properties: a.properties,

  })) as TaskProperties[];
  return taskRes.map(a => ({
    id: a.id,
    name: a.properties.Name.title[0].plain_text
  }));
}

async function createPR(taskTitles: string[], branch: string) {
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
    body: res.body + `\nTasks completed: ${taskTitles.join(', ')}`,
    head: branch,
    base: 'dev',
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