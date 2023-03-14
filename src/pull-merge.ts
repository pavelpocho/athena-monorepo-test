import { Client } from "@notionhq/client";
import { Octokit } from 'octokit';
import dotenv from "dotenv";
import { exec } from "child_process";
import { BranchProperties, TaskProperties } from "./index";

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function getBranchPRToDevTasks(branchName: string) {
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
          equals: 'PR to Dev'
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

async function setTasksAsDev(taskPageIds: string[]) {
  const promises = taskPageIds.map((taskPageId) => {
    return notion.pages.update({
      page_id: taskPageId,
      properties: {
        Status: {
          status: {
            id: 'HkV>' // means 'Dev', see in index.ts
          }
        }
      }
    });
  });
  await Promise.all(promises);
}

async function main() {
  const mergedBranch = process.argv.slice(-1)[0];
  const tasks = await getBranchPRToDevTasks(mergedBranch);
  await setTasksAsDev(tasks.map(t => t.id));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
});